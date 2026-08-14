#!/usr/bin/env node
/**
 * HTTP 冒烟：本机 server 可拉清单与每件样例 HTML
 * 不依赖浏览器二进制；失败不装 chromium。
 * 用法：node scripts/sample-smoke-http.mjs [baseUrl]
 */
const base = process.argv[2] || "http://localhost:3000";

async function main() {
  const health = await fetch(`${base}/health`).then((r) => r.json()).catch(() => null);
  if (!health?.ok) {
    console.log("⚠️ server not up at", base, "— skip http smoke");
    process.exit(0);
  }
  const list = await fetch(`${base}/samples`).then((r) => r.json());
  if (!Array.isArray(list) || !list.length) {
    console.error("❌ /samples empty");
    process.exit(1);
  }
  let fail = 0;
  for (const s of list) {
    const url = `${base}/samples/${s.slug}.html`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error("fail", url, res.status);
      fail++;
      continue;
    }
    const html = await res.text();
    if (!/<\/html>/i.test(html) || html.length < 500) {
      console.error("thin/broken", s.slug, html.length);
      fail++;
    }
  }
  if (fail) {
    console.error(`❌ http smoke ${fail}/${list.length} failed`);
    process.exit(1);
  }
  console.log(`✅ http smoke ${list.length} samples ok @ ${base}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
