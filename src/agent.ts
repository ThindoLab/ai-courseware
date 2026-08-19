import fs from "node:fs";
import path from "node:path";
import {
  createAgentSession,
  ModelRuntime,
  DefaultResourceLoader,
  SessionManager,
  getAgentDir,
} from "@earendil-works/pi-coding-agent";
import { createRequire } from "node:module";
import { isTemplateType, type TemplateType } from "./inject.ts";
import { loadSkills, typeByName, type SkillDef } from "./skills-loader.ts";
import { inline } from "./inline.ts";
import { collectScriptSyntaxIssues } from "./tools.ts";
import { injectCastPlaceholders } from "../pi/tools/icon-cast.ts";
import { injectCastRoster, injectCastPack } from "../pi/tools/cast-roster.ts";
import { createInjectedTools, INJECTED_TOOL_NAMES } from "../pi/tools/index.ts";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT_DIR = path.join(ROOT, "output");

/** 读文件，不存在返回空串（不报错，便于迭代时部分文件缺失）。 */
function readIfExists(p: string): string {
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
}

/**
 * 受众与场景推断（中幼儿 / 家庭 / 教室 / 培训）。
 * 默认偏 7–9 岁家庭+教室；关键词降到 3–6 或升到 10–12。
 */
export type AudienceProfile = {
  ageBand: "3-6" | "7-9" | "10-12";
  ageLabel: string;
  scenes: string[];
  touchMin: number;
  bodyFont: number;
  titleFont: number;
  styleNote: string;
};

export function inferAudience(topic: string, module: string): AudienceProfile {
  const t = `${topic} ${module}`;
  let ageBand: AudienceProfile["ageBand"] = "7-9";
  if (
    /幼儿|学前|幼儿园|中班|大班|小班|3-?6|凑十|颜色|分类|积木|比长短|认时间|上下左右|刷牙|过马路|敲门|借蜡笔|手掌|彩灯|十框|小熊|小猪/.test(
      t
    )
  ) {
    ageBand = "3-6";
  } else if (/初中|方程|证明|约分|通分|勾股|函数|10-?12|六年级|五年级|竞赛/.test(t)) {
    ageBand = "10-12";
  } else if (/一年级|二年级|三年级|7-?9|小学低|启蒙/.test(t)) {
    ageBand = "7-9";
  }

  const scenes: string[] = [];
  if (/家庭|家长|辅导|亲子|周末|作业/.test(t)) scenes.push("家庭");
  if (/教室|课堂|白板|班级|举手|上课/.test(t)) scenes.push("教室");
  if (/培训|机构|补习|兴趣班|夏令营/.test(t)) scenes.push("培训");
  if (/幼儿|学前|中班|大班/.test(t)) scenes.push("中幼儿");
  // 默认覆盖主战场：家庭+教室（培训可复用同一 HTML）
  if (!scenes.length) {
    if (ageBand === "3-6") scenes.push("中幼儿", "家庭");
    else scenes.push("家庭", "教室");
  }

  if (ageBand === "3-6") {
    return {
      ageBand,
      ageLabel: "3–6 岁",
      scenes,
      touchMin: 64,
      bodyFont: 24,
      titleFont: 28,
      styleNote:
        "中幼儿+家庭：角色帮助叙事（小熊/小兔）、每屏一任务、少字大图、点选优先、无公式术语堆砌",
    };
  }
  if (ageBand === "10-12") {
    return {
      ageBand,
      ageLabel: "10–12 岁",
      scenes,
      touchMin: 44,
      bodyFont: 18,
      titleFont: 24,
      styleNote: "教室+培训：可多表征对比，公式须有图桥接，鼓励「为什么」解释",
    };
  }
  return {
    ageBand,
    ageLabel: "7–9 岁",
    scenes,
    touchMin: 52,
    bodyFont: 20,
    titleFont: 26,
    styleNote: "家庭+教室：2–4 步操作到规则，滑块配 ±，口语先于术语",
  };
}

