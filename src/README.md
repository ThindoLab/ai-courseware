# src/ · 宿主

| 文件 | 职责 |
|------|------|
| `server.ts` | HTTP：首页、样例、`POST /create`（可 NDJSON 流式进度） |
| `agent.ts` | 开会话、选模型、注入 `pi/` 工具；不编教学 if/else |
| `tools.ts` | `knowledge_search` / `qa_check` 实现（由 `pi/tools` 包装注入） |
| `ima-client.ts` / `ima-catalog.ts` | ima 凭证、目录、库名解析 |
| `knowledge.ts` | 本地切片检索 |
| `skills-loader.ts` | 扫描 `skills/` 与 `skills/creator/` |
| `inject.ts` `validate.ts` `inline.ts` `cli.ts` | 契约旁路 / 命令行 |
