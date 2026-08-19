/**
 * 样例 HTML 版本：samples/<slug>.html 是当前版，
 * 历史冻结在 samples/versions/<slug>/vN.html。
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
export const VERSIONS_DIR = path.join(ROOT, "samples", "versions");
export const MANIFEST_PATH = path.join(VERSIONS_DIR, "manifest.json");

export function loadVersionManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) return {};
  try {
    const raw = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}

export function saveVersionManifest(data) {
  fs.mkdirSync(VERSIONS_DIR, { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(data, null, 2) + "\n");
}

export function stampHtml(html, { id, at, note, iteration }) {
  const metas = [
    `<meta name="aid-version" content="${esc(id)}">`,
    `<meta name="aid-version-at" content="${esc(at)}">`,
  ];
  if (iteration) metas.push(`<meta name="aid-iteration" content="${esc(iteration)}">`);
  if (note) metas.push(`<meta name="aid-version-note" content="${esc(note)}">`);
  const block = metas.join("\n");
  let next = String(html).replace(/\s*<meta name="aid-(?:version(?:-at|-note)?|iteration)"[^>]*>/gi, "");
  if (/<head[^>]*>/i.test(next)) return next.replace(/<head[^>]*>/i, (m) => `${m}\n${block}`);
  return `${block}\n${next}`;
}

export function readVersionId(html) {
  const m = String(html).match(/<meta\s+name="aid-version"\s+content="([^"]+)"/i);
  return m ? m[1] : "";
}

export function nextVersionId(items = []) {
  const nums = items
    .map((it) => Number(String(it.id || "").replace(/^v/i, "")))
    .filter((n) => Number.isFinite(n));
  return `v${(nums.length ? Math.max(...nums) : 0) + 1}`;
}

/** 冻结当前 samples/<slug>.html 为下一版历史（内容未变则不新增）。返回新 id 或已有 id。 */
export function snapshotCurrent(slug, { at, note, iteration } = {}) {
  const src = path.join(ROOT, "samples", `${slug}.html`);
  if (!fs.existsSync(src)) return null;
  const html = fs.readFileSync(src, "utf8");
  const man = loadVersionManifest();
  const entry = man[slug] || { current: "", items: [] };
  const items = Array.isArray(entry.items) ? entry.items : [];
  const last = items[items.length - 1];
  const lastPath = last ? path.join(ROOT, last.file) : "";
  if (lastPath && fs.existsSync(lastPath) && sameHtml(html, fs.readFileSync(lastPath, "utf8"))) {
    return last.id;
  }
  const id = nextVersionId(items);
  const stampedAt = at || new Date().toISOString().slice(0, 19);
  const stamped = stampHtml(html, { id, at: stampedAt, note: note || "快照", iteration });
  const rel = `samples/versions/${slug}/${id}.html`;
  const dest = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, stamped, "utf8");
  fs.writeFileSync(src, stamped, "utf8");
  items.push({ id, at: stampedAt, note: note || "快照", file: rel });
  man[slug] = { current: id, items };
  saveVersionManifest(man);
  return id;
}

/** 写入新当前版：先确保旧当前已入库，再落新 HTML 为 vN+1。 */
export function publishNewVersion(slug, html, { at, note, iteration } = {}) {
  const src = path.join(ROOT, "samples", `${slug}.html`);
  if (fs.existsSync(src)) snapshotCurrent(slug, { at, note: "被下一版替换前的当前稿", iteration });
  const man = loadVersionManifest();
  const entry = man[slug] || { current: "", items: [] };
  const items = Array.isArray(entry.items) ? entry.items : [];
  const id = nextVersionId(items);
  const stampedAt = at || new Date().toISOString().slice(0, 19);
  const stamped = stampHtml(html, { id, at: stampedAt, note: note || "新生成", iteration });
  const rel = `samples/versions/${slug}/${id}.html`;
  fs.mkdirSync(path.join(VERSIONS_DIR, slug), { recursive: true });
  fs.writeFileSync(path.join(ROOT, rel), stamped, "utf8");
  fs.writeFileSync(src, stamped, "utf8");
  items.push({ id, at: stampedAt, note: note || "新生成", iteration: iteration || "", file: rel });
  man[slug] = { current: id, items };
  saveVersionManifest(man);
  return id;
}

function sameHtml(a, b) {
  return stripStamp(a) === stripStamp(b);
}

function stripStamp(html) {
  return String(html).replace(/\s*<meta name="aid-(?:version(?:-at|-note)?|iteration)"[^>]*>/gi, "").trim();
}

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
