# 工具

本目录是 **pi Agent 工具的说明与实现**。  
改注入清单时同时改本文件和 `index.ts` 的 `INJECTED_TOOL_NAMES`。

岗位何时用这些工具：`../教练.md`。各岗允许集：`../角色/`。

## 一层：当前默认注入

`index.ts` → `createInjectedTools`。`web_search` 由宿主挂 `pi-web-access` 扩展，不在本目录 `defineTool`。

| 名称 | 实现 | 做什么 |
|------|------|--------|
| `match_sample` | `match-sample.ts` | 大类预筛 + 画像计分 + 小模型相似度（`MATCH_SAMPLE_LLM=0` 可关） |
| `use_sample` | `use-sample.ts` | 把精品 HTML 写到本次输出路径 |
| `write` | SDK `createWriteToolDefinition` | 新写完整 HTML |
| `read` | SDK `createReadToolDefinition` | 读认定文、目录、样例 |
| `qa_check` | 包装 `src/tools.ts` | 写完后合规检查 |
| `knowledge_search` | 包装 `src/tools.ts` | 本地 `knowledge/extracted/` |
| `ima_search` | `ima-search.ts` | 账号知识库；写手禁用 |
| `web_search` | `web-search.ts` + 扩展 | 公开网页；写手禁用 |

## 二层：按岗位

| 岗位 | 允许 |
|------|------|
| 匹配员 | 仅 `match_sample` |
| 教练 | `read` `ima_search` `web_search`（另可 `use_sample` 在匹配为 use 之后） |
| 写手 | `read` `write` `knowledge_search` |
| 质检 | `read` `qa_check` |
| 重写 | `read` `write` |

禁止 bash。外网只给教练。

## 三层：未注入

| 名称 | 说明 |
|------|------|
| `edit` | 易拉长 loop；修正用再 `write` |
| 整包 `pi-web-access` | 含 fetch / YouTube / 策展 TUI。create 仍 `noExtensions`，只挂薄封装 `web_search` |

## 给人审

- 画像：`../samples/portraits.json`（HTML 在仓库根 `samples/`）
- ima 怎么搜：`../ima/README.md`
