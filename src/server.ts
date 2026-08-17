import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { stream } from "hono/streaming";
import fs from "node:fs";
import path from "node:path";
import { createTeachingAid } from "./agent.ts";
import { listGallery, publishCreatedAid, resolveSampleFile } from "./gallery.ts";
import { loadSkills } from "./skills-loader.ts";

const ROOT = path.resolve(import.meta.dirname, "..");
const indexPath = path.join(ROOT, "public", "index.html");

const app = new Hono();

// 每次读盘：改 public/index.html 无需重启服务
app.get("/", (c) => {
  c.header("Cache-Control", "no-store");
  return c.html(fs.readFileSync(indexPath, "utf8"));
});
app.get("/health", (c) => c.json({ ok: true }));
app.get("/skills", (c) => { c.header("Cache-Control", "no-store"); return c.json(loadSkills()); });

// 样例库：精品 + 每次创作落盘，清单补 bytes
app.get("/samples", (c) => {
  c.header("Cache-Control", "no-store");
  const enriched = listGallery().map((s) => {
    const file = resolveSampleFile(`${s.slug}.html`);
    let bytes = 0;
    let ok = s.ok !== false;
    if (file) bytes = fs.statSync(file).size;
    else ok = false;
    return { ...s, bytes, ok, file: `${s.slug}.html` };
  });
  return c.json(enriched);
});
app.get("/samples/versions/:slug/:ver", (c) => {
  const slug = c.req.param("slug");
  const ver = c.req.param("ver").replace(/\.html$/i, "");
  if (!/^[a-z0-9-]+$/i.test(slug) || !/^v\d+$/i.test(ver)) return c.text("bad request", 400);
  const p = path.join(ROOT, "samples", "versions", slug, `${ver}.html`);
  if (!fs.existsSync(p)) return c.text("not found", 404);
  c.header("Cache-Control", "no-store");
  return c.html(fs.readFileSync(p, "utf8"));
});
app.get("/samples/:file", (c) => {
  const file = c.req.param("file");
  const p = resolveSampleFile(file);
  if (!p) return c.text("not found", 404);
  c.header("Cache-Control", "no-store");
  return c.html(fs.readFileSync(p, "utf8"));
});

// 图解增强复跑预览（public/diagram-preview/）
app.get("/diagram-preview", (c) => {
  const p = path.join(ROOT, "public", "diagram-preview", "index.html");
  c.header("Cache-Control", "no-store");
  if (!fs.existsSync(p)) return c.text("not found", 404);
  return c.html(fs.readFileSync(p, "utf8"));
});
app.get("/diagram-preview/:file", (c) => {
  const file = c.req.param("file");
  if (!/^[\w.-]+\.html$/.test(file)) return c.text("bad request", 400);
  const p = path.join(ROOT, "public", "diagram-preview", file);
  if (!fs.existsSync(p)) return c.text("not found", 404);
  c.header("Cache-Control", "no-store");
  return c.html(fs.readFileSync(p, "utf8"));
});

function createPayload(res: Awaited<ReturnType<typeof createTeachingAid>>, topic: string) {
  if (!res.ok) {
    return {
      ok: false,
      type: res.type,
      model: res.model,
      error: res.error,
      toolCalls: res.toolCalls,
    };
  }
  let gallerySlug = res.fromSample ? res.sampleSlug : undefined;
  if (!res.fromSample && res.html) {
    const aud = res.report?.audience as
      | { ageLabel?: string; ageBand?: string; scenes?: string[] }
      | undefined;
    const item = publishCreatedAid({
      html: res.html,
      topic,
      type: res.type,
      audience: aud,
    });
    gallerySlug = item.slug;
  }
  return {
    ok: true,
    type: res.type,
    model: res.model,
    out: res.out,
    bytes: res.report?.bytes,
    contract_ok: true,
    toolCalls: res.toolCalls,
    html: res.html,
    fromSample: res.fromSample === true,
    sampleSlug: res.sampleSlug,
    gallerySlug,
    galleryUrl: gallerySlug ? `/samples/${gallerySlug}.html` : undefined,
    audience: res.report?.audience,
    quality: res.report?.quality,
    note: res.report?.note,
    report: res.report,
  };
}

app.post("/create", async (c) => {
  let body: { topic?: string; module?: string; skillId?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ ok: false, error: "invalid json body" }, 400);
  }
  const text = (body as { text?: string; topic?: string }).text || body.topic;
  const { module, skillId } = body;
  if (!text || !String(text).trim()) {
    return c.json({ ok: false, error: "请输入一句话（text）" }, 400);
  }
  const accept = c.req.header("accept") || "";
  const wantStream =
    accept.includes("application/x-ndjson") ||
    accept.includes("text/event-stream") ||
    c.req.query("stream") === "1";

  if (!wantStream) {
    const res = await createTeachingAid(String(text).trim(), module, skillId);
    const payload = createPayload(res, String(text).trim());
    return c.json(payload, res.ok ? 200 : 500);
  }

  c.header("Content-Type", "application/x-ndjson; charset=utf-8");
  c.header("Cache-Control", "no-store");
  return stream(c, async (out) => {
    let queue = Promise.resolve();
    const writeLine = (obj: unknown) => {
      queue = queue.then(() => out.write(JSON.stringify(obj) + "\n"));
      return queue;
    };
    const res = await createTeachingAid(String(text).trim(), module, skillId, (ev) => {
      void writeLine(ev);
    });
    await queue;
    await writeLine({ type: "done", result: createPayload(res, String(text).trim()) });
  });
});

const port = Number(process.env.PORT) || 3001;
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`courseware server listening on http://localhost:${info.port}`);
});
