import { Type } from "typebox";
import { defineTool } from "@earendil-works/pi-coding-agent";
import { search } from "./knowledge.ts";
import { inline } from "./inline.ts";

export interface ToolResult {
  content: { type: "text"; text: string }[];
  details: Record<string, unknown>;
  isError?: boolean;
}

export const knowledgeSearchTool = defineTool({
  name: "knowledge_search",
  label: "本地知识检索",
  description:
    "按 module 本地优先检索知识点，返回带来源的命中。创作前必调，确保内容准确。" +
    "module 取值：learning-coaching（小学辅导）/ preschool（学龄前）/ safety-life（安全生活）/ story-culture（故事文化）。" +
    "本地命中不足时，再用 web_search 联网补充。",
  parameters: Type.Object({
    query: Type.String({ description: "知识点关键词，如 鸡兔同笼" }),
    module: Type.String({ description: "内容模块：learning-coaching / preschool / safety-life / story-culture" }),
    top_k: Type.Optional(Type.Number({ description: "返回条数，默认 5" })),
  }),
  execute: async (_id, params): Promise<ToolResult> => {
    const res = search(params.query, params.module, params.top_k ?? 5);
    return {
      content: [{ type: "text", text: JSON.stringify(res, null, 2) }],
      details: { hits: res.hits.length, strategy: res.strategy },
    };
  },
});

interface QaIssue {
  level: "error" | "warn" | "info";
  rule: string;
  detail: string;
}

/** 抽出内联 JS（跳过 src= 与 JSON-LD）。给 qa_check 和 create 复用。 */
/** 去掉注释、path 数据，避免坐标 `24-72` 或注释「关卡」误伤年龄/关卡规则。 */
export function stripMarkupNoise(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:]);?\/\/[^\n]*/g, "$1")
    .replace(/\bd\s*=\s*["'][^"']*["']/gi, 'd=""')
    .replace(/<path\b[^>]*>[\s\S]*?<\/path>/gi, "");
}

export function extractInlineScripts(html: string): string[] {
  const out: string[] = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const attrs = m[1] || "";
    if (/\bsrc\s*=/i.test(attrs)) continue;
    if (/type\s*=\s*["'][^"']*(json|ld\+json)[^"']*["']/i.test(attrs)) continue;
    out.push(m[2] || "");
  }
  return out;
}

export function collectScriptSyntaxIssues(html: string): QaIssue[] {
  const issues: QaIssue[] = [];
  const scripts = extractInlineScripts(html);
  scripts.forEach((src, i) => {
    const body = src.trim();
    if (!body) return;
    try {
      // 与浏览器一样当脚本体解析；对象字面量里 `(d)=>expr;` 会在此挂
      new Function(body);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      issues.push({
        level: "error",
        rule: "script-syntax",
        detail:
          `第 ${i + 1} 段 <script> 无法解析：${msg}。` +
          "对象字面量里禁止 (d)=>expr; 要写成 (d)=>{ expr; }。模板字符串必须闭合。",
      });
    }
  });
  return issues;
}

function quotedStrings(src: string): string[] {
  const out: string[] = [];
  const re = /["']([^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) out.push(m[1]);
  return out;
}

function parseAidContract(html: string): { ok: true; data: unknown } | { ok: false; reason: string } | null {
  const m = html.match(/<!--\s*aid-contract\s*([\s\S]*?)-->/i);
  if (!m) return null;
  try {
    return { ok: true, data: JSON.parse(m[1].trim()) };
  } catch {
    return { ok: false, reason: "aid-contract JSON 无法解析" };
  }
}

function contractLevels(data: unknown): Array<{ answers?: unknown; tiles?: unknown; options?: unknown }> {
  if (!data || typeof data !== "object") return [];
  const rec = data as { levels?: unknown; answers?: unknown; tiles?: unknown; options?: unknown };
  if (Array.isArray(rec.levels)) return rec.levels as Array<{ answers?: unknown; tiles?: unknown; options?: unknown }>;
  return [rec];
}

function asStringList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x));
}