/** 默认 type 匹配：skillId 优先查注册表 type；否则关键词；否则 param-visual。 */
export function resolveType(topic: string, _module: string, skillId?: string, registry: SkillDef[] = []): TemplateType {
  if (skillId) {
    const t = typeByName(registry, skillId);
    if (t && isTemplateType(t)) return t;
    if (/branch|story|安全|童话/.test(skillId)) return "branch-story";
    if (/drag|slot|句型|词/.test(skillId)) return "drag-slot";
    return "param-visual";
  }
  if (/句型|sentence|句|词|拼音|there\s*be|时态|单复数|反义词|古诗/.test(topic)) return "drag-slot";
  if (/故事|童话|安全|着火|消防|逃生|寓言|陌生人|过马路|霸凌|溺水|求助/.test(topic))
    return "branch-story";
  return "param-visual";
}

export interface CreateResult {
  ok: boolean;
  type: TemplateType;
  model?: string;
  out?: string;
  html?: string;
  report?: Record<string, unknown>;
  error?: string;
  toolCalls: string[];
  /** 命中 samples/ 精品库时为 true，内容与样例库一致 */
  fromSample?: boolean;
  sampleSlug?: string;
}

/** 生成后轻量受众质检（不阻断返回，写入 report 供前端展示） */
export function scoreAudienceQuality(
  html: string,
  aud: AudienceProfile
): { score: number; checks: Record<string, boolean>; notes: string[] } {
  const checks: Record<string, boolean> = {
    hasTitle: /<title[^>]*>[\s\S]*?<\/title>/i.test(html),
    hasAgeBadge: /岁|年龄|3–6|3-6|7–9|7-9|10–12|10-12/.test(html),
    hasReset: /重置|reset|↻|重新开始/i.test(html),
    hasThinking: /我怎么想|thinking/i.test(html),
    hasSay: /我会说|btnSay|btn-say/i.test(html),
    hasReducedMotion: /prefers-reduced-motion|reduce-motion|静态模式/i.test(html),
    hasVisual: /<svg|emoji|🍎|🐻|🐰|⭐|💧|🔥|🧊/i.test(html) || /[\u{1F300}-\u{1FAFF}]/u.test(html),
    hasInteraction: /input|button|range|slot|drag|onclick|addEventListener/i.test(html),
    noExternal: !/(?:src|href)=["']https?:\/\//i.test(html.replace(/xmlns=["'][^"']+["']/g, "")),
    touchHint: new RegExp(`min-height\\s*:\\s*(\\d+)`).test(html),
  };
  const notes: string[] = [];
  // 触控：找最小 min-height
  let minTouch = Infinity;
  const re = /min-height\s*:\s*(\d+(?:\.\d+)?)\s*px/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) minTouch = Math.min(minTouch, parseFloat(m[1]));
  if (minTouch !== Infinity && minTouch < aud.touchMin) {
    checks.touchOk = false;
    notes.push(`触控 min-height 最小 ${minTouch}px < 受众要求 ${aud.touchMin}px`);
  } else {
    checks.touchOk = minTouch === Infinity ? false : true;
    if (minTouch === Infinity) notes.push("未检测到 min-height，建议为按钮写明触控尺寸");
  }
  let minFont = Infinity;
  const fre = /font-size\s*:\s*(\d+(?:\.\d+)?)\s*px/gi;
  while ((m = fre.exec(html))) minFont = Math.min(minFont, parseFloat(m[1]));
  // 允许小字标注，但 body/主文字应接近 bodyFont；只对明显过小告警
  if (minFont !== Infinity && minFont < 14) {
    notes.push(`存在过小字号 ${minFont}px`);
  }
  if (!checks.hasThinking) notes.push("缺「我怎么想」");
  if (!checks.hasSay) notes.push("缺「我会说」");
  if (!checks.hasVisual) notes.push("缺角色/emoji/SVG 形象元素");
  if (!checks.hasAgeBadge) notes.push("标题区建议显示年龄徽章");

  const keys = Object.keys(checks);
  const pass = keys.filter((k) => checks[k]).length;
  const score = Math.round((pass / keys.length) * 100);
  return { score, checks, notes };
}

