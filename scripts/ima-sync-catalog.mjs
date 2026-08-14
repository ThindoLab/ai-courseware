#!/usr/bin/env node
/**
 * 从 ima 拉知识库介绍，写出 pi/ima/catalog.json 与 知识库目录.md
 * 失败时不覆盖旧目录。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { imaPost, loadImaCredentials, MEDIA_KIND } from "../src/ima-client.ts";
import {
  catalogPaths,
  loadCatalog,
  mergeHandFields,
  renderCatalogMarkdown,
} from "../src/ima-catalog.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SAMPLE_LIMIT = 8;

function pickKb(raw) {
  return {
    kb_id: String(raw.kb_id || raw.id || ""),
    name: String(raw.kb_name || raw.name || ""),
    base_type: raw.base_type || raw.type || "",
    content_count: Number(raw.content_count ?? raw.contentCount ?? 0),
    description: String(raw.description || ""),
  };
}

async function listAllBases(creds) {
  const out = [];
  let cursor = "";
  for (let i = 0; i < 20; i++) {
    const data = await imaPost(
      "openapi/wiki/v1/search_knowledge_base",
      { query: "", cursor, limit: 20 },
      creds
    );
    const list = data.info_list || data.list || [];
    for (const row of list) out.push(pickKb(row));
    if (data.is_end || !data.next_cursor) break;
    cursor = data.next_cursor;
  }
  return out.filter((b) => b.kb_id && b.name);
}

async function enrichBase(base, creds) {
  let description = base.description;
  try {
    const detail = await imaPost("openapi/wiki/v1/get_knowledge_base", { ids: [base.kb_id] }, creds);
    const infos = detail.infos || detail;
    const info = infos[base.kb_id] || Object.values(infos || {})[0];
    if (info) {
      description = info.description || description;
      if (info.name && !base.name) base.name = info.name;
    }
  } catch {
    /* keep list fields */
  }

  const sample_titles = [];
  const kindCount = {};
  try {
    const list = await imaPost(
      "openapi/wiki/v1/get_knowledge_list",
      { knowledge_base_id: base.kb_id, cursor: "", limit: SAMPLE_LIMIT },
      creds
    );
    const items = list.knowledge_list || list.info_list || [];
    for (const it of items) {
      const title = it.title || it.name;
      if (title) sample_titles.push(String(title));
      const mt = Number(it.media_type);
      if (Number.isFinite(mt)) {
        const k = MEDIA_KIND[mt] || `类型${mt}`;
        kindCount[k] = (kindCount[k] || 0) + 1;
      }
    }
  } catch {
    /* titles optional */
  }

  const content_kinds = Object.keys(kindCount);
  const content_scope = [description, ...sample_titles].filter(Boolean).join(" ").replace(/\s+/g, " ").slice(0, 80);

  return {
    name: base.name,
    kb_id: base.kb_id,
    base_type: base.base_type,
    content_count: base.content_count,
    description,
    content_scope,
    content_kinds,
    sample_titles,
    when_to_search: "",
    notes: "",
  };
}

async function main() {
  const paths = catalogPaths(ROOT);
  fs.mkdirSync(paths.dir, { recursive: true });
  const prev = loadCatalog(ROOT);

  let creds;
  try {
    creds = loadImaCredentials();
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }

  let bases;
  try {
    bases = await listAllBases(creds);
  } catch (e) {
    console.error("同步失败，保留旧目录：", e.message);
    process.exit(1);
  }

  const next = [];
  for (const b of bases) {
    try {
      next.push(await enrichBase(b, creds));
    } catch (e) {
      next.push({
        name: b.name,
        kb_id: b.kb_id,
        base_type: b.base_type,
        content_count: b.content_count,
        description: b.description,
        sample_titles: [],
        content_kinds: [],
        when_to_search: "",
        notes: "",
      });
      console.error("补全失败，仅保留列表字段：", b.name, e.message);
    }
  }

  const merged = mergeHandFields(prev, next);
  const catalog = { synced_at: new Date().toISOString(), knowledge_bases: merged };
  const tmpJson = paths.json + ".tmp";
  const tmpMd = paths.md + ".tmp";
  fs.writeFileSync(tmpJson, JSON.stringify(catalog, null, 2) + "\n");
  fs.writeFileSync(tmpMd, renderCatalogMarkdown(catalog));
  fs.renameSync(tmpJson, paths.json);
  fs.renameSync(tmpMd, paths.md);
  console.log(`已同步 ${merged.length} 座知识库 → ${path.relative(ROOT, paths.md)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
