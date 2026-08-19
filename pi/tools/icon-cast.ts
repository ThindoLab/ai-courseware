import fs from "node:fs";
import path from "node:path";
import { Type } from "typebox";
import { defineTool } from "@earendil-works/pi-coding-agent";

export const ICONIFY_ORIGIN = "https://api.iconify.design";
export const DICEBEAR_ORIGIN = "https://api.dicebear.com";
const UA = "ai-courseware-sideproject/1.0 (icon-cast)";
const DEFAULT_PREFIXES = "noto,lucide,ph,tabler,game-icons";
const CJK = /[\u3400-\u9fff]/;

/** 中文物体词 → 英文物体词。Iconify 搜索不认中文。 */
export const ZH_OBJECT_EN: Record<string, string> = {
  喜鹊: "bird swallow",
  鹊: "bird swallow",
  鸟: "bird",
  牛: "cow",
  老牛: "cow",
  衣服: "shirt clothes",
  衣: "shirt",
  桥: "bridge",
  月: "moon",
  月亮: "moon",
  人: "person",
  男孩: "boy",
  女孩: "girl",
  猫: "cat",
  狗: "dog",
  兔: "rabbit",
  兔子: "rabbit",
  龙: "dragon",
  独角兽: "unicorn",
  苹果: "apple",
  汽车: "car",
  校车: "bus",
  公交: "bus",
  城堡: "castle",
  王冠: "crown",
};

export type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export type IconCastOpts = {
  fetch?: FetchLike;
  timeoutMs?: number;
  persistDir?: string;
};

export function persistCastSvg(dir: string | undefined, name: string, svg: string): string | undefined {
  if (!dir) return undefined;
  fs.mkdirSync(dir, { recursive: true });
  const safe = name.replace(/[^a-z0-9._-]+/gi, "_");
  const file = path.join(dir, `${safe}.svg`);
  fs.writeFileSync(file, svg.trim() + "\n", "utf8");
  return file;
}

export function uniquifySvgIds(inner: string, suffix: string): string {
  const ids = [...inner.matchAll(/\bid=["']([^"']+)["']/gi)].map((m) => m[1]);
  let out = inner;
  for (const id of [...new Set(ids)]) {
    if (!id) continue;
    const nu = `${id}-${suffix}`;
    out = out.split(`id="${id}"`).join(`id="${nu}"`);
    out = out.split(`id='${id}'`).join(`id='${nu}'`);
    out = out.split(`url(#${id})`).join(`url(#${nu})`);
  }
  return out;
}

/** 把 data-cast 占位（空或已填）换成落盘 SVG 内部节点，并打唯一 id，避免多枚 Peeps 抢同一个 mask。 */
export function injectCastPlaceholders(html: string, castDir: string): string {
  if (!html || !castDir || !fs.existsSync(castDir)) return html;
  let n = 0;
  return html.replace(/<g(\s[^>]*\bdata-cast=["']([^"']+)["'][^>]*)>\s*<\/g>/gi, (all, attrs, seed) => {
    const file = path.join(castDir, `${String(seed).replace(/[^a-z0-9._-]+/gi, "_")}.svg`);
    if (!fs.existsSync(file)) return all;
    const raw = fs.readFileSync(file, "utf8").trim();
    const inner = raw.replace(/^[\s\S]*?<svg\b[^>]*>/i, "").replace(/<\/svg>\s*$/i, "");
    if (!inner.trim()) return all;
    n += 1;
    return `<g${attrs}>${uniquifySvgIds(inner, `${seed}-${n}`)}</g>`;
  });
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

export function expandIconQuery(raw: string): { query: string; from_zh: string[] } {
  const q = raw.trim();
  const keys = Object.keys(ZH_OBJECT_EN).sort((a, b) => b.length - a.length);
  const used = new Set<string>();
  const from_zh: string[] = [];
  for (const zh of keys) {
    if (!q.includes(zh)) continue;
    if ([...used].some((u) => u.includes(zh))) continue;
    used.add(zh);
    const en = ZH_OBJECT_EN[zh];
    if (en && !from_zh.includes(en)) from_zh.push(en);
  }
  if (from_zh.length) return { query: from_zh[0].split(/\s+/)[0], from_zh };
  return { query: q, from_zh: [] };
}

export function parseIconId(id: string): { prefix: string; name: string } | null {
  const t = id.trim().replace(/^iconify:/, "");
  const m = t.match(/^([a-z0-9-]+)[:/]([a-z0-9-]+)$/i);
  if (!m) return null;
  return { prefix: m[1], name: m[2] };
}

export function svgLooksSafe(svg: string): { ok: true } | { ok: false; error: string } {
  const body = svg.trim();
  if (!body.startsWith("<svg")) return { ok: false, error: "正文不是 <svg>" };
  if (/<script[\s>]/i.test(body)) return { ok: false, error: "SVG 含 script，丢弃" };
  if (/\s(?:href|xlink:href)\s*=\s*["']https?:/i.test(body)) {
    return { ok: false, error: "SVG 含外链，丢弃（成品必须离线）" };
  }
  if (/<image[\s>]/i.test(body)) return { ok: false, error: "SVG 含 <image>，丢弃" };
  return { ok: true };
}

async function fetchText(
  doFetch: FetchLike,
  url: string,
  timeoutMs: number
): Promise<{ status: number; text: string }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await doFetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "*/*", "User-Agent": UA },
    });
    const text = await res.text();
    return { status: res.status, text };
  } finally {
    clearTimeout(timer);
  }
}

