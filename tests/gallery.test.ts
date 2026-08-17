import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { listGallery, publishCreatedAid, resolveSampleFile } from "../src/gallery.ts";

const madeDir = path.resolve(import.meta.dirname, "../samples/made");

test("publishCreatedAid 写入 made 并排在清单最前", () => {
  const item = publishCreatedAid({
    html: "<!doctype html><title>测</title><p>ok</p>",
    topic: "厨房着火怎么办",
    type: "branch-story",
    audience: { ageLabel: "5–9 岁", ageBand: "5-9", scenes: ["家庭"] },
  });
  assert.match(item.slug, /^made-\d{8}T\d{9}$/);
  assert.equal(item.tier, "created");
  assert.equal(item.category, "safety");
  assert.equal(item.age, "5-9");
  const file = resolveSampleFile(`${item.slug}.html`);
  assert.ok(file && fs.existsSync(file));
  const list = listGallery();
  assert.equal(list[0].slug, item.slug);
  assert.ok(list.some((s) => s.slug === "chicken-rabbit"));
  fs.unlinkSync(file);
  const man = path.join(madeDir, "manifest.json");
  const rest = JSON.parse(fs.readFileSync(man, "utf8")).filter((x: { slug: string }) => x.slug !== item.slug);
  fs.writeFileSync(man, JSON.stringify(rest, null, 2) + "\n");
});
