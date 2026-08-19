import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { Type } from "typebox";
import { defineTool } from "@earendil-works/pi-coding-agent";
import {
  createIconSearchTool,
  createIconSvgTool,
  persistCastSvg,
} from "./icon-cast.ts";

export type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export type CastLaneOpts = {
  root?: string;
  persistDir?: string;
  fetch?: FetchLike;
};

function toolError(error: string, extra: Record<string, unknown> = {}) {
  const payload = { ok: false, error, ...extra };
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
    details: payload,
    isError: true,
  };
}

function toolOk(payload: Record<string, unknown>) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
    details: payload,
  };
}

function loadLocalEnv(root?: string) {
  const file = path.join(root || process.cwd(), ".env");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}

const SVG: Record<string, string> = {
  cow: `<svg viewBox="0 0 64 48" xmlns="http://www.w3.org/2000/svg"><ellipse cx="30" cy="30" rx="20" ry="12" fill="#c48a3a"/><circle cx="48" cy="22" r="9" fill="#c48a3a"/><path d="M42 14 L38 6 M54 14 L58 6" stroke="#f3e0b0" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="51" cy="20" r="1.6" fill="#1e3a5f"/><rect x="16" y="38" width="4" height="8" fill="#8a6230"/><rect x="26" y="38" width="4" height="8" fill="#8a6230"/><rect x="34" y="38" width="4" height="8" fill="#8a6230"/><rect x="40" y="38" width="4" height="8" fill="#8a6230"/></svg>`,
  bird: `<svg viewBox="0 0 48 40" xmlns="http://www.w3.org/2000/svg"><ellipse cx="22" cy="22" rx="12" ry="7" fill="#2c3a52"/><circle cx="34" cy="16" r="6" fill="#eef2f7"/><circle cx="36" cy="15" r="1.3" fill="#111"/><path d="M34 16 L42 14 L34 19Z" fill="#e0a832"/><path d="M14 18 Q4 8 12 6 Q16 14 16 18Z" fill="#3b82f6"/><path d="M12 24 Q2 28 8 34 Q16 28 16 24Z" fill="#1b2437"/></svg>`,
  bean: `<svg viewBox="0 0 40 56" xmlns="http://www.w3.org/2000/svg"><ellipse cx="20" cy="28" rx="11" ry="13" fill="#2f4a73"/><circle cx="16" cy="22" r="1.6" fill="#fff"/><circle cx="24" cy="22" r="1.6" fill="#fff"/><path d="M11 24 L4 36 M29 24 L36 36 M15 40 L12 52 M25 40 L28 52" stroke="#1e3a5f" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>`,
  moon: `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><path d="M30 6 A18 18 0 1 0 30 42 A14 14 0 1 1 30 6Z" fill="#f7d774"/></svg>`,
  crown: `<svg viewBox="0 0 48 32" xmlns="http://www.w3.org/2000/svg"><path d="M4 26 L8 10 L16 20 L24 6 L32 20 L40 10 L44 26Z" fill="#f4b400" stroke="#c48a00" stroke-width="1.2"/></svg>`,
  magpie: `<svg viewBox="0 0 48 40" xmlns="http://www.w3.org/2000/svg"><ellipse cx="20" cy="22" rx="11" ry="6.5" fill="#2a3144"/><circle cx="32" cy="16" r="5.5" fill="#f4f6fa"/><circle cx="34" cy="15" r="1.2" fill="#111"/><path d="M32 16 L40 14 L32 19Z" fill="#e0a832"/><path d="M12 16 Q4 6 14 8 Q16 14 16 18Z" fill="#4b5d88"/><path d="M10 24 Q0 30 8 34 Q16 28 16 24Z" fill="#1b2437"/></svg>`,
};

