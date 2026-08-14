#!/usr/bin/env node
/** 样例库静态+语义探测 */
import fs from "node:fs";
import path from "node:path";
const ROOT = path.resolve(import.meta.dirname, "..");
const dir = path.join(ROOT, "samples");
const issues = [];
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".html"))) {
  const t = fs.readFileSync(path.join(dir, f), "utf8");
  if (!/重置|重新开始/.test(t)) issues.push({ f, sev: "P0", d: "缺重置" });
  if (!/我会说/.test(t)) issues.push({ f, sev: "P0", d: "缺我会说" });
  if (!/我怎么想|thinking/.test(t)) issues.push({ f, sev: "P0", d: "缺我想" });
  if (/<script[^>]+src=["']https?:/.test(t)) issues.push({ f, sev: "P0", d: "外链script" });
  if (f === "kitchen-fire.html" && /用水浇灭！/.test(t)) issues.push({ f, sev: "P0", d: "祈使错误项" });
  if (f === "kitchen-fire.html" && !/119/.test(t)) issues.push({ f, sev: "P0", d: "缺119" });
  if (f === "clock-read.html" && /m\s*=\s*\[[^\]]*(15|45)/.test(t))
    issues.push({ f, sev: "P0", d: "考题分钟超出整半" });
  if (f === "there-be.html" && /num:'a',\s*noun:'apple'/.test(t))
    issues.push({ f, sev: "P0", d: "a apple 非法" });
}
const man = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8"));
const files = new Set(fs.readdirSync(dir).filter((x) => x.endsWith(".html")).map((x) => x.replace(/\.html$/, "")));
const slugs = new Set(man.map((x) => x.slug));
for (const s of slugs) if (!files.has(s)) issues.push({ f: "manifest", sev: "P0", d: "缺文件 " + s });
for (const s of files) if (!slugs.has(s)) issues.push({ f: s, sev: "P1", d: "未入 manifest" });
const byType = { "param-visual": 0, "branch-story": 0, "drag-slot": 0 };
for (const m of man) if (byType[m.type] != null) byType[m.type]++;
if (byType["branch-story"] < 4) {
  issues.push({ f: "coverage", sev: "P1", d: `branch-story 仅 ${byType["branch-story"]}（建议≥4）` });
}
if (byType["drag-slot"] < 4) {
  issues.push({ f: "coverage", sev: "P1", d: `drag-slot 仅 ${byType["drag-slot"]}（建议≥4）` });
}
// hardcore-smoke: minimal teaching markers
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".html"))) {
  const t = fs.readFileSync(path.join(dir, f), "utf8");
  if (!/我怎么想|thinking/.test(t)) issues.push({ f, sev: "P1", d: "缺我怎么想(hardcore-smoke)" });
  if (!/aria-live/.test(t)) issues.push({ f, sev: "P2", d: "缺aria-live" });
}
const p0 = issues.filter((x) => x.sev === "P0");
const rest = issues.filter((x) => x.sev !== "P0");
if (!issues.length) console.log("✅ sample-detect clean", byType);
else {
  console.log(JSON.stringify({ byType, p0, other: rest }, null, 2));
}
process.exit(p0.length ? 1 : 0);
