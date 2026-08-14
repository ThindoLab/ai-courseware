#!/usr/bin/env node
/**
 * 语义层批量抽检（与 sample-detect 互补）
 * - detect：结构门禁
 * - 本脚本：关键样例的教学/安全/图解断言（基于源码特征，可复跑）
 *
 * 用法：node scripts/sample-qa-batch.mjs
 * 退出码：有 P0 为 1
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(ROOT, "samples");
const outDir = path.join(ROOT, "optimization/teams/evolve/runs/R21-auto");
fs.mkdirSync(outDir, { recursive: true });

function read(slug) {
  const p = path.join(dir, `${slug}.html`);
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, "utf8");
}

const checks = [];
function check(slug, sev, id, ok, detail) {
  checks.push({ slug, sev, id, ok: !!ok, detail });
}

// —— 全库轻量 ——
const man = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8"));
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".html"));
check("manifest", "P0", "count-match", man.length === files.length, `man=${man.length} files=${files.length}`);

for (const m of man) {
  const t = read(m.slug);
  check(m.slug, "P0", "file-exists", !!t, "html missing");
  if (!t) continue;
  check(m.slug, "P0", "reset", /重置|重新开始/.test(t), "缺重置");
  check(m.slug, "P0", "say", /我会说/.test(t), "缺我会说");
  check(m.slug, "P1", "think", /我怎么想|thinking/.test(t), "缺我想");
  check(m.slug, "P2", "aria-live", /aria-live/.test(t), "缺aria-live");
}

// —— 语义特判（主推件）——
{
  const t = read("compare-length");
  check("compare-length", "P0", "align-gate", t && /aligned/.test(t) && /还没对齐/.test(t), "必须先对齐再作答");
  check("compare-length", "P1", "skew-default", t && /skew/.test(t), "默认错位演示");
}
{
  const t = read("class-vote");
  check("class-vote", "P0", "fixed-scale", t && /let scale/.test(t), "固定刻度防相对缩短");
  check("class-vote", "P1", "grow-feedback", t && /条变长/.test(t), "加票反馈");
}
{
  const t = read("kitchen-fire");
  check("kitchen-fire", "P0", "no-imperative", t && !/用水浇灭！/.test(t), "禁祈使错误项");
  check("kitchen-fire", "P0", "has-119", t && /119/.test(t), "行动链119");
  check("kitchen-fire", "P1", "scene-sync", t && /updateScene/.test(t), "主场景随节点");
}
{
  const t = read("chicken-rabbit");
  check("chicken-rabbit", "P1", "diff-viz", t && /多出|少了/.test(t) && /f97316/.test(t), "腿差可视化");
  check("chicken-rabbit", "P2", "phase-dots", t && /phaseDots|跳到结果/.test(t), "阶段导航");
}
{
  const t = read("there-be");
  check("there-be", "P0", "an-apple", t && /num:'an',\s*noun:'apple'/.test(t), "an apple");
  check("there-be", "P1", "no-html5-only", t && !/draggable\s*=/.test(t), "禁用纯html5 drag");
}
{
  const t = read("clock-read");
  check("clock-read", "P0", "quiz-half-hour", t && !/m\s*=\s*\[[^\]]*(15|45)/.test(t) && /0 : 30|0: 30|\? 0 : 30/.test(t), "考题仅整半");
}
{
  const t = read("odd-even");
  check("odd-even", "P1", "pair-visual", t && /pair/.test(t) && /落单|没伴/.test(t), "配对可见");
}
{
  const t = read("money-change");
  check("money-change", "P1", "three-bars", t && /bar-row/.test(t), "三行独立条");
}
{
  const t = read("he-bei");
  check("he-bei", "P1", "he-bei-parts", t && /倍数\+1|parts/.test(t) && /弟/.test(t), "和倍份数");
}
{
  const t = read("there-be");
  check("there-be", "P1", "field-slots", t && /【be 槽】|be 槽/.test(t), "字段化错反馈");
}
{
  const t = read("up-down-lr");
  check("up-down-lr", "P1", "exists", !!t, "方位样例");
  check("up-down-lr", "P2", "train-move", t && /🚂/.test(t), "火车形象");
}
{
  const t = read("palm-measure");
  check("palm-measure", "P1", "remain-bar", t && /remain/.test(t), "剩余长度条");
}
{
  const t = read("classroom-hand");
  check("classroom-hand", "P1", "scene-sync", t && /sceneEmoji/.test(t), "主场景随节点");
}
{
  const t = read("class-vote");
  check("class-vote", "P2", "ticks", t && /ticks/.test(t), "刻度线");
}
{
  const t = read("fraction");
  check("fraction", "P2", "strip2", t && /strip2/.test(t), "假分数第二纸条");
}
{
  const t = read("distance-meet");
  check("distance-meet", "P2", "step-marks", t && /m1/.test(t) && /1\/3/.test(t), "分步标记");
}
{
  const t = read("brush-steps");
  check("brush-steps", "P2", "pipeline", t && /pipe|①准备/.test(t), "步骤管线");
}
{
  const t = read("he-bei");
  check("he-bei", "P2", "unit-width", t && /unitW|份）/.test(t), "按份绝对条宽");
}
{
  const t = read("pattern-lights");
  check("pattern-lights", "P2", "pos-in-unit", t && /小段内第/.test(t), "周期内序号");
}
{
  const t = read("transform");
  check("transform", "P2", "coord-hud", t && /coord|Δx/.test(t), "坐标 HUD");
}
{
  const t = read("tree-planting");
  check("tree-planting", "P2", "seg-badge", t && /segBadge/.test(t), "段数棵数徽章");
}
{
  const t = read("memory-match");
  check("memory-match", "P2", "relation-map", t && /relation/.test(t), "关系图例区");
}
{
  const t = read("share-crayon");
  check("share-crayon", "P2", "mood-bg", t && /scene.style.background|sc.style.background/.test(t), "场景情绪色");
}

// branch-story 错误项话术
for (const slug of ["kitchen-fire", "classroom-hand", "stranger-door", "cross-road", "share-crayon"]) {
  const t = read(slug);
  if (!t) {
    check(slug, "P0", "exists", false, "missing");
    continue;
  }
  const wrongs = [...t.matchAll(/text:\s*'([^']+)'[^}]*correct:\s*false/g)].map((m) => m[1]);
  const bad = wrongs.filter(
    (w) => !/有人|会怎样|行吗|吗？|\?|？/.test(w) && /！|!$/.test(w)
  );
  check(slug, "P0", "wrong-option-style", bad.length === 0, bad.length ? bad.join(" | ") : "ok");
}

const p0 = checks.filter((c) => !c.ok && c.sev === "P0");
const p1 = checks.filter((c) => !c.ok && c.sev === "P1");
const p2 = checks.filter((c) => !c.ok && c.sev === "P2");
const pass = checks.filter((c) => c.ok).length;

const report = {
  generatedAt: new Date().toISOString(),
  total: checks.length,
  pass,
  fail: checks.length - pass,
  p0,
  p1,
  p2,
  checks,
};

fs.writeFileSync(path.join(outDir, "qa-batch.json"), JSON.stringify(report, null, 2));
fs.writeFileSync(
  path.join(outDir, "qa-batch.md"),
  `# sample-qa-batch\n\n- total: ${checks.length}\n- pass: ${pass}\n- fail: ${checks.length - pass}\n- P0 fails: ${p0.length}\n- P1 fails: ${p1.length}\n- P2 fails: ${p2.length}\n\n` +
    (p0.length ? `## P0\n${p0.map((x) => `- **${x.slug}** \`${x.id}\`: ${x.detail}`).join("\n")}\n` : "## P0\n无\n") +
    (p1.length ? `## P1\n${p1.map((x) => `- **${x.slug}** \`${x.id}\`: ${x.detail}`).join("\n")}\n` : "")
);

if (p0.length) {
  console.log("❌ sample-qa-batch P0 fails:", p0.length);
  console.log(JSON.stringify(p0, null, 2));
  process.exit(1);
}
console.log(`✅ sample-qa-batch pass ${pass}/${checks.length}` + (p1.length || p2.length ? ` (P1=${p1.length} P2=${p2.length})` : ""));
process.exit(0);
