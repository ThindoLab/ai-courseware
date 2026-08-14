import { test } from "node:test";
import assert from "node:assert/strict";
import { search } from "../src/knowledge.ts";

const M = "learning-coaching";

test("search 鸡兔同笼 命中对应切片且 score>0", () => {
  const res = search("鸡兔同笼", M);
  assert.ok(res.hits.length > 0, "应有命中");
  assert.equal(res.hits[0].chunk_id, "chicken-rabbit");
  assert.ok(res.hits[0].score > 0);
  assert.equal(res.strategy, "local-first");
});

test("search 行程 命中行程切片", () => {
  const res = search("行程 相遇", M);
  assert.ok(res.hits.length > 0);
  assert.equal(res.hits[0].chunk_id, "distance-meet");
});

test("无关查询返回空 hits + 明确 strategy", () => {
  const res = search("量子纠缠", M);
  assert.equal(res.hits.length, 0);
  assert.equal(res.strategy, "local-first");
});

test("不存在的 module 不报错，返回空 hits", () => {
  const res = search("anything", "no-such-module");
  assert.equal(res.hits.length, 0);
  assert.equal(res.strategy, "local-first(no-dir)");
});

test("每个 hit 含 source 字段", () => {
  const res = search("鸡兔同笼", M);
  assert.ok(res.hits[0].source, "source 应非空");
});
