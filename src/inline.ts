export interface InlineResult {
  html: string;
  bytes: number;
  warnings: string[];
  externalRefs: string[];
}

/**
 * 断言自包含：无外链 http(s) 资源。
 * 精确判定：只标记「资源加载属性」(src/href/xlink:href/poster/data) 与 CSS url() 里的 http(s)，
 * 不误判 XML 命名空间声明 xmlns（它不是资源引用）或正文里的纯文本 URL。
 */
export function inline(html: string): InlineResult {
  const warnings: string[] = [];
  const refs: string[] = [];
  let m: RegExpExecArray | null;
  // 资源加载属性里的外链：<img src>、<image href>、<script src>、<link href>、<use xlink:href>、<video poster>、<object data>…
  const attrRe = /(?:\b(?:src|href|xlink:href|poster|data)\s*=\s*["'])(https?:\/\/[^\s"'<>)\]]+)/gi;
  while ((m = attrRe.exec(html))) refs.push(m[1]);
  // CSS url(http://…)
  const urlRe = /url\(\s*["']?\s*(https?:\/\/[^\s"'<>)\]]+)/gi;
  while ((m = urlRe.exec(html))) refs.push(m[1]);
  if (refs.length) {
    warnings.push(
      `发现 ${refs.length} 处外链 http(s) 资源，需内联后才能离线使用：${refs.slice(0, 3).join(" ; ")}`
    );
  }
  return { html, bytes: Buffer.byteLength(html, "utf8"), warnings, externalRefs: refs };
}
