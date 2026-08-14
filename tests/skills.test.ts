import { test } from "node:test";
import assert from "node:assert/strict";
import {
  loadSkills,
  skillsToAgentSkills,
  typeByName,
  VALID_TYPES,
} from "../src/skills-loader.ts";

test("loadSkills 返回内置 + 创作者（≥4）", () => {
  const defs = loadSkills();
  const builtin = defs.filter((d) => d.source === "builtin");
  const creator = defs.filter((d) => d.source === "creator");
  assert.ok(builtin.length >= 3, `内置应≥3，实际 ${builtin.length}`);
  assert.ok(creator.length >= 1, `创作者应≥1，实际 ${creator.length}`);
  assert.ok(defs.length >= 4, `总数应≥4，实际 ${defs.length}`);
});

test("所有 skill 必填字段齐全且 type 合法", () => {
  for (const d of loadSkills()) {
    assert.ok(d.name, `${d.baseDir} 缺 name`);
    assert.ok(d.valid, `${d.name} 校验失败: ${d.errors.join("; ")}`);
    assert.ok(VALID_TYPES.includes(d.type as any), `${d.name} type 非法: ${d.type}`);
  }
});

test("typeByName 查注册表", () => {
  const defs = loadSkills();
  assert.equal(typeByName(defs, "math-app-visual"), "param-visual");
  assert.equal(typeByName(defs, "pinyin-drag"), "drag-slot");
  assert.equal(typeByName(defs, "不存在"), undefined);
});

test("skillsToAgentSkills 仅返回 valid", () => {
  const defs = loadSkills();
  const agent = skillsToAgentSkills(defs);
  assert.equal(agent.length, defs.filter((d) => d.valid).length);
  for (const s of agent) assert.ok(s.filePath && s.baseDir);
});
