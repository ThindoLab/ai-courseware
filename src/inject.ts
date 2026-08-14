import { readTemplate } from "./io.ts";

export type TemplateType = "param-visual" | "branch-story" | "drag-slot";

export const TYPES: TemplateType[] = ["param-visual", "branch-story", "drag-slot"];

export function isTemplateType(t: string): t is TemplateType {
  return t === "param-visual" || t === "branch-story" || t === "drag-slot";
}

const CONFIG_RE = /(<script[^>]*id="widget-config"[^>]*>)([\s\S]*?)(<\/script>)/;

/** 把 content 注入模板的 #widget-config，返回完整 HTML。 */
export function inject(type: TemplateType, content: unknown): string {
  const shell = readTemplate(type, "shell.html");
  if (!CONFIG_RE.test(shell)) {
    throw new Error(`inject: ${type} shell.html 缺少 #widget-config 注入点`);
  }
  const json = JSON.stringify(content, null, 2);
  return shell.replace(CONFIG_RE, (_m, open: string, _body: string, close: string) =>
    `${open}\n${json}\n${close}`
  );
}

/** 从 HTML 中提取 #widget-config 的 JSON。 */
export function extractConfig(html: string): unknown {
  const m = html.match(CONFIG_RE);
  if (!m) return null;
  try {
    return JSON.parse(m[2].trim());
  } catch (e) {
    throw new Error(`extractConfig: #widget-config JSON 解析失败: ${(e as Error).message}`);
  }
}
