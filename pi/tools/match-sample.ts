import fs from "node:fs";
import path from "node:path";
import { Type } from "typebox";
import { defineTool } from "@earendil-works/pi-coding-agent";

export type SamplePortrait = {
  slug: string;
  topic: string;
  tags: string[];
  core: string;
  aliases?: string[];
};

export type MatchVerdict = "use" | "reference" | "none";

export type MatchResult = {
  verdict: MatchVerdict;
  slug?: string;
  topic?: string;
  score: number;
  reason: string;
  candidates: Array<{ slug: string; score: number }>;
};

const STOP = new Set(
  ["问题", "学习", "教具", "教学", "什么", "怎么", "如何", "测试", "数学", "英语", "科学", "练习"].map((s) =>
    s.toLowerCase()
  )
);

const TAG_HINTS: Array<{ tag: string; re: RegExp }> = [
  { tag: "safety", re: /着火|消防|油锅|敲门|陌生人|过马路|红绿灯|安全/ },
  { tag: "english", re: /there\s*be|there\s*is|there\s*are|英语|句型/i },
  { tag: "chinese", re: /古诗|反义|语文|填空/ },
  { tag: "preschool", re: /幼儿|学前|凑十|颜色|分类|积木|方位|刷牙|认时间/ },
  { tag: "math", re: /平均|鸡兔|分数|植树|相遇|周长|面积|平移|旋转|和倍|数轴|奇偶|规律/ },
  { tag: "life", re: /找零|超市|刷牙|钟表|时间/ },
  { tag: "classroom", re: /举手|借蜡笔|课堂|投票/ },
];

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[·・，,。！？!?_\-/（）()【】「」""'']/g, "");
}

