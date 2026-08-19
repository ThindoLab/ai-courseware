import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { qaCheckTool } from "../src/tools.ts";
import { INJECTED_TOOL_NAMES } from "../pi/tools/index.ts";
import {
  createCastRosterTool,
  createCastSearchTool,
  createCastAssetTool,
  injectCastRoster,
  injectCastPack,
  resolveRosterId,
  loadRosterCatalog,
  defaultRosterDir,
  defaultCastRoot,
  stripRosterMetadata,
  readRosterSvg,
  resetCastCatalogCache,
} from "../pi/tools/cast-roster.ts";

function makeCastFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cast-idx-"));
  fs.mkdirSync(path.join(dir, "packs", "noto"), { recursive: true });
  const cow = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M2 8h12"/></svg>`;
  const dragon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M1 8h8"/></svg>`;
  fs.writeFileSync(path.join(dir, "packs", "noto", "cow-face.svg"), cow);
  fs.writeFileSync(path.join(dir, "packs", "noto", "dragon-face.svg"), dragon);
  fs.writeFileSync(
    path.join(dir, "index.json"),
    JSON.stringify({
      items: [
        {
          id: "noto:cow-face",
          type: "animal",
          type_zh: "动物",
          name: "cow-face",
          label: "动物/cow-face",
          pack: "noto",
          file: "packs/noto/cow-face.svg",
        },
        {
          id: "noto:dragon-face",
          type: "animal",
          type_zh: "动物",
          name: "dragon-face",
          label: "动物/dragon-face",
          pack: "noto",
          file: "packs/noto/dragon-face.svg",
        },
      ],
    })
  );
  resetCastCatalogCache();
  return dir;
}

const rosterDir = defaultRosterDir();

test("INJECTED 含 cast_roster", () => {
  assert.ok(INJECTED_TOOL_NAMES.includes("cast_roster"));
});

test("手册与 SVG 在库里", () => {
  const catalog = loadRosterCatalog(rosterDir);
  assert.ok(catalog.members.some((m) => m.id === "teacher"));
  assert.equal(resolveRosterId("老师", catalog), "teacher");
  assert.equal(resolveRosterId("牛郎", catalog), "explorer");
  const svg = readRosterSvg(rosterDir, "teacher");
  assert.ok(svg && svg.startsWith("<svg"));
  assert.ok(!/<metadata/i.test(stripRosterMetadata(svg)));
});

test("cast_roster 列目录并按中文取人", async () => {
  const tool = createCastRosterTool();
  const listed = JSON.parse((await tool.execute("t", {})).content[0].text);
  assert.equal(listed.ok, true);
  assert.ok(listed.members.length >= 10);
  const one = JSON.parse((await tool.execute("t", { id: "织女" })).content[0].text);
  assert.equal(one.ok, true);
  assert.equal(one.id, "student3");
  assert.match(one.placeholder, /data-cast-roster="student3"/);
  assert.match(one.svg, /<svg/);
});

test("injectCastRoster 填空组", () => {
  const html = injectCastRoster(
    `<svg><g data-cast-roster="thinker" transform="translate(10 10) scale(0.4)"></g></svg>`,
    rosterDir
  );
  assert.match(html, /data-cast-roster="thinker"/);
  assert.match(html, /<path|<circle|<g /);
  assert.ok(!/<metadata/i.test(html));
});

test("qa_check 手画牛郎织女仍报 cast-quality", async () => {
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

test("open-doodles 是合法 SVG 不是 JSX", () => {
  const p = path.join(defaultCastRoot(), "doodles", "open-doodles", "running.svg");
  const svg = fs.readFileSync(p, "utf8");
  assert.match(svg, /^<svg/);
  assert.equal(/fill=\{/.test(svg), false);
  assert.equal(/\bfillRule=/.test(svg), false);
  assert.match(svg, /fill="#FF5678"|fill="#000/);
});

test("cast_search 能搜到牛和龙", async () => {
  const fixture = makeCastFixture();
  const tool = createCastSearchTool({ castRoot: fixture });
  const cow = JSON.parse((await tool.execute("t", { query: "牛" })).content[0].text);
  assert.equal(cow.ok, true, JSON.stringify(cow));
  assert.ok(cow.hits.some((h: { id: string }) => /cow|ox/.test(h.id)), JSON.stringify(cow.hits));
  const dragon = JSON.parse((await tool.execute("t", { query: "dragon" })).content[0].text);
  assert.ok(dragon.hits.some((h: { id: string }) => /dragon/.test(h.id)), JSON.stringify(dragon));
});

test("cast_asset + injectCastPack 填 noto 牛", async () => {
  const fixture = makeCastFixture();
  const tool = createCastAssetTool({ castRoot: fixture });
  const r = JSON.parse((await tool.execute("t", { id: "noto:cow-face" })).content[0].text);
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.match(r.svg, /<svg/);
  const html = injectCastPack(`<svg><g data-cast-pack="noto:cow-face"></g></svg>`, fixture);
  assert.match(html, /<path|<g /);
  assert.ok(!/<g data-cast-pack="noto:cow-face"><\/g>/.test(html));
});

test("qa_check 用人物库占位不再报 cast-quality", async () => {
  const html = `<!doctype html><html><head><title>t</title></head><body>
  <style>.b{min-height:48px;font-size:16px}</style>
  <p>牛郎织女</p>
  <svg><g data-cast-roster="explorer"></g></svg>
  <div id="stage"></div><button class="b" id="btn-reset">重置</button>
  <script>function person(x,y){return '<g></g>';}</script>
  </body></html>`;
  const j = JSON.parse((await qaCheckTool.execute("t", { html })).content[0].text);
  assert.ok(!j.issues.some((i: { rule: string }) => i.rule === "cast-quality"), JSON.stringify(j.issues));
});
