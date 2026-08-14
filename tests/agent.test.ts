import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  resolveType,
  pickAgentModel,
  inferAudience,
  scoreAudienceQuality,
} from "../src/agent.ts";
import { knowledgeSearchTool, qaCheckTool, AGENT_TOOLS } from "../src/tools.ts";

test("inferAudience 分龄与场景", () => {
  const young = inferAudience("小熊凑十", "学前");
  assert.equal(young.ageBand, "3-6");
  assert.ok(young.touchMin >= 64);
  assert.ok(young.scenes.includes("中幼儿") || young.scenes.includes("家庭"));

  const mid = inferAudience("水的三态变化", "科学");
  assert.equal(mid.ageBand, "7-9");
  assert.ok(mid.scenes.includes("家庭") || mid.scenes.includes("教室"));

  const older = inferAudience("勾股定理证明", "初中数学");
  assert.equal(older.ageBand, "10-12");
});

test("scoreAudienceQuality 检出关键结构", () => {
  const aud = inferAudience("认识三角形", "数学");
  const good = `<!doctype html><html><head><title>t</title><style>
  button{min-height:52px;font-size:20px}
  @media (prefers-reduced-motion:reduce){*{animation:none}}
  </style></head><body>
  <span class="age">7–9 岁 · 家庭</span>
  <svg></svg><p class="thinking">我怎么想</p>
  <button id="btnSay">我会说</button>
  <button>↻ 重置</button>
  <input type="range"><script></script></body></html>`;
  const r = scoreAudienceQuality(good, aud);
  assert.ok(r.score >= 70, JSON.stringify(r));
  assert.equal(r.checks.hasThinking, true);
  assert.equal(r.checks.hasSay, true);
});

test("pickAgentModel 避开 fable、优先 deepseek/haiku", () => {
  const fake = [
    { provider: "anthropic", id: "claude-fable-5" },
    { provider: "anthropic", id: "claude-haiku-4-5" },
    { provider: "deepseek", id: "deepseek-v4-flash" },
  ];
  const m = pickAgentModel(fake);
  assert.equal(m.id, "deepseek-v4-flash");
  // fable 单独在列表时也不该被选（blocked 后回退 available[0] 仅当无 usable——此处 usable 有 haiku）
  const onlyFableAndHaiku = [
    { provider: "anthropic", id: "claude-fable-5" },
    { provider: "anthropic", id: "claude-haiku-4-5" },
  ];
  assert.equal(pickAgentModel(onlyFableAndHaiku).id, "claude-haiku-4-5");
});

test("matchByPortraits 画像匹配", async () => {
  const { matchByPortraits, loadPortraits } = await import("../pi/tools/match-sample.ts");
  const portraits = loadPortraits(process.cwd());
  assert.ok(portraits.length >= 20);
  const avg = matchByPortraits("平均数", portraits);
  assert.equal(avg.verdict, "use");
  assert.equal(avg.slug, "average");
  const miss = matchByPortraits("光合作用", portraits);
  assert.equal(miss.verdict, "none");
  const short = matchByPortraits("a", portraits);
  assert.equal(short.verdict, "none");
});

test("失败路径不再暴露 sample fallback 开关语义", () => {
  const agentSrc = readFileSync(new URL("../src/agent.ts", import.meta.url), "utf8");
  assert.equal(agentSrc.includes("sample_library_fallback"), false);
});

test("resolveType 默认匹配", () => {
  assert.equal(resolveType("鸡兔同笼", "learning-coaching"), "param-visual");
  assert.equal(resolveType("厨房着火怎么办", "safety-life"), "branch-story");
  assert.equal(resolveType("There is 句型", "learning-coaching"), "drag-slot");
});

test("resolveType skillId 优先", () => {
  assert.equal(resolveType("任意", "x", "en-sentence-drag-slot"), "drag-slot");
  assert.equal(resolveType("任意", "x", "fire-safety-branch-story"), "branch-story");
});

test("tools.ts 暴露 knowledge_search + qa_check（web_search/fetch_content 由 pi-web-access 扩展提供）", () => {
  const names = AGENT_TOOLS.map((t) => t.name);
  assert.deepEqual(names, ["knowledge_search", "qa_check"]);
});

test("knowledge_search 工具定义正确", () => {
  assert.equal(knowledgeSearchTool.name, "knowledge_search");
  assert.ok(knowledgeSearchTool.description.length > 0);
  assert.ok(knowledgeSearchTool.parameters);
});

test("qa_check 检出外链/外部库/小字号/无重置", async () => {
  const badHtml = `<!doctype html><html><head><title>t</title></head><body>
  <script src="lib.js"></script>
  <img src="https://x.com/a.png">
  <div style="font-size:13px">小字</div>
  <button style="min-height:38px">b</button>
  </body></html>`;
  const r = await qaCheckTool.execute("t", { html: badHtml, type: "param-visual" });
  const j = JSON.parse(r.content[0].text);
  assert.equal(j.passed, false, "有 error 级问题应不通过");
  const rules = j.issues.map((i: any) => i.rule);
  assert.ok(rules.includes("external-link"));
  assert.ok(rules.includes("external-lib"));
  assert.ok(rules.includes("touch-size"));
  assert.ok(rules.includes("font-size"));
});

test("qa_check 干净 HTML 通过", async () => {
  const goodHtml = `<!doctype html><html lang="zh"><head><title>好</title></head><body>
  <style>.b{min-height:48px;font-size:16px}@media(prefers-reduced-motion:reduce){*{animation:none}}</style>
  <div id="stage">主交互</div><button class="b" id="btn-reset">↻ 重置</button>
  <script>console.log("原生JS");</script>
  </body></html>`;
  const r = await qaCheckTool.execute("t", { html: goodHtml });
  const j = JSON.parse(r.content[0].text);
  assert.equal(j.passed, true, JSON.stringify(j.issues));
  assert.equal(j.stats.errorCount, 0);
});
