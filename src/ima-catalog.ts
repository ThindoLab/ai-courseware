import fs from "node:fs";
import path from "node:path";

export type ImaKbEntry = {
  name: string;
  kb_id: string;
  base_type?: string;
  content_count?: number;
  description?: string;
  content_scope?: string;
  content_kinds?: string[];
  sample_titles?: string[];
  when_to_search?: string;
  notes?: string;
};

export type ImaCatalog = {
  synced_at: string;
  knowledge_bases: ImaKbEntry[];
};

export function catalogPaths(root: string) {
  const dir = path.join(root, "pi", "ima");
  return {
    dir,
    json: path.join(dir, "catalog.json"),
    md: path.join(dir, "知识库目录.md"),
    allowlist: path.join(dir, "allowlist.txt"),
    guide: path.join(dir, "检索指南.md"),
  };
}

export function loadCatalog(root: string): ImaCatalog | null {
  const p = catalogPaths(root).json;
  if (!fs.existsSync(p)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(p, "utf8"));
    if (!data || !Array.isArray(data.knowledge_bases)) return null;
    return data as ImaCatalog;
  } catch {
    return null;
  }
}

export function loadAllowlist(root: string): string[] {
  const p = catalogPaths(root).allowlist;
  if (!fs.existsSync(p)) return [];
  return fs
    .readFileSync(p, "utf8")
    .split(/\r?\n/)
    .map((l) => l.replace(/#.*$/, "").trim())
    .filter(Boolean);
}

export function resolveKnowledgeBase(
  root: string,
  name: string
): { ok: true; entry: ImaKbEntry } | { ok: false; error: string } {
  const catalog = loadCatalog(root);
  if (!catalog) {
    return { ok: false, error: "缺少 pi/ima/catalog.json。请先运行 npm run ima:sync" };
  }
  const q = name.trim();
  if (!q) return { ok: false, error: "请提供知识库名称（不要传内部 id）" };
  const hit = catalog.knowledge_bases.find((k) => k.name === q) ||
    catalog.knowledge_bases.find((k) => k.name.includes(q) || q.includes(k.name));
  if (!hit) {
    const names = catalog.knowledge_bases.map((k) => k.name).join("、") || "（空）";
    return { ok: false, error: `目录中没有「${q}」。现有：${names}` };
  }
  const allow = loadAllowlist(root);
  if (allow.length && !allow.includes(hit.name)) {
    return {
      ok: false,
      error: `「${hit.name}」不在 pi/ima/allowlist.txt。空白名单=不限制；要搜此库请写入库名。`,
    };
  }
  return { ok: true, entry: hit };
}

function inferScope(entry: Pick<ImaKbEntry, "description" | "sample_titles" | "content_scope">): string {
  if (entry.content_scope?.trim()) return entry.content_scope.trim();
  const bits = [entry.description || "", ...(entry.sample_titles || [])].join(" ").replace(/\s+/g, " ").trim();
  return bits.slice(0, 80) || "（同步时无简介，请手写 content_scope）";
}

export function renderCatalogMarkdown(catalog: ImaCatalog): string {
  const lines: string[] = [
    "# ima 知识库目录",
    "",
    `上次成功同步：${catalog.synced_at || "未知"}`,
    "",
    "教练先读本文，再决定要不要 `ima_search`。内部 id 不写在这里。",
    "用法见同目录 `检索指南.md`。更新：`npm run ima:sync`（或每小时定时）。",
    "",
  ];
  if (!catalog.knowledge_bases.length) {
    lines.push("（目录为空。检查凭证后重新同步。）", "");
    return lines.join("\n");
  }
  for (const kb of catalog.knowledge_bases) {
    const kinds = (kb.content_kinds || []).length ? kb.content_kinds!.join("、") : "未统计";
    const titles = (kb.sample_titles || []).length
      ? kb.sample_titles!.map((t) => `- ${t}`).join("\n")
      : "- （首页无标题）";
    lines.push(
      `## ${kb.name}`,
      "",
      `- 类型：${kb.base_type || "未知"}`,
      `- 条目大约：${kb.content_count ?? "?"}`,
      `- 简介：${(kb.description || "（无）").replace(/\n/g, " ")}`,
      `- 内容范围：${inferScope(kb)}`,
      `- 内容类型：${kinds}`,
      `- 何时搜：${kb.when_to_search || "名称/简介/范围与用户句明显相关时"}`,
      kb.notes ? `- 备注：${kb.notes}` : "",
      "",
      "首页标题样例：",
      titles,
      ""
    );
  }
  return lines.filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n") + "\n";
}

export function mergeHandFields(prev: ImaCatalog | null, next: ImaKbEntry[]): ImaKbEntry[] {
  const oldByName = new Map((prev?.knowledge_bases || []).map((k) => [k.name, k]));
  return next.map((kb) => {
    const old = oldByName.get(kb.name);
    if (!old) return kb;
    return {
      ...kb,
      content_scope: old.content_scope?.trim() ? old.content_scope : kb.content_scope,
      when_to_search: old.when_to_search?.trim() ? old.when_to_search : kb.when_to_search,
      notes: old.notes?.trim() ? old.notes : kb.notes,
    };
  });
}
