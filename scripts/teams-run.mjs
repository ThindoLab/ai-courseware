#!/usr/bin/env node
/**
 * 教具 Teams 流水线脚手架（Leader 侧规划产物）
 * 实际执行由 Pi agent-teams 完成；本脚本：
 * 1) 创建 run 目录与任务清单
 * 2) 写入 leader 规划
 * 3) 打印可粘贴到 Pi 的 teams delegate 指令
 *
 * 用法：
 *   node scripts/teams-run.mjs --topic 平均数 --module learning-coaching --type param-visual --slug average
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

const topic = arg("topic", "平均数");
const moduleName = arg("module", "learning-coaching");
const type = arg("type", "param-visual");
const slug = arg("slug", "average");
const runId = arg("runId", `run-${Date.now()}`);

const runDir = path.join(ROOT, "optimization", "teams", "runs", runId);
fs.mkdirSync(runDir, { recursive: true });

const plan = `# Leader Plan — ${topic}

- runId: ${runId}
- topic: ${topic}
- module: ${moduleName}
- type: ${type}
- slug: ${slug}
- out: samples/${slug}.html

## Pipeline
1. researcher → 01-research.md
2. organizer  → 02-spec.md  (depends 1)
3. writer     → samples/${slug}.html + 03-write.md (depends 2)
4. qa         → 04-qa.json / 04-qa.md (depends 3)
5. regenerator→ fix mustFix + 05-regen.md (depends 4)

## Dynamic requirement (铁律 21/22)
Leader 预判：平均数必须可视化「均分过程」，不能只显示公式结果。
`;

fs.writeFileSync(path.join(runDir, "00-leader-plan.md"), plan, "utf8");

const tasks = {
  runId,
  topic,
  module: moduleName,
  type,
  slug,
  tasks: [
    {
      id: "T1",
      role: "researcher",
      text: `调研教具知识点「${topic}」。module=${moduleName} type=${type}。runId=${runId}。输出 optimization/teams/runs/${runId}/01-research.md。重点：必须可视化的动态过程（均分/移动/生长等）。`,
    },
    {
      id: "T2",
      role: "organizer",
      dependsOn: ["T1"],
      text: `读取 optimization/teams/runs/${runId}/01-research.md，整理设计规格到 optimization/teams/runs/${runId}/02-spec.md。输出路径 samples/${slug}.html。必须写清 Dynamic 动画如何联动。`,
    },
    {
      id: "T3",
      role: "writer",
      dependsOn: ["T2"],
      text: `按 optimization/teams/runs/${runId}/02-spec.md 生成完整单文件 HTML 到 samples/${slug}.html，并复制到 output/best/。写 03-write.md。动态过程必须可见。runId=${runId}`,
    },
    {
      id: "T4",
      role: "qa",
      dependsOn: ["T3"],
      text: `质检 samples/${slug}.html 与 Spec。写 04-qa.json + 04-qa.md 到 optimization/teams/runs/${runId}/。dynamicOk 与 regenerate 字段必填。`,
    },
    {
      id: "T5",
      role: "regenerator",
      dependsOn: ["T4"],
      text: `若 04-qa.json 中 regenerate=true，按 mustFix 重写 samples/${slug}.html 并同步 output/best/；写 05-regen.md。否则注明无需重生成。runId=${runId}`,
    },
  ],
};

fs.writeFileSync(path.join(runDir, "tasks.json"), JSON.stringify(tasks, null, 2), "utf8");

console.log(`✅ run 已创建: ${runDir}`);
console.log(`\n在 Pi 中执行 Agent Teams：\n`);
console.log(`1) teams({ action: "predefined_team_spawn", name: "courseware-pipeline" })`);
console.log(`2) 按依赖 delegate 下列任务（或一次性创建带依赖的 task list）：\n`);
for (const t of tasks.tasks) {
  console.log(`   [${t.id}] ${t.role}: ${t.text.slice(0, 80)}...`);
}
console.log(`\n产物目录: optimization/teams/runs/${runId}/`);
