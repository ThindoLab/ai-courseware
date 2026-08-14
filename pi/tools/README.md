# 工具导航（create 会话）

本目录是 **pi Agent 工具的说明与实现**。改注入清单时同时改本文件和 `index.ts`。

## 当前默认注入（`pi/tools/index.ts` → `INJECTED`）

| 名称 | 实现 | 会话里？ | 做什么 |
|------|------|----------|--------|
| `match_sample` | `match-sample.ts` | 是 | 大类预筛 + 画像计分 + 小模型相似度（`MATCH_SAMPLE_LLM=0` 可关） |
| `use_sample` | `use-sample.ts` | 是 | 把精品 HTML 写到本次输出路径 |
| `write` | SDK `createWriteToolDefinition` | 是 | 新写完整 HTML |
| `read` | SDK `createReadToolDefinition` | 是 | 读工艺文或样例参考 |
| `qa_check` | 包装 `src/tools.ts` | 是 | 写完后合规检查 |
| `knowledge_search` | 包装 `src/tools.ts` | 是 | 本地切片检索 |
| `ima_search` | `ima-search.ts` | 是 | 教练按目录判断后检索 ima；写手禁用 |
| `web_search` | `pi-web-access` 扩展 | 是 | 教练按需公开网页检索；写手禁用。见 `web-search.ts` 说明 |

## 未注入（有代码，主流程默认不用）

| 名称 | 说明 |
|------|------|
| `edit` | 易拉长 loop；修正用再 `write` |
| 整包 `pi-web-access` 扩展 | 含 fetch/YouTube/策展 TUI；create 仍 `noExtensions`，只挂薄封装 `web_search` |

## 给人审

- 画像：`../samples/portraits.json`  
- 谁在何时用这些工具：`../教练.md`（岗位允许集见 `../角色/`）
