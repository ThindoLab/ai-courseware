#!/usr/bin/env node
/**
 * 把已有备份收成 v1/v2/… 并给当前 HTML 打版本戳。
 * 只建档，不改教具交互。
 */
import fs from "node:fs";
import path from "node:path";
import { stampHtml, saveVersionManifest, VERSIONS_DIR } from "./aid-version.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const SAMPLES = path.join(ROOT, "samples");
const layers = [
  { dir: path.join(ROOT, "output", "rerun-backup-20260814"), at: "2026-08-14", note: "重跑前精品" },
  {
    dir: path.join(ROOT, "output", "rerun-backup-2026-08-14T07-37-00"),
    at: "2026-08-14T07-37-00",
    note: "整库重跑前的当时当前稿",
  },
];

function stripStamp(html) {
  return String(html).replace(/\s*<meta name="aid-version(?:-at|-note)?"[^>]*>/gi, "").trim();
}

const slugs = fs
  .readdirSync(SAMPLES)
  .filter((f) => f.endsWith(".html"))
  .map((f) => f.slice(0, -5));

const man = {};
for (const slug of slugs) {
  const chain = [];
  for (const layer of layers) {
    const p = path.join(layer.dir, `${slug}.html`);
    if (!fs.existsSync(p)) continue;
    chain.push({ html: fs.readFileSync(p, "utf8"), at: layer.at, note: layer.note });
  }
  const curPath = path.join(SAMPLES, `${slug}.html`);
  const curHtml = fs.readFileSync(curPath, "utf8");
  const last = chain[chain.length - 1];
  if (!last || stripStamp(last.html) !== stripStamp(curHtml)) {
    chain.push({ html: curHtml, at: new Date().toISOString().slice(0, 19), note: "当前稿" });
  } else {
    last.note = `${last.note}（与当前相同）`;
  }

  const items = [];
  fs.mkdirSync(path.join(VERSIONS_DIR, slug), { recursive: true });
  chain.forEach((step, i) => {
    const id = `v${i + 1}`;
    const stamped = stampHtml(step.html, { id, at: step.at, note: step.note });
    const rel = `samples/versions/${slug}/${id}.html`;
    fs.writeFileSync(path.join(ROOT, rel), stamped, "utf8");
    items.push({ id, at: step.at, note: step.note, file: rel });
    if (i === chain.length - 1) fs.writeFileSync(curPath, stamped, "utf8");
  });
  man[slug] = { current: items[items.length - 1].id, items };
  console.error(`${slug}: ${items.map((it) => it.id).join(" → ")} (${items[items.length - 1].note})`);
}

saveVersionManifest(man);
console.log(JSON.stringify({ slugs: slugs.length, file: "samples/versions/manifest.json" }, null, 2));