/**
 * 选择会真正调用 write 工具的模型。
 * 实测：anthropic/claude-fable-5 静默不调工具 → 永远写不出 HTML；
 * deepseek-v4-flash / haiku / sonnet 可正常 write。
 * 优先：AGENT_MODEL / GMNCODE_MODEL → 已知能调工具的模型 → provider 顺序。
 */
export function pickAgentModel(available: any[]): any | null {
  if (!available?.length) return null;
  const envModel = process.env.AGENT_MODEL || process.env.GMNCODE_MODEL;
  if (envModel) {
    const hits = available.filter(
      (m: any) => m.id === envModel || `${m.provider}/${m.id}` === envModel
    );
    const hit =
      hits.find((m: any) => `${m.provider}/${m.id}` === envModel) ||
      hits.find((m: any) => m.provider === "bai") ||
      hits.find((m: any) => m.provider === "ark") ||
      hits[0];
    if (hit) return hit;
    console.error(`[create] 未找到模型 ${envModel}，回退自动优选`);
  }

  // 明确禁用：实测不调工具或经常空转
  const blocked = /(fable|codex-auto-review|spark)/i;
  const usable = available.filter((m: any) => !blocked.test(m.id || ""));

  // id 关键词优先（越靠前越好）。
  // 同名 deepseek-v4-flash：bai（已测通）> ark 套餐 > 官方 api.deepseek.com（常 402）。
  const idPrefer = [
    /deepseek-v4-flash/i,
    /deepseek-v4-pro/i,
    /deepseek/i,
    /claude-haiku/i,
    /claude-sonnet-4-5/i,
    /claude-sonnet/i,
    /grok-4\.5/i,
    /grok-4/i,
    /gpt-5\.5/i,
    /gpt-5\.4-mini/i,
    /gpt-5/i,
  ];
  for (const re of idPrefer) {
    const baiHit = usable.find((x: any) => x.provider === "bai" && re.test(x.id || ""));
    if (baiHit) return baiHit;
    const arkHit = usable.find((x: any) => x.provider === "ark" && re.test(x.id || ""));
    if (arkHit) return arkHit;
    const m = usable.find((x: any) => re.test(x.id || ""));
    if (m) return m;
  }

  // provider 顺序
  const providers = ["bai", "ark", "deepseek", "anthropic", "xai", "liangrekui", "gmncode", "minimax-cn"];
  for (const p of providers) {
    const m = usable.find((x: any) => x.provider === p);
    if (m) return m;
  }
  return usable[0] || available[0] || null;
}

/** 从 agent 会话消息里捞完整 HTML（模型有时只在文本里输出而不 write） */
function extractHtmlFromSession(session: any): string | null {
  try {
    const messages: any[] =
      session?.messages ||
      session?.agent?.state?.messages ||
      session?.agent?.messages ||
      [];
    const texts: string[] = [];
    for (const msg of messages) {
      if (msg?.role !== "assistant") continue;
      const content = msg.content;
      if (typeof content === "string") texts.push(content);
      else if (Array.isArray(content)) {
        for (const part of content) {
          if (typeof part === "string") texts.push(part);
          else if (part?.type === "text" && part.text) texts.push(part.text);
        }
      }
    }
    const blob = texts.join("\n");
    const m =
      blob.match(/<!doctype\s+html[\s\S]*?<\/html>/i) ||
      blob.match(/<html[\s\S]*?<\/html>/i);
    if (m && m[0].length > 500) return m[0];
  } catch {
    /* ignore */
  }
  return null;
}

export type AgentTraceEvent = {
  at: number;
  type: "info" | "tool_start" | "tool_end" | "done";
  message: string;
  tool?: string;
  ok?: boolean;
};

const TOOL_LABEL: Record<string, string> = {
  match_sample: "匹配精品",
  use_sample: "交付精品",
  write: "写出 HTML",
  read: "读文件",
  qa_check: "质检",
  knowledge_search: "本地知识",
  ima_search: "ima 检索",
  icon_search: "搜图标",
  icon_svg: "拉图标 SVG",
  dicebear_svg: "拼人 SVG",
  cast_roster: "人物库",
  cast_search: "搜图",
  cast_asset: "取材",
  cast_icon: "档1图标",
  cast_svg: "档3代码SVG",
  web_search: "联网搜索",
};

