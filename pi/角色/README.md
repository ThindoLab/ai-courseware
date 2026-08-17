# 角色认定

本目录是**队员手册**。每个 md 只认定一个岗。  
**谁先谁后、何时收工**只写在 `../教练.md`。

认定文固定四节：**角色认定 / 允许工具 / 输入输出 / 不管什么**。

## 一层：全员

| 文件 | 作用 |
|------|------|
| `_CORE.md` | 人群、五硬核、离线单文件、触控。教练会注入摘要 |

## 二层：线上 `/create`（每场）

| 文件 | 岗位 | 上场 |
|------|------|------|
| `匹配员.md` | 案例画像匹配 | 每场先上，只调 `match_sample` |
| `writer.md` | 写手 | 未交付精品时；`read` / `write` / `knowledge_search` |
| `图解.md` | 图解工艺 | 写手 `write` 前必读，不是独立上场岗 |
| `qa.md` | 质检 | 落盘后；`read` / `qa_check` |
| `regenerator.md` | 按 QA 重写 | 质检不过；`read` / `write` |

教练本人认定在 `../教练.md`，不在本目录再写一份。

## 三层：离线流水线（`teams.yaml` → `courseware-pipeline` / `courseware-fast`）

| 文件 | 岗位 |
|------|------|
| `researcher.md` | 调研知识点、低龄教法 |
| `organizer.md` | 整理场景 / 角色 / 具象 / 动态 / 验收点 |

快线 `courseware-fast` 跳过调研，从 organizer 起。

## 四层：进化环（仅 `skill-evolve`）

| 文件 | 岗位 |
|------|------|
| `optimizer.md` | 诊断 + 出新场景 |
| `generator.md` | 按提案出 HTML / 提示词草稿 |
| `reviewer.md` | 多视角 verdict |
| `reflector.md` | 提炼可固化规律 |
| `reoptimizer.md` | 写回 system / SKILL |

线上 `/create` 不跑这一层。

`.pi/agents` 符号链接指向本目录。
