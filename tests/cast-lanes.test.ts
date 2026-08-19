import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createCastIconTool, createCastSvgTool, injectCastImages } from "../pi/tools/cast-lanes.ts";
import { qaCheckTool } from "../src/tools.ts";
import { INJECTED_TOOL_NAMES } from "../pi/tools/index.ts";

test("INJECTED 含出图库工具且不含 cast_image", () => {
  assert.ok(INJECTED_TOOL_NAMES.includes("cast_icon"));
  assert.ok(INJECTED_TOOL_NAMES.includes("cast_svg"));
  assert.ok(INJECTED_TOOL_NAMES.includes("cast_roster"));
  assert.ok(INJECTED_TOOL_NAMES.includes("cast_search"));
  assert.ok(INJECTED_TOOL_NAMES.includes("cast_asset"));
  assert.equal(INJECTED_TOOL_NAMES.includes("cast_image"), false);
});

test("cast_svg 返回连肢模板", async () => {
  const tool = createCastSvgTool();
  const r = await tool.execute("t", { kind: "cow" });
  const j = JSON.parse(r.content[0].text);
  assert.equal(j.ok, true);
  assert.match(j.svg, /<svg/);
  const bad = JSON.parse((await tool.execute("t", { kind: "dragon" })).content[0].text);
  assert.equal(bad.ok, false);
});

test("cast_icon 按搜索第一枚 noto 拉 svg", async () => {
  const tool = createCastIconTool({
    fetch: async (url) => {
      const u = String(url);
      if (u.includes("/search")) {
        return new Response(
          JSON.stringify({
            icons: ["ph:cow", "noto:ox"],
            total: 2,
            collections: { noto: { license: { spdx: "Apache-2.0" } } },
          })
        );
      }
      return new Response('<svg xmlns="http://www.w3.org/2000/svg"></svg>', { status: 200 });
    },
  });
  const j = JSON.parse((await tool.execute("t", { query: "cow" })).content[0].text);
  assert.equal(j.ok, true);
  assert.equal(j.id, "noto:ox");
  assert.match(j.svg, /<svg/);
});

test("injectCastImages 填 data-cast-img", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cast-img-"));
  fs.writeFileSync(path.join(dir, "niulang.jpg"), Buffer.from("abcd"));
  const html = injectCastImages(`<svg><g data-cast-img="niulang"></g></svg>`, dir);
  assert.match(html, /data:image\/jpeg;base64,/);
});

test("qa_check 手画牛郎织女报 cast-quality", async () => {
  const html = `<!doctype html><html><head><title>t</title></head><body>
  <style>.b{min-height:48px;font-size:16px}</style>
  <p>牛郎织女</p>
  <div id="stage"></div><button class="b" id="btn-reset">重置</button>
  <script>function person(x,y){return '<g></g>';} function maggieSVG(){return '';}</script>
  </body></html>`;
  const j = JSON.parse((await qaCheckTool.execute("t", { html })).content[0].text);
  assert.ok(j.issues.some((i: { rule: string }) => i.rule === "cast-quality"), JSON.stringify(j.issues));
  assert.equal(j.passed, false);
});