function shortPath(p: string): string {
  const n = String(p || "").replace(/\\/g, "/");
  if (!n) return "";
  const root = ROOT.replace(/\\/g, "/");
  if (n.startsWith(root)) return n.slice(root.length).replace(/^\//, "");
  for (const k of ["pi/", "samples/", "output/", "docs/", "skills/", "knowledge/"]) {
    const i = n.indexOf(k);
    if (i >= 0) return n.slice(i);
  }
  return n.split("/").slice(-3).join("/");
}

function clip(s: string, n = 36): string {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
}

function parseJsonish(txt: string): Record<string, unknown> | null {
  if (!txt) return null;
  try {
    const v = JSON.parse(txt);
    return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function toolStartLine(name: string, args: Record<string, unknown> | undefined): string {
  const label = TOOL_LABEL[name] || name;
  if (!args) return `${label}…`;
  if (name === "read") {
    const p = shortPath(String(args.path || args.filePath || args.file || ""));
    return p ? `读文件：${p}` : "读文件…";
  }
  if (name === "ima_search") {
    const kb = clip(String(args.knowledge_base || ""), 16);
    const q = clip(String(args.query || ""), 28);
    return kb || q ? `ima 检索：${[kb, q].filter(Boolean).join(" · ")}` : "ima 检索…";
  }
  if (name === "knowledge_search") {
    const q = clip(String(args.query || ""), 28);
    return q ? `本地知识：${q}` : "本地知识…";
  }
  if (name === "web_search") {
    const q = clip(String(args.query || ""), 28);
    return q ? `联网搜索：${q}` : "联网搜索…";
  }
  if (name === "icon_search") {
    const q = clip(String(args.query || ""), 28);
    return q ? `搜图标：${q}` : "搜图标…";
  }
  if (name === "icon_svg") {
    const id = clip(String(args.id || ""), 28);
    return id ? `拉图标：${id}` : "拉图标 SVG…";
  }
  if (name === "dicebear_svg") {
    const seed = clip(String(args.seed || ""), 20);
    return seed ? `拼人：${seed}` : "拼人 SVG…";
  }
  if (name === "cast_roster") {
    const id = clip(String(args.id || ""), 20);
    return id ? `人物库：${id}` : "人物库目录…";
  }
  if (name === "cast_search") {
    const q = clip(String(args.query || ""), 20);
    return q ? `搜素材：${q}` : "搜素材…";
  }
  if (name === "cast_asset") {
    const id = clip(String(args.id || ""), 24);
    return id ? `取材：${id}` : "取材 SVG…";
  }
  if (name === "match_sample") return "匹配精品…";
  if (name === "use_sample") return args.slug ? `交付精品：${args.slug}` : "交付精品…";
  if (name === "write") {
    const p = shortPath(String(args.path || args.filePath || ""));
    return p ? `写出：${p}` : "写出 HTML…";
  }
  if (name === "qa_check") return "质检…";
  return `${label}…`;
}

function toolEndLine(
  name: string,
  args: Record<string, unknown> | undefined,
  raw: string,
  isError: boolean
): string | null {
  const label = TOOL_LABEL[name] || name;
  if (isError) return `${label}失败`;
  const j = parseJsonish(raw);
  if (name === "match_sample" && j) {
    const slug = String(j.slug || "");
    if (j.verdict === "use") return `匹配精品：交付 ${slug || "精品"}`;
    if (j.verdict === "reference") return `匹配精品：仅参考 ${slug || "结构"}`;
    return "匹配精品：未命中，将新写";
  }
  if (name === "ima_search") {
    const kb = clip(String(j?.knowledge_base || args?.knowledge_base || ""), 16);
    const q = clip(String(j?.query || args?.query || ""), 24);
    const n = j?.hit_count ?? j?.returned ?? (Array.isArray(j?.hits) ? (j.hits as unknown[]).length : undefined);
    const top = Array.isArray(j?.hits) && (j.hits[0] as { title?: string } | undefined)?.title;
    const who = [kb && `「${kb}」`, q && `「${q}」`].filter(Boolean).join("");
    return `ima 检索${who}：${n != null ? `${n} 条` : "完成"}${top ? `，如「${clip(String(top), 18)}」` : ""}`;
  }
  if (name === "knowledge_search") {
    const q = clip(String(j?.query || args?.query || ""), 24);
    const hits = j?.hits;
    const n = Array.isArray(hits) ? hits.length : typeof hits === "number" ? hits : 0;
    return `本地知识${q ? `「${q}」` : ""}：${n} 条`;
  }
  if (name === "web_search") {
    const q = clip(String(j?.query || args?.query || ""), 24);
    const n = Array.isArray(j?.results) ? j.results.length : undefined;
    const top = Array.isArray(j?.results) && (j.results[0] as { title?: string } | undefined)?.title;
    return `联网搜索${q ? `「${q}」` : ""}：${n != null ? `${n} 条` : "完成"}${top ? `，如「${clip(String(top), 18)}」` : ""}`;
  }
  if (name === "icon_search") {
    const q = clip(String(j?.searched || j?.query || args?.query || ""), 20);
    const n = j?.returned ?? (Array.isArray(j?.hits) ? (j.hits as unknown[]).length : undefined);
    const top = Array.isArray(j?.hits) && (j.hits[0] as { id?: string } | undefined)?.id;
    return `搜图标${q ? `「${q}」` : ""}：${n != null ? `${n} 枚` : "完成"}${top ? `，如 ${clip(String(top), 18)}` : ""}`;
  }
  if (name === "icon_svg") {
    const id = clip(String(j?.id || args?.id || ""), 24);
    const n = j?.bytes;
    return `拉图标${id ? ` ${id}` : ""}：${n != null ? `${n}B` : "完成"}`;
  }
  if (name === "dicebear_svg") {
    const seed = clip(String(j?.seed || args?.seed || ""), 16);
    const n = j?.bytes;
    return `拼人${seed ? ` ${seed}` : ""}：${n != null ? `${n}B` : "完成"}`;
  }
  if (name === "cast_roster") {
    const id = clip(String(j?.id || args?.id || ""), 16);
    if (!id && Array.isArray(j?.members)) return `人物库：${(j.members as unknown[]).length} 人`;
    return `人物库${id ? ` ${id}` : ""}：${j?.bytes != null ? `${j.bytes}B` : "完成"}`;
  }
  if (name === "cast_search") {
    const n = Array.isArray(j?.hits) ? j.hits.length : 0;
    return `搜素材「${clip(String(j?.query || args?.query || ""), 16)}」：${n} 条`;
  }
  if (name === "cast_asset") {
    return `取材 ${clip(String(j?.id || args?.id || ""), 24)}`;
  }
  if (name === "qa_check" && j) {
    const n = Array.isArray(j.issues) ? j.issues.length : 0;
    return j.passed ? "质检：通过" : `质检：未过${n ? `（${n} 条）` : ""}`;
  }
  if (name === "use_sample") return args?.slug ? null : "交付精品：完成";
  if (name === "write") return null;
  if (name === "read") return null;
  return null;
}

/** pi-web-access 是 TS 扩展，只能走 SDK ResourceLoader，不能在 Node 里直接 import。 */
export function resolvePiWebAccessExtension(): string | undefined {
  try {
    return createRequire(import.meta.url).resolve("pi-web-access/index.ts");
  } catch {
    return undefined;
  }
}

function loadDefaultPiPrompt(): string {
  const skill = readIfExists(path.join(ROOT, "pi", "教练.md"));
  const product = readIfExists(path.join(ROOT, "pi", "memory", "product.md"));
  const keep = readIfExists(path.join(ROOT, "pi", "memory", "keep.md"));
  const lessons = readIfExists(path.join(ROOT, "pi", "memory", "lessons.md"));
  const core = readIfExists(path.join(ROOT, "pi", "角色", "_CORE.md"));
  return [skill, product, keep ? keep.slice(0, 2200) : "", lessons, core ? `---\n${core.slice(0, 1800)}` : ""]
    .filter(Boolean)
    .join("\n\n");
}

export async function createTeachingAid(
  text: string,
  module?: string,
  skillId?: string,
  onEvent?: (ev: AgentTraceEvent) => void
): Promise<CreateResult> {
  const emit = (ev: Omit<AgentTraceEvent, "at">) => {
    onEvent?.({ at: Date.now(), ...ev });
  };
  const topic = text.trim();
  const registry = loadSkills();
  const type = resolveType(topic, module || "", skillId, registry);
  const aud = inferAudience(topic, module || "");
  console.error(
    `[create] text=${topic} module=${module || "-"} skillId=${skillId || "-"} type=${type} age=${aud.ageBand}`
  );
  emit({ type: "info", message: `开场：${topic}` });
  const toolCalls: string[] = [];
  let deliveredSlug: string | undefined;

  const outDir = path.join(OUT_DIR, type);
  fs.mkdirSync(outDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outPath = path.join(outDir, `${ts}.html`);

  const modelRuntime = await ModelRuntime.create();
  const available = await modelRuntime.getAvailable();
  const model = pickAgentModel(available);
  if (!model) {
    emit({ type: "info", message: "无可用模型" });
    return {
      ok: false,
      type,
      error:
        "无可用模型。请配置 pi ModelRuntime（如 ANTHROPIC_* / deepseek / AGENT_MODEL），或使用样例库中已有知识点（会直接返回 samples/ 精品 HTML）。",
      toolCalls,
    };
  }
  // deepseek 等默认 maxTokens=8192：长教具会在 thinking 阶段 stop=length，永远不 write
  const minOut = Number(process.env.AGENT_MAX_TOKENS) || 32000;
  const modelForCreate = {
    ...model,
    maxTokens: Math.max(Number(model.maxTokens) || 0, minOut),
  };
  console.error(
    `[create] 选用 ${modelForCreate.provider}/${modelForCreate.id} maxTokens=${modelForCreate.maxTokens}`
  );
  emit({
    type: "info",
    message: `pi SDK 会话 · ${modelForCreate.provider}/${modelForCreate.id}`,
  });

  const forceLlm = process.env.CREATE_FORCE_LLM === "1";
  const systemPrompt = loadDefaultPiPrompt();
  if (!systemPrompt) {
    return { ok: false, type, error: "缺少 pi/教练.md，无法开会话", toolCalls };
  }
  const userPrompt = `用户一句话：${topic}

输出路径（绝对路径，write / use_sample 都必须写这里）：
${outPath}

${forceLlm ? "本次禁止 use_sample，必须按用户主题新写。" : "按 pi/教练.md 排程：先派匹配员。"}
是否搜 ima 由教练按 pi/ima/知识库目录.md 判断；对得上再 ima_search。本地与 ima 都不够时教练可 web_search（建议 ≤2）。写手禁止 ima_search / web_search。有名字的人用 cast_roster（OpenMAIC 闭集，write 放 <g data-cast-roster=id></g>），手册 pi/assets/cast/openmaic/手册.md。动物/物用 cast_search + cast_asset（data-cast-pack，优先 noto:）。小颗粒也可 cast_icon，过程 cast_svg。禁止手画五官。本场不注入、不调用 cast_image / GPT Image 2。禁止外链。禁止用皮卡丘等版权 IP。
写手认定 pi/角色/writer.md，写前必读 pi/角色/图解.md、pi/assets/cast/openmaic/手册.md、pi/assets/cast/README.md 与 pi/memory/keep.md。对象字面量里回调必须写成 (d)=>{ ... }，禁止 (d)=>expr;。图解按问题类型落地（演示=玩、答案自洽、填入不盖、揭晓章不盖答案、每关能前进），不要针对某一篇旧样例写死题面。质检 pi/角色/qa.md；write 之后必须 qa_check；script-syntax / reveal-cover / cast-quality 不过必须再 write。
推断仅供参考（不要据此交差题精品）：年龄 ${aud.ageLabel}，场景 ${aud.scenes.join("+")}，交互倾向 ${type}。
触控建议 ≥${aud.touchMin}px，正文 ≥${aud.bodyFont}px。`;

  const attemptTimeout = Number(process.env.AGENT_TIMEOUT_MS) || 240000;
  let runError: string | undefined;
  let lastSession: any = null;
  const webExt = resolvePiWebAccessExtension();
  if (webExt) emit({ type: "info", message: "已挂联网搜索 web_search" });

  // 每次 attempt 新建 session，避免 timeout 后 "Agent is already processing"
  for (let attempt = 0; attempt < 2; attempt++) {
    if (fs.existsSync(outPath) && fs.statSync(outPath).size > 0) break;
    if (lastSession) {
      try {
        lastSession.dispose();
      } catch {
        /* ignore */
      }
      lastSession = null;
    }

    const loader = new DefaultResourceLoader({
      cwd: ROOT,
      agentDir: getAgentDir(),
      systemPromptOverride: () => systemPrompt,
      noExtensions: true,
      additionalExtensionPaths: webExt ? [webExt] : [],
    } as any);
    await loader.reload();

    const { session } = await createAgentSession({
      model: modelForCreate,
      thinkingLevel: "off",
      modelRuntime,
      customTools: createInjectedTools(ROOT),
      tools: [...INJECTED_TOOL_NAMES],
      resourceLoader: loader,
      sessionManager: SessionManager.inMemory(),
    });
    lastSession = session;

    const lastArgs: Record<string, Record<string, unknown>> = {};
    const unsub = session.subscribe((event: any) => {
      if (event.type === "tool_execution_start") {
        toolCalls.push(event.toolName);
        console.error("[tool-start]", event.toolName);
        const args = event.args || event.arguments || {};
        lastArgs[event.toolName] = args;
        const slug = args.slug;
        if (event.toolName === "use_sample" && slug) deliveredSlug = String(slug);
        emit({
          type: "tool_start",
          tool: event.toolName,
          message: toolStartLine(event.toolName, args),
        });
      }
      if (event.type === "tool_execution_end") {
        const txt = event.result?.content?.[0]?.text || "";
        console.error("[tool-end]", event.toolName, "isError=" + event.isError, txt.slice(0, 160));
        const args = event.args || event.arguments || lastArgs[event.toolName];
        const line = toolEndLine(event.toolName, args, txt, !!event.isError);
        if (line) {
          emit({
            type: "tool_end",
            tool: event.toolName,
            ok: !event.isError,
            message: line,
          });
        }
      }
      if (event.type === "agent_end") {
        for (const m of event.messages || []) {
          if (m?.role === "assistant") {
            const types = Array.isArray(m.content)
              ? m.content
                  .map((c: any) => `${c.type}:${(c.text || c.thinking || c.error || "").length || 0}`)
                  .join(",")
              : "";
            console.error(`[create] assistant stop=${m.stopReason || "-"} ${types}`);
            if (m.stopReason === "error") {
              console.error("[create] assistant error", m.errorMessage || JSON.stringify(m).slice(0, 800));
            }
          }
        }
      }
      if (event.type === "error" || event.type === "agent_error") {
        console.error("[create] event", event.type, String(event.message || event.error || JSON.stringify(event)).slice(0, 500));
      }
    });

    const promptText =
      attempt === 0
        ? userPrompt
        : `用户原句仍是：${topic}
输出路径仍是 ${outPath}。
上一轮 HTML 脚本无法解析（常见：对象里写成 draw:(d)=>expr; ）。必须整份再 write：所有回调用 (d)=>{ ... }，写完 qa_check。
禁止交付无关精品。不要再 match_sample。不要空谈。`;

    try {
      console.error(`[create] attempt ${attempt + 1}/2 timeout=${attemptTimeout}ms`);
      emit({ type: "info", message: `第 ${attempt + 1}/2 轮提示` });
      await Promise.race([
        session.prompt(promptText),
        new Promise((_, rej) =>
          setTimeout(() => rej(new Error("模型超时无响应（网关挂起），请重试")), attemptTimeout)
        ),
      ]);
      await session.agent.waitForIdle();
    } catch (e) {
      runError = (e as Error).message;
      console.error(`[create] attempt error: ${runError}`);
      emit({ type: "info", message: `本轮中断：${runError}` });
    }
    unsub();

    if (fs.existsSync(outPath) && fs.statSync(outPath).size > 0) {
      const syn = collectScriptSyntaxIssues(fs.readFileSync(outPath, "utf8"));
      if (syn.length && attempt === 0) {
        console.error("[create] script-syntax, retry", syn[0].detail);
        emit({ type: "info", message: `脚本无法解析，将重写：${syn[0].detail}` });
      } else {
        break;
      }
    } else {
      const extracted = extractHtmlFromSession(session);
      if (extracted) {
        console.error(`[create] 从回复提取 HTML ${extracted.length} bytes`);
        fs.writeFileSync(outPath, extracted, "utf8");
        toolCalls.push("html_extract_from_reply");
        emit({ type: "info", message: `从回复提取 HTML ${extracted.length} 字节` });
        const syn = collectScriptSyntaxIssues(extracted);
        if (syn.length && attempt === 0) {
          console.error("[create] extract script-syntax, retry", syn[0].detail);
        } else {
          break;
        }
      }
    }
  }

  if (lastSession) {
    try {
      lastSession.dispose();
    } catch {
      /* ignore */
    }
  }

  const finalPath = outPath;

  if (fs.existsSync(finalPath) && fs.statSync(finalPath).size > 0) {
    let html = fs.readFileSync(finalPath, "utf8");
    const castDir = path.join(ROOT, "output", "cast");
    const rosterDir = path.join(ROOT, "pi", "assets", "cast", "openmaic");
    let injected = injectCastPlaceholders(html, castDir);
    injected = injectCastRoster(injected, rosterDir);
    injected = injectCastPack(injected, path.join(ROOT, "pi", "assets", "cast"));
    if (injected !== html) {
      html = injected;
      fs.writeFileSync(finalPath, html, "utf8");
      console.error("[create] 已把人物库 / 素材库填进 data-cast-roster / data-cast-pack");
    }
    const inl = inline(html);
    const quality = scoreAudienceQuality(inl.html, aud);
    console.error(
      `[create] audience quality score=${quality.score} notes=${quality.notes.join("; ") || "ok"}`
    );
    const fromSample = toolCalls.includes("use_sample") && !!deliveredSlug;
    const syn = collectScriptSyntaxIssues(html);
    if (syn.length && !fromSample) {
      console.error("[create] script-syntax final fail", syn[0].detail);
      return {
        ok: false,
        type,
        model: modelForCreate.id,
        out: finalPath,
        error: `HTML 已写出但脚本无法解析：${syn[0].detail}`,
        toolCalls,
      };
    }
    const report = {
      ok: true,
      type,
      out: finalPath,
      bytes: inl.bytes,
      externalRefs: inl.externalRefs,
      hasExternalLinks: inl.warnings.length > 0,
      toolCalls,
      fromSample,
      audience: {
        ageBand: aud.ageBand,
        ageLabel: aud.ageLabel,
        scenes: aud.scenes,
        touchMin: aud.touchMin,
        bodyFont: aud.bodyFont,
      },
      quality,
      note: `面向 ${aud.ageLabel} · ${aud.scenes.join("+")}；五硬核自检分 ${quality.score}`,
    };
    if (inl.warnings.length) {
      console.error("[warn] 外链:", inl.warnings.join("; "));
    }
    return {
      ok: true,
      type,
      model: fromSample ? "sample-library" : modelForCreate.id,
      out: finalPath,
      html: inl.html,
      fromSample,
      sampleSlug: deliveredSlug,
      report,
      toolCalls,
    };
  }

  return {
    ok: false,
    type,
    model: modelForCreate.id,
    error:
      (runError || "Agent 未成功写出 HTML 文件（多次重试后 write 仍未落到输出路径）") +
      "。不会用无关样例充数。请换一句更具体的主题，或检查模型是否会调工具（服务端 [tool-start] 日志）。",
    toolCalls,
  };
}