export function createIconSearchTool(opts: IconCastOpts = {}) {
  const doFetch = opts.fetch ?? fetch;
  const timeoutMs = opts.timeoutMs ?? 15000;
  return defineTool({
    name: "icon_search",
    label: "搜开源图标",
    description:
      "在 Iconify 公开接口搜可内联的开源 SVG 图标（免注册）。query 用英文物体名词，一次一个最好（cow / bird / shirt）。" +
      "多个词会拆开逐个搜再合并（接口把空格当 AND，magpie bird 会空）。中文几乎无结果，工具会译常见物体词。" +
      "返回 id（如 noto:cow-face）和套件许可。下一步调 icon_svg，必须把 svg 贴进 HTML。" +
      "禁止把 api.iconify.design 写进教具。不要搜抽象词。本场建议 ≤6 次。",
    parameters: Type.Object({
      query: Type.String({ description: "英文物体词，如 cow / bird / shirt" }),
      prefixes: Type.Optional(
        Type.String({
          description: `限定套件，逗号分隔。默认 ${DEFAULT_PREFIXES}`,
        })
      ),
      limit: Type.Optional(Type.Number({ description: "返回条数，默认 8，最大 16（接口本身常忽略 limit，由本工具截断）" })),
    }),
    execute: async (_id, params) => {
      const raw = String(params.query || "").trim();
      if (!raw) return toolError("query 为空");
      const expanded = expandIconQuery(raw);
      const used = expanded.query;
      if (CJK.test(used) && !expanded.from_zh.length) {
        return toolError("Iconify 不认中文，请改用英文物体名词", {
          query: raw,
          hint: "例：cow bird shirt moon bridge person",
        });
      }
      const prefixes = String(params.prefixes || DEFAULT_PREFIXES).trim() || DEFAULT_PREFIXES;
      const limit = Math.min(16, Math.max(1, Number(params.limit) || 8));
      const terms = used.split(/\s+/).filter(Boolean);
      try {
        type Hit = {
          id: string;
          prefix: string;
          name: string;
          collection: string;
          license: string;
        };
        const hits: Hit[] = [];
        const seen = new Set<string>();
        let total = 0;
        for (const term of terms) {
          const url = new URL("/search", ICONIFY_ORIGIN);
          url.searchParams.set("query", term);
          url.searchParams.set("prefixes", prefixes);
          url.searchParams.set("limit", String(limit));
          const { status, text } = await fetchText(doFetch, url.toString(), timeoutMs);
          if (status !== 200) return toolError(`Iconify 搜索 HTTP ${status}`, { query: term });
          const data = JSON.parse(text) as {
            icons?: string[];
            total?: number;
            collections?: Record<string, { name?: string; license?: { title?: string; spdx?: string } }>;
          };
          const icons = Array.isArray(data.icons) ? data.icons : [];
          total += Number(data.total) || icons.length;
          const cols = data.collections || {};
          for (const id of icons) {
            if (seen.has(id)) continue;
            seen.add(id);
            const parsed = parseIconId(id);
            const col = parsed ? cols[parsed.prefix] : undefined;
            hits.push({
              id,
              prefix: parsed?.prefix || "",
              name: parsed?.name || "",
              collection: col?.name || parsed?.prefix || "",
              license: col?.license?.spdx || col?.license?.title || "",
            });
            if (hits.length >= limit) break;
          }
          if (hits.length >= limit) break;
        }
        return toolOk({
          ok: true,
          query: raw,
          searched: terms.join(" | "),
          from_zh: expanded.from_zh,
          prefixes,
          total,
          returned: hits.length,
          hits,
          next: "选一枚 id 调 icon_svg。把返回的 svg 内联进 HTML，禁止写 Iconify URL。",
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return toolError(msg, { query: used, hint: "搜不到就自写 SVG 函数，不要编土豆形角色" });
      }
    },
  });
}

export function createIconSvgTool(opts: IconCastOpts = {}) {
  const doFetch = opts.fetch ?? fetch;
  const timeoutMs = opts.timeoutMs ?? 15000;
  return defineTool({
    name: "icon_svg",
    label: "拉图标 SVG",
    description:
      "按 Iconify id 拉一枚 SVG 源码（免注册）。id 形如 noto:cow-face 或 lucide/shirt。" +
      "把返回的 svg 字段原样内联进教具。禁止把下载 URL 写进 HTML。" +
      "含 script / 外链 / <image> 的会拒绝。单枚建议 <20KB。",
    parameters: Type.Object({
      id: Type.String({ description: "noto:cow-face 或 noto/cow-face" }),
      height: Type.Optional(Type.Number({ description: "像素高，默认 64" })),
    }),
    execute: async (_id, params) => {
      const parsed = parseIconId(String(params.id || ""));
      if (!parsed) return toolError("id 须为 prefix:name，如 noto:cow-face");
      const height = Math.min(256, Math.max(16, Number(params.height) || 64));
      const url = `${ICONIFY_ORIGIN}/${parsed.prefix}/${parsed.name}.svg?height=${height}`;
      try {
        const { status, text } = await fetchText(doFetch, url, timeoutMs);
        if (status === 404) {
          return toolError("没有这枚图标", { id: `${parsed.prefix}:${parsed.name}` });
        }
        if (status !== 200) return toolError(`Iconify SVG HTTP ${status}`, { id: `${parsed.prefix}:${parsed.name}` });
        const safe = svgLooksSafe(text);
        if (!safe.ok) return toolError(safe.error, { id: `${parsed.prefix}:${parsed.name}` });
        const bytes = new TextEncoder().encode(text).length;
        const file = persistCastSvg(opts.persistDir, `${parsed.prefix}-${parsed.name}`, text);
        return toolOk({
          ok: true,
          id: `${parsed.prefix}:${parsed.name}`,
          bytes,
          too_big: bytes > 30_000,
          file: file || "",
          svg: text.trim(),
          next: "把 svg 内联进 HTML。可改 fill / transform。不要保留任何 Iconify 域名。",
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return toolError(msg, { id: `${parsed.prefix}:${parsed.name}` });
      }
    },
  });
}

export function createDicebearSvgTool(opts: IconCastOpts = {}) {
  const doFetch = opts.fetch ?? fetch;
  const timeoutMs = opts.timeoutMs ?? 15000;
  return defineTool({
    name: "dicebear_svg",
    label: "拼人 SVG",
    description:
      "用 DiceBear Open Peeps 按 seed 出人物。SVG 会落到 output/cast/{seed}.svg。" +
      "write 里只写空占位 <g data-cast=\"seed\" transform=\"translate(x,y) scale(s)\"></g>，不要把整段 svg 塞进 write（会超 token）。" +
      "宿主写完后会把文件填进占位。禁止 api.dicebear.com 进教具。动物改 icon_search。",
    parameters: Type.Object({
      seed: Type.String({ description: "稳定种子，如 niulang / child-a" }),
      flip: Type.Optional(Type.Boolean({ description: "水平翻转" })),
    }),
    execute: async (_id, params) => {
      const seed = String(params.seed || "").trim();
      if (!seed) return toolError("seed 为空");
      if (!/^[a-zA-Z0-9._-]{1,64}$/.test(seed)) {
        return toolError("seed 只允许字母数字 . _ -，最长 64");
      }
      const url = new URL("/9.x/open-peeps/svg", DICEBEAR_ORIGIN);
      url.searchParams.set("seed", seed);
      if (params.flip === true) url.searchParams.set("flip", "true");
      try {
        const { status, text } = await fetchText(doFetch, url.toString(), timeoutMs);
        if (status !== 200) return toolError(`DiceBear HTTP ${status}`, { seed });
        const safe = svgLooksSafe(text);
        if (!safe.ok) return toolError(safe.error, { seed });
        const bytes = new TextEncoder().encode(text).length;
        const file = persistCastSvg(opts.persistDir, seed, text);
        return toolOk({
          ok: true,
          style: "open-peeps",
          seed,
          bytes,
          too_big: bytes > 30_000,
          file: file || "",
          placeholder: `<g data-cast="${seed}" transform="translate(80,40) scale(0.22)"></g>`,
          preview: text.trim().slice(0, 120),
          license: "Open Peeps CC0；DiceBear 公网 API 非商用免费",
          next:
            "write 时只放 placeholder（data-cast=这个 seed）。禁止另画 bean()。不要把整段 svg 抄进 write。",
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return toolError(msg, { seed });
      }
    },
  });
}
