import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  createDicebearSvgTool,
  createIconSearchTool,
  createIconSvgTool,
  expandIconQuery,
  injectCastPlaceholders,
  parseIconId,
  svgLooksSafe,
  type FetchLike,
} from "../pi/tools/icon-cast.ts";
import { INJECTED_TOOL_NAMES } from "../pi/tools/index.ts";

function jsonFetch(body: unknown, status = 200): FetchLike {
  return async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
}

function textFetch(body: string, status = 200): FetchLike {
  return async () => new Response(body, { status, headers: { "content-type": "image/svg+xml" } });
}

function parseTool(r: { content: Array<{ text: string }>; isError?: boolean }) {
  return { isError: !!r.isError, j: JSON.parse(r.content[0].text) };
}

test("INJECTED 含图标三件套", () => {
  assert.ok(INJECTED_TOOL_NAMES.includes("icon_search"));
  assert.ok(INJECTED_TOOL_NAMES.includes("icon_svg"));
  assert.ok(INJECTED_TOOL_NAMES.includes("dicebear_svg"));
});

test("expandIconQuery 中文物体词译英文", () => {
  assert.equal(expandIconQuery("cow").query, "cow");
  assert.equal(expandIconQuery("老牛").query, "cow");
  assert.equal(expandIconQuery("喜鹊").query, "bird");
  assert.deepEqual(expandIconQuery("喜鹊").from_zh, ["bird swallow"]);
});

test("parseIconId 接受冒号或斜杠", () => {
  assert.deepEqual(parseIconId("noto:cow-face"), { prefix: "noto", name: "cow-face" });
  assert.deepEqual(parseIconId("lucide/shirt"), { prefix: "lucide", name: "shirt" });
  assert.equal(parseIconId("cow"), null);
});

test("svgLooksSafe 拒 script 和外链", () => {
  assert.equal(svgLooksSafe("<svg></svg>").ok, true);
  assert.equal(svgLooksSafe("<div/>").ok, false);
  assert.equal(svgLooksSafe('<svg><script>alert(1)</script></svg>').ok, false);
  assert.equal(svgLooksSafe('<svg><use href="https://evil"></use></svg>').ok, false);
  assert.equal(svgLooksSafe('<svg><image href="x.png"/></svg>').ok, false);
});

test("icon_search 空 query", async () => {
  const tool = createIconSearchTool({ fetch: jsonFetch({}) });
  const r = parseTool(await tool.execute("t", { query: "  " }));
  assert.equal(r.isError, true);
  assert.equal(r.j.ok, false);
});

test("icon_search 未映射中文直接失败", async () => {
  let called = false;
  const tool = createIconSearchTool({
    fetch: async () => {
      called = true;
      return new Response("{}");
    },
  });
  const r = parseTool(await tool.execute("t", { query: "量子纠缠" }));
  assert.equal(r.isError, true);
  assert.equal(called, false);
  assert.match(r.j.error, /中文/);
});

test("icon_search 多词拆开逐个搜", async () => {
  const seen: string[] = [];
  const tool = createIconSearchTool({
    fetch: async (url) => {
      seen.push(String(url));
      const q = new URL(String(url)).searchParams.get("query");
      const icons = q === "bird" ? ["lucide:bird"] : q === "swallow" ? ["game-icons:swallow"] : [];
      return jsonFetch({ icons, total: icons.length, collections: {} })(url);
    },
  });
  const r = parseTool(await tool.execute("t", { query: "bird swallow", limit: 8 }));
  assert.equal(r.j.ok, true);
  assert.equal(r.j.returned, 2);
  assert.deepEqual(
    r.j.hits.map((h: { id: string }) => h.id),
    ["lucide:bird", "game-icons:swallow"]
  );
  assert.equal(seen.length, 2);
  assert.match(seen[0], /query=bird/);
  assert.match(seen[1], /query=swallow/);
});

test("icon_search 截断并带许可", async () => {
  const seen: string[] = [];
  const tool = createIconSearchTool({
    fetch: async (url) => {
      seen.push(String(url));
      return jsonFetch({
        icons: ["noto:cow", "ph:cow", "mdi:cow"],
        total: 32,
        collections: {
          noto: { name: "Noto Emoji", license: { title: "Apache 2.0", spdx: "Apache-2.0" } },
          ph: { name: "Phosphor", license: { title: "MIT", spdx: "MIT" } },
        },
      })(url);
    },
  });
  const r = parseTool(await tool.execute("t", { query: "老牛", limit: 2 }));
  assert.equal(r.isError, false);
  assert.equal(r.j.ok, true);
  assert.equal(r.j.searched.includes("cow"), true);
  assert.equal(r.j.returned, 2);
  assert.equal(r.j.hits[0].id, "noto:cow");
  assert.equal(r.j.hits[0].license, "Apache-2.0");
  assert.match(seen[0], /prefixes=/);
  assert.doesNotMatch(seen[0], /[?&]prefix=/);
});

test("icon_svg 404", async () => {
  const tool = createIconSvgTool({ fetch: textFetch("Not found", 404) });
  const r = parseTool(await tool.execute("t", { id: "lucide:bridge" }));
  assert.equal(r.isError, true);
  assert.match(r.j.error, /没有/);
});

test("icon_svg 返回内联源码", async () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"></svg>';
  const tool = createIconSvgTool({ fetch: textFetch(svg) });
  const r = parseTool(await tool.execute("t", { id: "lucide:shirt" }));
  assert.equal(r.j.ok, true);
  assert.equal(r.j.svg.startsWith("<svg"), true);
  assert.equal(r.j.too_big, false);
});

test("dicebear_svg 校验 seed", async () => {
  const tool = createDicebearSvgTool({ fetch: textFetch("<svg></svg>") });
  const bad = parseTool(await tool.execute("t", { seed: "牛郎" }));
  assert.equal(bad.isError, true);
  const ok = parseTool(await tool.execute("t", { seed: "niulang", flip: true }));
  assert.equal(ok.j.ok, true);
  assert.equal(ok.j.style, "open-peeps");
  assert.match(ok.j.placeholder, /data-cast="niulang"/);
  assert.equal(ok.j.svg, undefined);
});

test("injectCastPlaceholders 填空 g", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cast-"));
  fs.writeFileSync(path.join(dir, "niulang.svg"), '<svg viewBox="0 0 10 10"><circle id="c" r="2"/></svg>\n');
  const html = injectCastPlaceholders(
    '<svg><g data-cast="niulang" transform="translate(1,2)"></g></svg>',
    dir
  );
  assert.match(html, /<circle id="c-niulang-1"/);
  assert.match(html, /data-cast="niulang"/);
});