/** 档 1：小颗粒通用图标（Iconify）。优先于生图。 */
export function createCastIconTool(opts: CastLaneOpts = {}) {
  const search = createIconSearchTool({ fetch: opts.fetch });
  const pull = createIconSvgTool({ fetch: opts.fetch, persistDir: opts.persistDir });
  return defineTool({
    name: "cast_icon",
    label: "档1·图标",
    description:
      "出图档1：表情/牛/鸟/月/衣/皇冠等小颗粒通用图。英文物体词搜并拉一枚 SVG。" +
      "先用本工具。禁止把 Iconify URL 写进教具。正戏用返回的 svg 或 <use>。",
    parameters: Type.Object({
      query: Type.String({ description: "英文物体词，如 cow / bird / moon" }),
      id: Type.Optional(Type.String({ description: "已有 id 如 noto:ox，有则跳过搜索" })),
    }),
    execute: async (_id, params) => {
      const id = String(params.id || "").trim();
      if (id) {
        const r = await pull.execute("t", { id });
        return r;
      }
      const q = String(params.query || "").trim();
      if (!q) return toolError("query 或 id 必填");
      const found = await search.execute("t", { query: q, limit: 6 });
      const j = JSON.parse(found.content[0].text);
      if (!j.ok || !j.hits?.length) {
        return toolError("没有合适图标，可改英文词或走 cast_svg 兜底", { query: q });
      }
      const pick =
        j.hits.find((h: { id: string }) => h.id.startsWith("noto:")) ||
        j.hits.find((h: { id: string }) => h.id.startsWith("lucide:")) ||
        j.hits[0];
      const got = await pull.execute("t", { id: pick.id });
      const g = JSON.parse(got.content[0].text);
      return toolOk({
        ok: true,
        lane: "icon",
        query: q,
        id: pick.id,
        svg: g.svg,
        next: "把 svg 内联或放进 <symbol>，正戏 <use>。不要空 data-cast。",
      });
    },
  });
}

/** 档 3：文本/代码 SVG 兜底（过程图、无名豆人）。 */
export function createCastSvgTool(opts: CastLaneOpts = {}) {
  return defineTool({
    name: "cast_svg",
    label: "档3·代码SVG",
    description:
      "出图档3（兜底）：用仓库里连肢好的 SVG 模板出图，不是位图生图。" +
      "kind: cow bird magpie bean moon crown。过程动画（划河/搭桥/搬块）用本档改坐标。" +
      "脸和故事主角不要优先走这里。",
    parameters: Type.Object({
      kind: Type.String({ description: "cow | bird | magpie | bean | moon | crown" }),
    }),
    execute: async (_id, params) => {
      const kind = String(params.kind || "").trim().toLowerCase();
      const svg = SVG[kind];
      if (!svg) return toolError("未知 kind", { allow: Object.keys(SVG) });
      const file = persistCastSvg(opts.persistDir, `svg-${kind}`, svg);
      return toolOk({
        ok: true,
        lane: "svg",
        kind,
        file: file || "",
        svg,
        next: "内联这份 svg，用 transform 换位。人物改 cast_roster，动物/物改 cast_search。",
      });
    },
  });
}

function shrinkImage(srcPng: string, destJpg: string): { dest: string; bytes: number } {
  try {
    execFileSync("sips", ["-Z", "256", "-s", "format", "jpeg", srcPng, "--out", destJpg], {
      stdio: "ignore",
    });
    return { dest: destJpg, bytes: fs.statSync(destJpg).size };
  } catch {
    return { dest: srcPng, bytes: fs.statSync(srcPng).size };
  }
}