function numAttr(attrs: string, name: string): number | null {
  const m = attrs.match(new RegExp(`\\b${name}\\s*=\\s*["']([\\d.]+)`, "i"));
  return m ? Number(m[1]) : null;
}

/** 不透明「对了」方牌叠在刚揭示的答案上（演示/玩同一条）。镂空环、按钮上的 ✓、旁白里的 ✓ 不算。 */
export function hasOpaqueRevealStamp(html: string): boolean {
  if (
    /id=["'][^"']*(demoCheck|okStamp|checkStamp|revealStamp|stampOk)[^"']*["']/i.test(html) &&
    /[✓✔]/.test(html) &&
    /<rect\b[^>]*\bfill\s*=\s*["'](?!none|transparent)/i.test(html)
  ) {
    return true;
  }
  const plate =
    /<rect\b([^>]*)>(?:\s*<[^/>][^>]*>\s*){0,3}<text\b[^>]*>\s*[✓✔]/gi;
  let m: RegExpExecArray | null;
  while ((m = plate.exec(html))) {
    const attrs = m[1];
    if (!/\bfill\s*=\s*["'](?!none|transparent)[^"']+["']/i.test(attrs)) continue;
    const w = numAttr(attrs, "width");
    const h = numAttr(attrs, "height");
    if (w == null || h == null) continue;
    if (w >= 36 && w <= 96 && h >= 36 && h <= 96 && Math.abs(w - h) <= 24) return true;
  }
  return false;
}

/**
 * 自动化质检：对生成的 HTML 教具做合规检查。
 * 检查项：外链 / 触控尺寸 / 结构 / 外部库 / reduced-motion / 字号 / 体积 / 一屏 / 紫粉抢戏 / 底栏压主图 /
 * 可玩契约（死题、下一关、祝贺页、学前真演示）。
 * 返回 JSON { passed, issues:[{level,rule,detail}], stats }。
 */
export const qaCheckTool = defineTool({
  name: "qa_check",
  label: "自动化质检",
  description:
    "对生成的单文件 HTML 教具做自动化合规检查：外链资源、触控尺寸(≥44px)、结构完整性、外部库引用、" +
    "reduced-motion/静态模式、字号(≥16px)、体积(≤500KB)、一屏视口、紫粉抢戏、底栏压主图、" +
    "可玩契约（多关必须有下一关和祝贺页；学前必须可跳过真演示；aid-contract 中答案必须出现在候选里；" +
    "揭晓章不得用实心方牌+对号盖住刚出现的答案；内联 <script> 必须能解析）。" +
    "返回 JSON 问题清单（passed/issues/stats）。error 级不通过，必须修正后再交。" +
    "写完 HTML 后用本工具自查。现有精品锁在 pi/memory/keep.md，不要为过检去整页重写它们。",
  parameters: Type.Object({
    html: Type.String({ description: "待检查的完整 HTML 字符串" }),
    type: Type.Optional(
      Type.String({ description: "教具类型 param-visual / branch-story / drag-slot（用于 stats 记录）" })
    ),
  }),
  execute: async (_id, params): Promise<ToolResult> => {
    const { html, type } = params as { html: string; type?: string };
    const issues: QaIssue[] = [];
    let m: RegExpExecArray | null;

    // 1. 外链资源（复用 inline 逻辑）
    const inl = inline(html);
    if (inl.externalRefs.length) {
      issues.push({
        level: "error",
        rule: "external-link",
        detail: `发现 ${inl.externalRefs.length} 处外链 http(s) 资源：${inl.externalRefs.slice(0, 3).join(" ; ")}`,
      });
    }

    // 2. 触控尺寸 min-height/min-width < 44px
    const touchRe = /min-(?:height|width)\s*:\s*(\d+(?:\.\d+)?)\s*px/gi;
    while ((m = touchRe.exec(html))) {
      const v = parseFloat(m[1]);
      if (v < 44) issues.push({ level: "warn", rule: "touch-size", detail: `min-height/width ${v}px < 44px` });
    }

    // 3. 结构必备
    if (!/<title[^>]*>[\s\S]*?<\/title>/i.test(html)) {
      issues.push({ level: "warn", rule: "structure", detail: "缺 <title> 标题" });
    }
    if (!/重置|reset|↻|btn-reset|重新开始|重新选择/i.test(html)) {
      issues.push({ level: "warn", rule: "structure", detail: "缺重置/重新开始按钮（重置/reset/↻）" });
    }
    if (!/stage|choices|slot|drag|slider|滑块|槽位|选择按钮|词块/i.test(html)) {
      issues.push({ level: "warn", rule: "structure", detail: "未识别到主交互区（stage/choices/slot/slider）" });
    }
    if (!/<svg[\s>]/i.test(html) && !/perspective\s*:/i.test(html) && !/<canvas[\s>]/i.test(html)) {
      issues.push({
        level: "warn",
        rule: "diagram",
        detail: "缺少 SVG / CSS 3D / Canvas 主图，图解能力偏弱",
      });
    }
    const hasMotion =
      /@keyframes/i.test(html) ||
      /animate\s*\(/i.test(html) ||
      /transition\s*:/i.test(html);
    if (!hasMotion) {
      issues.push({ level: "warn", rule: "motion", detail: "未检测到 keyframes/transition/WAAPI，过程可能是静图" });
    }
    if (!/<script[\s>]/i.test(html)) {
      issues.push({ level: "warn", rule: "structure", detail: "缺 <script> 交互逻辑" });
    }
    if (!/100dvh|100vh/i.test(html) || !/overflow\s*:\s*hidden/i.test(html)) {
      issues.push({
        level: "warn",
        rule: "viewport",
        detail: "未锁一屏（缺 100dvh/100vh 或 overflow:hidden），可能要滚动才能看完一幕",
      });
    }

    // 7b. 观感 / 体验（用户反馈：一屏看完、主图不被压、别抢戏）
    if (
      /linear-gradient\s*\([^)]*(#(?:7c3aed|8b5cf6|a78bfa|c084fc|d946ef|ec4899)|violet|magenta)/i.test(html) ||
      /(#(?:7c3aed|8b5cf6|a78bfa).{0,80}#(?:ec4899|f472b6|d946ef))/i.test(html)
    ) {
      issues.push({
        level: "warn",
        rule: "look-ai",
        detail: "疑似紫粉双高亮 / AI 渐变，一份教具只留一个 accent",
      });
    }
    if (
      /(foot|dock|toolbar|bottom-bar|actionbar)[^}]{0,240}position\s*:\s*absolute[^}]{0,80}bottom\s*:\s*0/i.test(html) ||
      /position\s*:\s*absolute[^}]{0,80}bottom\s*:\s*0[^}]{0,160}(foot|dock|toolbar)/i.test(html)
    ) {
      issues.push({
        level: "warn",
        rule: "ux-footer",
        detail: "底栏疑似 absolute;bottom:0，可能压住主图或操作区",
      });
    }
    if (!/我会说|sayout|btn-say|btnSay/i.test(html)) {
      issues.push({
        level: "info",
        rule: "ux-say",
        detail: "未检测到「我会说」；若做成挡主图的长旁白应改藏，不要为补这一项挤掉主操作",
      });
    }
    const visible = stripMarkupNoise(html);
    const youngTopic = /3\s*[-–]\s*6\s*岁|4\s*[-–]\s*7\s*岁|学前|中幼儿|分类|凑十|翻牌|配对|比长短|比一比/i.test(
      visible
    );
    const multiLevel = /第一关|LEVELS\s*=|levelIndex|curLevel|下一幕|下一关/i.test(visible);
    if (youngTopic && !/跳过|skip/i.test(html)) {
      issues.push({
        level: "error",
        rule: "ux-intro",
        detail: "低龄题未检测到可跳过开场（跳过/skip），孩子可能不知道先干什么",
      });
    }
    if (
      youngTopic &&
      /看一遍|id=["']demo|class=["'][^"']*demo/i.test(html) &&
      !/@keyframes/i.test(html) &&
      !/animate\s*\(/i.test(html)
    ) {
      issues.push({
        level: "error",
        rule: "demo-static",
        detail: "低龄开场有演示壳，但没有 keyframes/WAAPI，可能是静图冒充「看一遍」",
      });
    }
    if (multiLevel && !/下一关|下一幕|nextBtn|nextLevel|next-level|next-btn/i.test(html)) {
      issues.push({
        level: "error",
        rule: "ux-next",
        detail: "检测到多关，但没有「下一关/下一幕」入口，第一关做完可能停死",
      });
    }
    if (
      /function\s+bean\s*\(/i.test(html) &&
      !/open-peeps|viewBox\s*=\s*["']0 0 704/i.test(html)
    ) {
      issues.push({
        level: "warn",
        rule: "cast-inline",
        detail: "自写 bean() 且未见 Open Peeps。有名字的人应内联 dicebear_svg，不要竖线断肢",
      });
    }
    const namedFolk = /牛郎|织女|王母|悟空|哪吒|嫦娥/.test(visible);
    const weakPerson = /function\s+(bean|person|maggieSVG|magpie)\s*\(/i.test(html);
    const hasRoster =
      /data-cast-roster=/.test(html) ||
      /data-cast-pack=/.test(html) ||
      /viewBox\s*=\s*["']0 0 280 280["']/.test(html);
    const hasIconPerson = /man-farmer|woman-farmer|princess|fairy|person-with-crown|kimono|cast_icon|noto:ox|noto:cow/.test(
      html
    );
    if (namedFolk && weakPerson && !hasRoster && !hasIconPerson) {
      issues.push({
        level: "error",
        rule: "cast-quality",
        detail:
          "故事人物仍是手画。人用 cast_roster（data-cast-roster）；动物/物用 cast_search+cast_asset（data-cast-pack）。不要手画，不要 cast_image。",
      });
    }
    if (
      multiLevel &&
      !/祝贺|庆祝|完成啦|通关|well-?done|celebrate|winScreen|endScreen|id=["'](done|final|win|finish)/i.test(html)
    ) {
      issues.push({
        level: "error",
        rule: "ux-end",
        detail: "多关题未检测到祝贺/完成页，通关可能无声循环回第一关",
      });
    }
    if (
      multiLevel &&
      /完成/.test(html) &&
      /(?:stage|levelIndex|curLevel|level)\s*=\s*0/.test(html) &&
      !/id=["'](done|final|win|end|finish)|winScreen|endScreen|screen-done|id=["']celebrate/i.test(html)
    ) {
      issues.push({
        level: "error",
        rule: "ux-end-loop",
        detail: "文案有「完成」但下一关仍把关卡清零，且没有独立结束页（对照 there-be）",
      });
    }
    if (hasOpaqueRevealStamp(html)) {
      issues.push({
        level: "error",
        rule: "reveal-cover",
        detail:
          "揭晓章盖住答案：不透明方牌 + 对号叠在刚补上/刚填入的内容上（演示层也算）。对了用镂空环（fill=none 的圈），或把对号放在答案旁边，不要实心牌盖上去",
      });
    }

    const contract = parseAidContract(html);
    if (contract && contract.ok === false) {
      issues.push({ level: "error", rule: "aid-contract", detail: contract.reason });
    } else if (contract && contract.ok) {
      const levels = contractLevels(contract.data);
      if (!levels.length) {
        issues.push({ level: "error", rule: "aid-contract", detail: "aid-contract 缺少 levels 或 answers" });
      }
      levels.forEach((lv, i) => {
        const answers = asStringList(lv.answers);
        const pool = [...asStringList(lv.tiles), ...asStringList(lv.options)];
        if (!answers.length) {
          issues.push({
            level: "error",
            rule: "aid-contract",
            detail: `第 ${i + 1} 关未声明 answers`,
          });
          return;
        }
        if (!pool.length) {
          issues.push({
            level: "error",
            rule: "playable-dead",
            detail: `第 ${i + 1} 关未声明 tiles/options，无法核对答案是否在候选里`,
          });
          return;
        }
        const missing = answers.filter((a) => !pool.includes(a));
        if (missing.length) {
          issues.push({
            level: "error",
            rule: "playable-dead",
            detail: `第 ${i + 1} 关答案不在候选里：${missing.join("、")}`,
          });
        }
      });
    } else if (multiLevel) {
      issues.push({
        level: "error",
        rule: "aid-contract",
        detail: "多关题缺少 <!-- aid-contract -->，质检无法核对每关答案是否出现在候选里",
      });
    } else {
      const slotAnswers = [...html.matchAll(/\{a:\s*["']([^"']+)["']\}/g)].map((x) => x[1]);
      const tileBlocks = [...html.matchAll(/\btiles\s*:\s*\[([^\]]+)\]/g)].map((x) => quotedStrings(x[1]));
      if (slotAnswers.length && tileBlocks.length) {
        const allTiles = new Set(tileBlocks.flat());
        const missing = slotAnswers.filter((a) => !allTiles.has(a));
        if (missing.length) {
          issues.push({
            level: "error",
            rule: "playable-dead",
            detail: `空位答案未出现在任何 tiles 里：${[...new Set(missing)].join("、")}`,
          });
        }
      }
    }

    for (const syn of collectScriptSyntaxIssues(html)) issues.push(syn);

    // 4. 外部库：<script src="非空"> 且非 http（http 已由 external-link 捕获）
    const extLibRe = /<script[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi;
    while ((m = extLibRe.exec(html))) {
      if (/^https?:\/\//i.test(m[1])) continue; // 已由 external-link 捕获
      issues.push({ level: "error", rule: "external-lib", detail: `<script src="${m[1]}"> 引入外部库（必须原生 JS）` });
    }

    // 5. reduced-motion / 静态模式
    if (!/prefers-reduced-motion|静态模式|static-mode|reduced-motion/i.test(html)) {
      issues.push({ level: "info", rule: "a11y", detail: "未检测到 prefers-reduced-motion 或静态模式开关" });
    }

    // 6. 字号：最小 font-size < 16px
    const fontRe = /font-size\s*:\s*(\d+(?:\.\d+)?)\s*px/gi;
    let minFont = Infinity;
    while ((m = fontRe.exec(html))) minFont = Math.min(minFont, parseFloat(m[1]));
    if (minFont !== Infinity && minFont < 16) {
      issues.push({ level: "warn", rule: "font-size", detail: `最小 font-size ${minFont}px < 16px（正文应 ≥16px）` });
    }

    // 7. 体积
    if (inl.bytes > 500 * 1024) {
      issues.push({ level: "warn", rule: "size", detail: `体积 ${(inl.bytes / 1024).toFixed(1)}KB > 500KB` });
    }

    const errors = issues.filter((i) => i.level === "error");
    const result = {
      passed: errors.length === 0,
      issues,
      stats: {
        bytes: inl.bytes,
        externalRefs: inl.externalRefs.length,
        type: type || "unknown",
        issueCount: issues.length,
        errorCount: errors.length,
        warnCount: issues.filter((i) => i.level === "warn").length,
        infoCount: issues.filter((i) => i.level === "info").length,
      },
    };
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      details: result,
    };
  },
});

/**
 * Agent 可用的自建工具：本地知识检索 + 自动化质检。
 * 联网搜索（web_search）与网页抓取（fetch_content）由 pi-web-access 扩展提供，
 * 通过 tools allowlist 在 agent.ts 中启用。文件读写（read/write/edit）由 SDK 内置工具工厂注册。
 */
export const AGENT_TOOLS = [knowledgeSearchTool, qaCheckTool];
