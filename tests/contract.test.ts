import { test } from "node:test";
import assert from "node:assert/strict";
import { inject, extractConfig, TYPES, type TemplateType } from "../src/inject.ts";
import { validate } from "../src/validate.ts";
import { inline } from "../src/inline.ts";
import { readTemplate } from "../src/io.ts";

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (typeof a !== "object") return a === b;
  const aA = Array.isArray(a), bA = Array.isArray(b);
  if (aA !== bA) return false;
  if (aA) {
    const aa = a as unknown[], bb = b as unknown[];
    if (aa.length !== bb.length) return false;
    for (let i = 0; i < aa.length; i++) if (!deepEqual(aa[i], bb[i])) return false;
    return true;
  }
  const aa = a as Record<string, unknown>;
  const bb = b as Record<string, unknown>;
  const ka = Object.keys(aa), kb = Object.keys(bb);
  if (ka.length !== kb.length) return false;
  for (const k of ka) {
    if (!Object.prototype.hasOwnProperty.call(bb, k)) return false;
    if (!deepEqual(aa[k], bb[k])) return false;
  }
  return true;
}

for (const t of TYPES) {
  test(`round-trip ${t}: inject(content.sample) -> validate ok + #widget-config 一致 + 无外链`, () => {
    const content = JSON.parse(readTemplate(t, "content.sample.json"));
    const html = inject(t, content);
    const v = validate(t, html);
    assert.ok(v.ok, v.errors.join("; "));
    const config = extractConfig(html);
    assert.ok(deepEqual(config, content), `${t}: #widget-config 与 content 不一致`);
    const inl = inline(html);
    assert.equal(inl.warnings.length, 0, `${t}: 存在外链`);
  });

  test(`${t}: 原 shell.html validate 通过`, () => {
    const html = readTemplate(t, "shell.html");
    const v = validate(t, html);
    assert.ok(v.ok, v.errors.join("; "));
  });
}

test("坏 content (缺必填字段) inject 后 validate 失败", () => {
  const bad = { title: "残缺内容" };
  const html = inject("param-visual", bad);
  const v = validate("param-visual", html);
  assert.ok(!v.ok, "残缺 content 应校验失败");
  assert.ok(v.errors.length > 0);
});

test("inline 检出外链时产生 warning", () => {
  const html = '<a href="https://evil.example/x">x</a>';
  const inl = inline(html);
  assert.ok(inl.warnings.length > 0);
});

test("inline 不误报 SVG xmlns 命名空间为外链", () => {
  const html = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><circle r="5"/></svg>';
  const inl = inline(html);
  assert.equal(inl.warnings.length, 0, `xmlns 不应算外链: ${inl.warnings.join(";")}`);
  // 单引号也应忽略
  const html2 = "<svg xmlns='http://www.w3.org/2000/svg'><rect/></svg>";
  assert.equal(inline(html2).warnings.length, 0, "单引号 xmlns 不应算外链");
  // 等号两侧有空格也应忽略
  const html3 = '<svg xmlns = "http://www.w3.org/2000/svg"><rect/></svg>';
  assert.equal(inline(html3).warnings.length, 0, "带空格的 xmlns 不应算外链");
});

void (null as unknown as TemplateType); // 保持类型导入引用
