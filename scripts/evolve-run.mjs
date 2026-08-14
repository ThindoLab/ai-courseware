#!/usr/bin/env node
/**
 * Skill 进化循环 Leader 规划脚手架
 * 生成 N 轮（默认 10）角色轮换的任务清单，写入 runs/evolve-<ts>/tasks.json
 * 每轮 5 步：optimizer → generator → reviewer → reflector → reoptimizer（每步不同角色）
 * 依赖链：轮内串联；轮间 R(n).optimizer 依赖 R(n-1).reoptimizer
 *
 * 用法：node scripts/evolve-run.mjs [--rounds 10] [--tag skill-v2]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function arg(name, def = "") {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : def;
}

const ROUNDS = parseInt(arg("rounds", "10"), 10);
const tag = arg("tag", `evolve-${new Date().toISOString().slice(0, 10)}`);
const runDir = path.join(ROOT, "optimization", "teams", "evolve", "runs", `${tag}-${Date.now()}`);
fs.mkdirSync(runDir, { recursive: true });

const STEPS = [
  { role: "optimizer",   label: "优化：诊断+新场景提案" },
  { role: "generator",   label: "生成：产出 HTML/提示词草稿" },
  { role: "reviewer",    label: "审核：多视角 verdict+mustFix" },
  { role: "reflector",   label: "反思：提炼可固化规律" },
  { role: "reoptimizer", label: "再优化：固化进 system.md/SKILL.md" },
];

const tasks = [];
let id = 1;
let prevRoundLast = null;

for (let r = 1; r <= ROUNDS; r++) {
  const roundDir = path.join(runDir, `R${r}`);
  fs.mkdirSync(roundDir, { recursive: true });
  const stepIds = [];
  for (const [si, s] of STEPS.entries()) {
    const deps = [];
    if (si > 0) deps.push(stepIds[si - 1]);   // 轮内串联
    if (si === 0 && prevRoundLast) deps.push(prevRoundLast); // 轮间串联
    const t = {
      id: `T${id}`,
      role: s.role,
      round: r,
      text: `【R${r} · ${s.label}】runDir=${runDir} round=${r} role=${s.role}。执行你的角色职责（读 pi/角色/${s.role}.md），产物写入 ${path.relative(ROOT, roundDir)}/。上一步产物：${si > 0 ? STEPS[si - 1].label : "（无，本轮开始）"}`,
    };
    if (deps.length) t.dependsOn = deps;
    tasks.push(t);
    stepIds.push(`T${id}`);
    id++;
  }
  prevRoundLast = stepIds[4];
}

const manifest = {
  tag,
  rounds: ROUNDS,
  runDir: path.relative(ROOT, runDir),
  roles: STEPS.map((s) => s.role),
  rotation: "optimizer → generator → reviewer → reflector → reoptimizer，每轮循环，每步不同角色",
  tasks,
};
fs.writeFileSync(path.join(runDir, "tasks.json"), JSON.stringify(manifest, null, 2), "utf8");

console.log(`✅ evolve run 已创建: ${path.relative(ROOT, runDir)}`);
console.log(`   轮次: ${ROUNDS} · 任务数: ${tasks.length} · 角色轮换: ${manifest.rotation}`);
console.log(`\n启动：`);
console.log(`  teams predefined_team_spawn skill-evolve`);
console.log(`  然后按 tasks.json 依赖 delegate（或用 /team task add 批量导入）`);
