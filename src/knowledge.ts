import fs from "node:fs";
import path from "node:path";

const KNOWLEDGE_DIR = path.resolve(import.meta.dirname, "..", "knowledge", "extracted");

export interface KnowledgeHit {
  chunk_id: string;
  title: string;
  module: string;
  subject?: string;
  grade?: number;
  source?: string;
  score: number;
  snippet: string;
}

export interface SearchResult {
  hits: KnowledgeHit[];
  strategy: string;
  query: string;
  module: string;
}

function parseFrontmatter(text: string): { meta: Record<string, string>; body: string } {
  const m = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return { meta: {}, body: text.trim() };
  const meta: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { meta, body: m[2].trim() };
}

function countOccurrences(text: string, term: string): number {
  if (!term) return 0;
  let count = 0;
  let idx = 0;
  while ((idx = text.indexOf(term, idx)) !== -1) {
    count++;
    idx += term.length;
  }
  return count;
}

/** 本地优先检索（grep 思路：关键词命中计分）。未命中返回空 hits + strategy 标记。 */
export function search(query: string, module: string, topK = 5): SearchResult {
  const dir = path.join(KNOWLEDGE_DIR, module);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    return { hits: [], strategy: "local-first(no-dir)", query, module };
  }
  const terms = query.split(/[\s,，、;；]+/).filter(Boolean);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
  const hits: KnowledgeHit[] = [];
  for (const f of files) {
    const text = fs.readFileSync(path.join(dir, f), "utf8");
    const { meta, body } = parseFrontmatter(text);
    const title = meta.title || f.replace(/\.md$/, "");
    let score = 0;
    for (const term of terms) {
      score += countOccurrences(title, term) * 5;
      score += countOccurrences(body, term) * 1;
    }
    if (score > 0) {
      const snippet = body.slice(0, 80).replace(/\s+/g, " ");
      hits.push({
        chunk_id: f.replace(/\.md$/, ""),
        title,
        module,
        subject: meta.subject,
        grade: meta.grade ? Number(meta.grade) : undefined,
        source: meta.source,
        score,
        snippet,
      });
    }
  }
  hits.sort((a, b) => b.score - a.score);
  return { hits: hits.slice(0, topK), strategy: "local-first", query, module };
}
