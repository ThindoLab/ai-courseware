/**
 * 公开网页搜索不在本文件 defineTool。
 *
 * SDK 官方做法：create 会话用 DefaultResourceLoader.additionalExtensionPaths
 * 加载 npm 包 `pi-web-access`（package.json → pi.extensions），
 * 再把工具名 `web_search` 放进 createAgentSession({ tools }) 白名单。
 *
 * 仍设 noExtensions: true，避免扫进 ~/.pi 里其它扩展（bash 外的杂项、YouTube 等）。
 * 白名单只有 web_search，不会把 fetch_content 交给模型。
 *
 * 实现见 src/agent.ts 的 resolvePiWebAccessExtension()。
 */
export const WEB_SEARCH_TOOL_NAME = "web_search" as const;