export async function generateGptImage(opts: {
  prompt: string;
  slug: string;
  persistDir: string;
  fetch?: FetchLike;
  root?: string;
}): Promise<{ ok: true; file: string; bytes: number; mime: string } | { ok: false; error: string }> {
  loadLocalEnv(opts.root);
  const key = process.env.GPT_IMAGE_API_KEY || process.env.OPENAI_API_KEY;
  const base = (process.env.GPT_IMAGE_BASE_URL || process.env.OPENAI_BASE_URL || "").replace(/\/$/, "");
  const model = process.env.GPT_IMAGE_MODEL || "gpt-image-2";
  if (!key || !base) return { ok: false, error: "缺少 GPT_IMAGE_API_KEY / GPT_IMAGE_BASE_URL（写在仓库 .env）" };
  const doFetch = opts.fetch || fetch;
  const res = await doFetch(`${base}/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt: opts.prompt,
      size: "512x512",
      n: 1,
      quality: "low",
    }),
  });
  const raw = await res.text();
  if (!res.ok) return { ok: false, error: `GPT Image HTTP ${res.status}: ${raw.slice(0, 240)}` };
  const data = JSON.parse(raw) as { data?: Array<{ b64_json?: string }> };
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) return { ok: false, error: "响应没有 b64_json" };
  fs.mkdirSync(opts.persistDir, { recursive: true });
  const png = path.join(opts.persistDir, `${opts.slug}.png`);
  fs.writeFileSync(png, Buffer.from(b64, "base64"));
  const jpg = path.join(opts.persistDir, `${opts.slug}.jpg`);
  const out = shrinkImage(png, jpg);
  return { ok: true, file: out.dest, bytes: out.bytes, mime: out.dest.endsWith(".jpg") ? "image/jpeg" : "image/png" };
}

export function injectCastImages(html: string, castDir: string): string {
  if (!html || !castDir || !fs.existsSync(castDir)) return html;
  return html.replace(/<g(\s[^>]*\bdata-cast-img=["']([^"']+)["'][^>]*)>\s*<\/g>/gi, (all, _attrs, slug) => {
    const safe = String(slug).replace(/[^a-z0-9._-]+/gi, "_");
    const jpg = path.join(castDir, `${safe}.jpg`);
    const png = path.join(castDir, `${safe}.png`);
    const file = fs.existsSync(jpg) ? jpg : fs.existsSync(png) ? png : "";
    if (!file) return all;
    const mime = file.endsWith(".jpg") ? "image/jpeg" : "image/png";
    const b64 = fs.readFileSync(file).toString("base64");
    return `<image data-cast-img="${safe}" href="data:${mime};base64,${b64}" width="120" height="120"/>`;
  });
}

/** GPT Image 2。代码保留，默认不注入 createInjectedTools。 */
export function createCastImageTool(opts: CastLaneOpts = {}) {
  const persistDir = opts.persistDir || path.join(opts.root || process.cwd(), "output", "cast");
  return defineTool({
    name: "cast_image",
    label: "档2·生图（未注入）",
    description:
      "未注入默认会话。不要调用。人物走 cast_roster，动物/物走 cast_search。" +
      "prompt 写身份+古装/侧全身+白底透明感+不要字。" +
      "write 里只放 <g data-cast-img=\"slug\"></g>，宿主填 data URI。禁止外链。",
    parameters: Type.Object({
      slug: Type.String({ description: "文件名，如 niulang / zhinv / wangmu" }),
      prompt: Type.String({ description: "英文提示词，身份必须写清" }),
    }),
    execute: async (_id, params) => {
      const slug = String(params.slug || "").trim().replace(/[^a-zA-Z0-9._-]/g, "");
      const prompt = String(params.prompt || "").trim();
      if (!slug || !prompt) return toolError("slug 与 prompt 必填");
      try {
        const r = await generateGptImage({
          prompt,
          slug,
          persistDir,
          fetch: opts.fetch,
          root: opts.root,
        });
        if (!r.ok) return toolError(r.error, { slug });
        return toolOk({
          ok: true,
          lane: "image",
          slug,
          file: r.file,
          bytes: r.bytes,
          too_big: r.bytes > 80_000,
          placeholder: `<g data-cast-img="${slug}"></g>`,
          next: "write 只放 placeholder。不要把整段 base64 抄进 write。",
        });
      } catch (e) {
        return toolError(e instanceof Error ? e.message : String(e), { slug });
      }
    },
  });
}
