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

/**
 * 自动化质检：对生成的 HTML 教具做合规检查。
 * 检查项：外链 / 触控尺寸 / 结构完整性 / 外部库 / reduced-motion / 字号 / 体积。
 * 返回 JSON { passed, issues:[{level,rule,detail}], stats }。
 */
export const qaCheckTool = defineTool({
  name: "qa_check",
  label: "自动化质检",
  description:
    "对生成的单文件 HTML 教具做自动化合规检查：外链资源、触控尺寸(≥44px)、结构完整性、外部库引用、" +
    "reduced-motion/静态模式、字号(≥16px)、体积(≤500KB)。返回 JSON 问题清单（passed/issues/stats）。" +
    "写完 HTML 后用本工具自查，error 级问题必须用 edit 修正。",
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