export function loadPortraits(root: string): SamplePortrait[] {
  const p = path.join(root, "pi", "samples", "portraits.json");
  if (!fs.existsSync(p)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(p, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function inferTags(text: string): string[] {
  const tags = TAG_HINTS.filter((h) => h.re.test(text)).map((h) => h.tag);
  return [...new Set(tags)];
}

function tokenScore(q: string, portrait: SamplePortrait): number {
  const nq = norm(q);
  if (!nq || nq.length < 2 || STOP.has(nq)) return 0;
  const nt = norm(portrait.topic);
  const nc = norm(portrait.core);
  const aliases = (portrait.aliases || []).map(norm).filter((a) => a.length >= 2);
  if (nq === nt || aliases.includes(nq)) return 100;
  if (aliases.some((a) => nq.includes(a) && a.length >= 2)) return 92;
  if (nt.length >= 2 && (nq.includes(nt) || (nt.includes(nq) && nq.length >= 3))) return 88;
  let s = 0;
  for (const a of aliases) {
    if (a.length >= 2 && (nq.includes(a) || a.includes(nq) && nq.length >= a.length)) s = Math.max(s, 80);
  }
  // 画像关键词：取 core 里长度≥2 的片段
  const keys = (portrait.core + portrait.topic).match(/[\u4e00-\u9fa5]{2,6}|[a-z]{3,}/gi) || [];
  let hit = 0;
  for (const k of keys) {
    const nk = norm(k);
    if (nk.length >= 2 && nq.includes(nk)) hit++;
  }
  if (hit >= 2) s = Math.max(s, 70);
  else if (hit === 1 && nq.length >= 4) s = Math.max(s, 58);
  if (nc.includes(nq) && nq.length >= 4) s = Math.max(s, 75);
  return s;
}

export function matchByPortraits(text: string, portraits: SamplePortrait[]): MatchResult {
  const q = text.trim();
  const nq = norm(q);
  if (!nq || nq.length < 2 || STOP.has(nq)) {
    return { verdict: "none", score: 0, reason: "过短或泛词，不匹配精品", candidates: [] };
  }

  const tags = inferTags(q);
  const pool = tags.length ? portraits.filter((p) => p.tags.some((t) => tags.includes(t))) : portraits;

  const scored = pool
    .map((p) => ({ slug: p.slug, topic: p.topic, score: tokenScore(q, p) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const top = scored[0];
  if (!top) {
    return { verdict: "none", score: 0, reason: "预筛后无相似画像", candidates: [] };
  }
  if (top.score >= 85) {
    return {
      verdict: "use",
      slug: top.slug,
      topic: top.topic,
      score: top.score,
      reason: `画像高置信（${top.score}）建议直接交付精品`,
      candidates: scored.slice(0, 3),
    };
  }
  if (top.score >= 60) {
    return {
      verdict: "reference",
      slug: top.slug,
      topic: top.topic,
      score: top.score,
      reason: `仅作结构参考（${top.score}），须按用户主题新写`,
      candidates: scored.slice(0, 3),
    };
  }
  return {
    verdict: "none",
    score: top.score,
    reason: "相似度不足，走新写",
    candidates: scored.slice(0, 3),
  };
}

function extractAssistantText(msg: any): string {
  const parts = msg?.content;
  if (!Array.isArray(parts)) return String(msg?.text || "");
  return parts
    .filter((p: any) => p?.type === "text" && p.text)
    .map((p: any) => p.text)
    .join("\n");
}

/** 大类预筛后的短名单交给小模型比画像相似度；失败则退回计分结果 */
export async function rankPortraitsWithLlm(
  text: string,
  portraits: SamplePortrait[]
): Promise<MatchResult | null> {
  if (process.env.MATCH_SAMPLE_LLM === "0") return null;
  const tags = inferTags(text);
  let pool = tags.length ? portraits.filter((p) => p.tags.some((t) => tags.includes(t))) : portraits;
  if (!pool.length) pool = portraits;
  if (pool.length > 12) {
    pool = [...pool]
      .map((p) => ({ p, s: tokenScore(text, p) }))
      .sort((a, b) => b.s - a.s)
      .slice(0, 12)
      .map((x) => x.p);
  }
  const list = pool
    .map((p, i) => `${i + 1}. slug=${p.slug} topic=${p.topic} tags=${p.tags.join(",")} 画像=${p.core}`)
    .join("\n");
  const prompt = `你是教具案例匹配器。用户只说了一句话，请在候选短画像里判断是不是「同一知识点」。
用户句：${text}

候选：
${list}

只输出一行 JSON，不要 markdown：
{"slug":"候选之一或空","verdict":"use|reference|none","score":0到100,"reason":"十字以内"}
规则：use=几乎同一知识点才能交付精品；reference=题型相近仅供参考；none=应新写。宁可 none 不可错配。`;

  try {
    const { ModelRuntime } = await import("@earendil-works/pi-coding-agent");
    const mr = await ModelRuntime.create();
    const available = await mr.getAvailable();
    const model =
      available.find((m: any) => /flash|haiku|mini/i.test(m.id || "")) || available[0];
    if (!model) return null;
    const msg = await Promise.race([
      mr.completeSimple(model, {
        messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
      } as any),
      new Promise((_, rej) => setTimeout(() => rej(new Error("match llm timeout")), 15000)),
    ]);
    const raw = extractAssistantText(msg);
    const json = raw.match(/\{[\s\S]*\}/)?.[0];
    if (!json) return null;
    const parsed = JSON.parse(json) as { slug?: string; verdict?: MatchVerdict; score?: number; reason?: string };
    const slug = String(parsed.slug || "");
    const inPool = pool.find((p) => p.slug === slug);
    let verdict: MatchVerdict = parsed.verdict === "use" || parsed.verdict === "reference" || parsed.verdict === "none"
      ? parsed.verdict
      : "none";
    if (verdict !== "none" && !inPool) verdict = "none";
    const score = Math.max(0, Math.min(100, Number(parsed.score) || 0));
    return {
      verdict,
      slug: inPool ? inPool.slug : undefined,
      topic: inPool?.topic,
      score,
      reason: `llm:${parsed.reason || verdict}`,
      candidates: pool.slice(0, 3).map((p) => ({ slug: p.slug, score: p.slug === slug ? score : 0 })),
    };
  } catch {
    return null;
  }
}

export async function matchSample(text: string, portraits: SamplePortrait[]): Promise<MatchResult> {
  const lexical = matchByPortraits(text, portraits);
  // 别名/exact 已足够，不必再花一次模型
  if (lexical.verdict === "use" && lexical.score >= 92) return lexical;
  const llm = await rankPortraitsWithLlm(text, portraits);
  if (!llm) return lexical;
  // 模型说 use 但计分为 0：仍拒绝，防止幻觉 slug
  if (llm.verdict === "use" && lexical.score < 40 && llm.score < 80) {
    return { ...llm, verdict: "reference", reason: `${llm.reason}（计分偏低，降为参考）` };
  }
  return llm;
}

export function createMatchSampleTool(root: string) {
  return defineTool({
    name: "match_sample",
    label: "案例画像匹配",
    description:
      "用用户原句匹配精品短画像。先按大类标签缩小范围，再比相似度（计分 + 小模型）。" +
      "返回 verdict: use（可交付精品）/ reference（只参考）/ none（新写）。禁止把无关精品交给用户。",
    parameters: Type.Object({
      text: Type.String({ description: "用户原句 / 知识点" }),
    }),
    execute: async (_id, params) => {
      const portraits = loadPortraits(root);
      const res = await matchSample(String((params as { text?: string }).text || ""), portraits);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(res, null, 2) }],
        details: res,
      };
    },
  });
}
