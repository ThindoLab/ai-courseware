import fs from "node:fs";
import path from "node:path";
import { Type } from "typebox";
import { defineTool } from "@earendil-works/pi-coding-agent";
import { uniquifySvgIds, ZH_OBJECT_EN } from "./icon-cast.ts";

export type RosterMember = {
  id: string;
  role: string;
  zh: string[];
  use: string;
};

export type RosterCatalog = {
  source: string;
  viewBox: string;
  members: RosterMember[];
};

export function defaultRosterDir(root?: string): string {
  return path.join(root || process.cwd(), "pi", "assets", "cast", "openmaic");
}

export function loadRosterCatalog(dir: string): RosterCatalog {
  const file = path.join(dir, "roster.json");
  const raw = JSON.parse(fs.readFileSync(file, "utf8")) as RosterCatalog;
  return raw;
}

export function listRosterIds(dir: string): string[] {
  return fs
    .readdirSync(dir)
    .filter((n) => n.endsWith(".svg"))
    .map((n) => n.replace(/\.svg$/i, ""))
    .sort();
}

export function resolveRosterId(query: string, catalog: RosterCatalog): string | null {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return null;
  const byId = catalog.members.find((m) => m.id === q);
  if (byId) return byId.id;
  for (const m of catalog.members) {
    if (m.zh.some((z) => z.toLowerCase() === q || q.includes(z.toLowerCase()) || z.toLowerCase().includes(q))) {
      return m.id;
    }
  }
  return null;
}

export function stripRosterMetadata(svg: string): string {
  return svg.replace(/<metadata\b[\s\S]*?<\/metadata>/gi, "");
}

export function readRosterSvg(dir: string, id: string): string | null {
  const safe = id.replace(/[^a-z0-9._-]+/gi, "");
  if (!safe) return null;
  const file = path.join(dir, `${safe}.svg`);
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, "utf8").trim();
  return stripRosterMetadata(raw);
}

/** 把空的 data-cast-roster 组换成库内 SVG 节点。 */
export function injectCastRoster(html: string, rosterDir: string): string {
  if (!html || !rosterDir || !fs.existsSync(rosterDir)) return html;
  let n = 0;
  return html.replace(
    /<g(\s[^>]*\bdata-cast-roster=["']([^"']+)["'][^>]*)>\s*<\/g>/gi,
    (all, attrs, id) => {
      const svg = readRosterSvg(rosterDir, String(id));
      if (!svg) return all;
      const inner = svg.replace(/^[\s\S]*?<svg\b[^>]*>/i, "").replace(/<\/svg>\s*$/i, "");
      if (!inner.trim()) return all;
      n += 1;
      return `<g${attrs}>${uniquifySvgIds(inner, `${id}-${n}`)}</g>`;
    }
  );
}

function toolError(error: string, extra: Record<string, unknown> = {}) {
  const payload = { ok: false, error, ...extra };
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
    details: payload,
    isError: true,
  };
}

function toolOk(payload: Record<string, unknown>) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
    details: payload,
  };
}

/** 闭集人物库。有名字的人用这个，不要手画，不要 cast_image。 */
export function createCastRosterTool(opts: { root?: string } = {}) {
  const dir = defaultRosterDir(opts.root);
  return defineTool({
    name: "cast_roster",
    label: "人物库",
    description:
      "OpenMAIC 闭集人物 SVG。有名字的人必须用本工具选型，禁止手画五官，禁止 cast_image。" +
      "不传 id 则返回目录。传 teacher / student1 / 老师 / 牛郎 等则返回 svg 与占位。" +
      "write 只放 <g data-cast-roster=\"id\" transform=\"translate(x y) scale(0.4)\"></g>，宿主填图。",
    parameters: Type.Object({
      id: Type.Optional(Type.String({ description: "库 id 或中文身份，如 teacher / 老师 / 牛郎" })),
    }),
    execute: async (_tid, params) => {
      if (!fs.existsSync(dir)) return toolError("人物库目录不存在", { dir });
      const catalog = loadRosterCatalog(dir);
      const q = String(params.id || "").trim();
      if (!q) {
        return toolOk({
          ok: true,
          handbook: "pi/assets/cast/openmaic/手册.md",
          members: catalog.members.map((m) => ({
            id: m.id,
            role: m.role,
            zh: m.zh,
            use: m.use,
          })),
          next: "选一个 id 再调 cast_roster({ id })。write 放 data-cast-roster 空组。",
        });
      }
      const id = resolveRosterId(q, catalog);
      if (!id) {
        return toolError(`库里没有「${q}」。先不传 id 看目录，或换最接近的人 + 道具图标。`, {
          ids: catalog.members.map((m) => m.id),
        });
      }
      const svg = readRosterSvg(dir, id);
      if (!svg) return toolError(`缺文件 ${id}.svg`, { id });
      const member = catalog.members.find((m) => m.id === id);
      return toolOk({
        ok: true,
        id,
        use: member?.use,
        bytes: Buffer.byteLength(svg, "utf8"),
        placeholder: `<g data-cast-roster="${id}" transform="translate(40 20) scale(0.4)"></g>`,
        svg,
        next: "write 只放 placeholder。同一人各幕同一 id。走动只改外层 transform。",
      });
    },
  });
}

