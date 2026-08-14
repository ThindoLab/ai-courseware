import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  loadAllowlist,
  loadCatalog,
  mergeHandFields,
  renderCatalogMarkdown,
  resolveKnowledgeBase,
  type ImaCatalog,
} from "../src/ima-catalog.ts";
import { createImaSearchTool } from "../pi/tools/ima-search.ts";
import { INJECTED_TOOL_NAMES } from "../pi/tools/index.ts";
import { resolvePiWebAccessExtension } from "../src/agent.ts";

function tmpRoot(catalog: ImaCatalog, allow = ""): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ima-test-"));
  fs.mkdirSync(path.join(dir, "pi", "ima"), { recursive: true });
  fs.writeFileSync(path.join(dir, "pi", "ima", "catalog.json"), JSON.stringify(catalog));
  fs.writeFileSync(path.join(dir, "pi", "ima", "allowlist.txt"), allow);
  return dir;
}

const sample: ImaCatalog = {
  synced_at: "2026-08-13T00:00:00.000Z",
  knowledge_bases: [
    {
      name: "考公",
      kb_id: "kb-exam",
      base_type: "订阅",
      content_count: 10,
      description: "申论资料",
      content_scope: "申论 行测",
      content_kinds: ["PDF"],
      sample_titles: ["申论格子纸"],
    },
    {
      name: "七星岗的知识库",
      kb_id: "kb-qxg",
      description: "使用指南",
    },
  ],
};

test("resolveKnowledgeBase 按库名解析", () => {
  const root = tmpRoot(sample);
  const r = resolveKnowledgeBase(root, "考公");
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.entry.kb_id, "kb-exam");
});

test("resolveKnowledgeBase 缺 catalog", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ima-empty-"));
  const r = resolveKnowledgeBase(dir, "考公");
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, /ima:sync/);
});

test("allowlist 非空时拦截未列出的库", () => {
  const root = tmpRoot(sample, "考公\n");
  const ok = resolveKnowledgeBase(root, "考公");
  assert.equal(ok.ok, true);
  const blocked = resolveKnowledgeBase(root, "七星岗的知识库");
  assert.equal(blocked.ok, false);
  if (!blocked.ok) assert.match(blocked.error, /allowlist/);
});

test("allowlist 仅注释视为不限制", () => {
  const root = tmpRoot(sample, "# 七星岗的知识库\n");
  assert.deepEqual(loadAllowlist(root), []);
  const r = resolveKnowledgeBase(root, "七星岗的知识库");
  assert.equal(r.ok, true);
});

test("mergeHandFields 保留手写何时搜", () => {
  const prev: ImaCatalog = {
    synced_at: "old",
    knowledge_bases: [{ name: "考公", kb_id: "x", when_to_search: "申论题", notes: "手写" }],
  };
  const merged = mergeHandFields(prev, [{ name: "考公", kb_id: "new", description: "新简介" }]);
  assert.equal(merged[0].kb_id, "new");
  assert.equal(merged[0].when_to_search, "申论题");
  assert.equal(merged[0].notes, "手写");
});

test("renderCatalogMarkdown 不含 kb_id", () => {
  const md = renderCatalogMarkdown(sample);
  assert.match(md, /考公/);
  assert.match(md, /申论资料/);
  assert.equal(md.includes("kb-exam"), false);
  assert.equal(md.includes("kb-qxg"), false);
});

test("ima_search 缺目录时 isError", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ima-tool-"));
  const tool = createImaSearchTool(dir);
  const r = await tool.execute("t", { query: "申论", knowledge_base: "考公" });
  assert.equal(r.isError, true);
  const j = JSON.parse(r.content[0].text);
  assert.equal(j.ok, false);
});

test("ima_search 白名单拦截不发网", async () => {
  const root = tmpRoot(sample, "考公\n");
  const tool = createImaSearchTool(root);
  const r = await tool.execute("t", { query: "指南", knowledge_base: "七星岗的知识库" });
  assert.equal(r.isError, true);
  assert.match(JSON.parse(r.content[0].text).error, /allowlist/);
});

test("INJECTED 含 ima_search；loadCatalog 读仓库文件", () => {
  assert.ok(INJECTED_TOOL_NAMES.includes("ima_search"));
  assert.ok(INJECTED_TOOL_NAMES.includes("web_search"));
  const ext = resolvePiWebAccessExtension();
  assert.ok(ext && ext.endsWith("pi-web-access/index.ts"), ext);
  const cat = loadCatalog(process.cwd());
  assert.ok(cat === null || Array.isArray(cat.knowledge_bases));
});