export function defaultCastRoot(root?: string): string {
  return path.join(root || process.cwd(), "pi", "assets", "cast");
}

type CastItem = {
  id: string;
  file: string;
  pack: string;
  license?: string;
  tags?: string[];
  type?: string;
  type_zh?: string;
  name?: string;
  label?: string;
};

type CastCatalog = { items: CastItem[] };

let catalogCache: CastCatalog | null = null;

export function resetCastCatalogCache() {
  catalogCache = null;
}

export function loadCastCatalog(castRoot: string): CastCatalog {
  if (catalogCache) return catalogCache;
  const indexFile = path.join(castRoot, "index.json");
  const catalogFile = path.join(castRoot, "catalog.json");
  const file = fs.existsSync(indexFile) ? indexFile : catalogFile;
  if (!fs.existsSync(file)) return { items: [] };
  catalogCache = JSON.parse(fs.readFileSync(file, "utf8")) as CastCatalog;
  return catalogCache;
}

const PACK_PREF = ["noto", "fluent-emoji-flat", "openmaic", "open-peeps", "avataaars", "adventurer", "lorelei", "open-doodles", "game-icons", "twemoji"];

function searchTerms(query: string): string[] {
  const raw = String(query || "").trim().toLowerCase();
  const terms = new Set<string>();
  if (!raw) return [];
  terms.add(raw.replace(/\s+/g, "-"));
  for (const part of raw.split(/[\s,，、]+/)) {
    if (part) terms.add(part);
    const en = ZH_OBJECT_EN[part];
    if (en) for (const w of en.split(/\s+/)) terms.add(w.toLowerCase());
  }
  return [...terms];
}

export function searchCastCatalog(
  castRoot: string,
  query: string,
  limit = 8,
  type?: string
): CastItem[] {
  const terms = searchTerms(query);
  if (!terms.length) return [];
  const typeKey = String(type || "").trim().toLowerCase();
  const scored: { item: CastItem; score: number }[] = [];
  for (const item of loadCastCatalog(castRoot).items) {
    if (typeKey && item.type !== typeKey && item.type_zh !== typeKey && !(item.tags || []).includes(typeKey)) {
      continue;
    }
    const hay = `${item.id} ${item.label || ""} ${item.name || ""} ${item.type || ""} ${item.type_zh || ""} ${item.file} ${(item.tags || []).join(" ")}`.toLowerCase();
    let score = 0;
    for (const t of terms) {
      if (item.name === t || item.id.endsWith(`:${t}`) || (item.file || "").endsWith(`${t}.svg`)) score += 12;
      else if ((item.label || "").toLowerCase().includes(t)) score += 6;
      else if (hay.includes(t)) score += 4;
    }
    if (!score) continue;
    const pref = PACK_PREF.indexOf(item.pack);
    score += pref >= 0 ? (PACK_PREF.length - pref) * 0.2 : 0;
    scored.push({ item, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, Math.max(1, Math.min(20, limit))).map((s) => s.item);
}

export function resolveCastAssetPath(castRoot: string, id: string): string | null {
  const catalog = loadCastCatalog(castRoot);
  const hit = catalog.items.find((i) => i.id === id);
  if (hit) {
    const p = path.join(castRoot, hit.file);
    return fs.existsSync(p) ? p : null;
  }
  const [pack, ...rest] = id.split(":");
  const name = rest.join(":");
  if (!pack || !name) return null;
  const guesses = [
    path.join(castRoot, "packs", pack, `${name}.svg`),
    path.join(castRoot, "people", pack, `${name}.svg`),
    path.join(castRoot, "openmaic", `${name}.svg`),
    path.join(castRoot, "doodles", pack, `${name}.svg`),
  ];
  return guesses.find((p) => fs.existsSync(p)) || null;
}

export function injectCastPack(html: string, castRoot: string): string {
  if (!html || !castRoot || !fs.existsSync(castRoot)) return html;
  let n = 0;
  return html.replace(
    /<g(\s[^>]*\bdata-cast-pack=["']([^"']+)["'][^>]*)>\s*<\/g>/gi,
    (all, attrs, id) => {
      const file = resolveCastAssetPath(castRoot, String(id));
      if (!file) return all;
      const svg = stripRosterMetadata(fs.readFileSync(file, "utf8").trim());
      const inner = svg.replace(/^[\s\S]*?<svg\b[^>]*>/i, "").replace(/<\/svg>\s*$/i, "");
      if (!inner.trim()) return all;
      n += 1;
      return `<g${attrs}>${uniquifySvgIds(inner, `${String(id).replace(/[^a-z0-9]+/gi, "-")}-${n}`)}</g>`;
    }
  );
}

export function createCastSearchTool(opts: { root?: string } = {}) {
  const castRoot = defaultCastRoot(opts.root);
  return defineTool({
    name: "cast_search",
    label: "搜图",
    description:
      "搜本地素材库。结果带 类型/名称（如 动物/cow-face）。" +
      "query 用中文或英文：牛、老师、dragon、校车。" +
      "可选 type：animal/people/food/vehicle/school/nature/story/face/scene。" +
      "命中后 cast_asset(id) 取 SVG。测试库，不要搜皮卡丘等版权 IP。",
    parameters: Type.Object({
      query: Type.String({ description: "牛 / cow / 老师 / dragon / 校车" }),
      type: Type.Optional(Type.String({ description: "animal / people / food / vehicle / story / scene" })),
      limit: Type.Optional(Type.Number({ description: "默认 8，最多 20" })),
    }),
    execute: async (_id, params) => {
      const q = String(params.query || "").trim();
      if (!q) return toolError("query 必填");
      const hits = searchCastCatalog(castRoot, q, Number(params.limit) || 8, String(params.type || ""));
      if (!hits.length) {
        return toolError(`没有「${q}」。换英文物体词，或换 type。`);
      }
      return toolOk({
        ok: true,
        query: q,
        hits: hits.map((h) => ({
          id: h.id,
          label: h.label || `${h.type || "?"}/${h.name || h.id}`,
          type: h.type,
          type_zh: h.type_zh,
          name: h.name,
          pack: h.pack,
        })),
        next: "选 id 调 cast_asset。优先 noto:。",
      });
    },
  });
}

export function createCastAssetTool(opts: { root?: string } = {}) {
  const castRoot = defaultCastRoot(opts.root);
  return defineTool({
    name: "cast_asset",
    label: "取材 SVG",
    description:
      "按 catalog id 取出素材 SVG。write 只放 <g data-cast-pack=\"noto:cow-face\"></g>，宿主填图。",
    parameters: Type.Object({
      id: Type.String({ description: "如 noto:cow-face / open-peeps:farmer / open-doodles:running" }),
    }),
    execute: async (_id, params) => {
      const id = String(params.id || "").trim();
      if (!id) return toolError("id 必填");
      const file = resolveCastAssetPath(castRoot, id);
      if (!file) return toolError(`找不到 ${id}。先 cast_search。若 packs/ 被清了，跑 node scripts/fetch-cast-library.mjs`);
      const svg = stripRosterMetadata(fs.readFileSync(file, "utf8"));
      return toolOk({
        ok: true,
        id,
        bytes: Buffer.byteLength(svg, "utf8"),
        placeholder: `<g data-cast-pack="${id}" transform="translate(40 20) scale(0.5)"></g>`,
        svg,
        next: "write 只放 placeholder。过程动画仍用 cast_svg 改几何。",
      });
    },
  });
}
