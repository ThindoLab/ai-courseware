# 教具生成质量优化 - 架构设计

## 目标
用 agent teams 多角色协作，迭代优化三类教具（param-visual / branch-story / drag-slot）的生成质量，以 QA 多视角评分为驱动，聚合相对最优的 prompt/skill/tool 体系与样例。

## 现状诊断（基线）
1. **类型差异化未落地**：agent.ts 只注入通用 `best-teaching-skill.md`；三个类型 SKILL.md 是死的旧 content 契约流程（get_schema/render_artifact），与新「直出 HTML」流程冲突，未被加载。
2. **质检缺失**：无独立 QA，靠 agent 自检；validate.ts 是旧契约脱节；style-guide.ts 是死代码（内容好但未引用）。
3. **无迭代闭环**：生成一次即结束，无「生成->评审->改prompt->重生->比优」。
4. system prompt 流程规划/质量约束分散在 best-teaching-skill.md，缺类型专属可操作清单。

## 角色（agent teams）
| 角色 | 实现 | 职责 |
|------|------|------|
| Orchestrator | 主代理（我） | 控制流程、聚合、决策、改 prompt/skill |
| Writer | `worker` subagent（fresh） | 按当前 prompt+skill 生成单件教具 HTML |
| QA Reviewer | `reviewer` subagent（fresh） | 按 qa-rubric.md 五视角评审，输出 JSON |
| Engineer | `worker` subagent | 改 agent.ts、建质检 tool |
| Prompt Engineer | 主代理担任 | 据 QA mustFix/promptHints 优化 prompt/skill |

## 资产层（优化对象）
- `src/agent.ts` SYSTEM_PROMPT - 通用流程+质量约束（强化工具调用规划、动态判断、生成约束）
- `skills/{param-visual,branch-story,drag-slot}/SKILL.md` - 重写为新流程类型专属指导，agent.ts 按 type 注入
- `src/tools.ts` - 新增 `qa_check` 自动化质检 tool
- `optimization/qa-rubric.md` - 多视角评分卡（已建）
- `optimization/rounds/` - 每轮产物（prompt 版本、教具、QA 报告）

## 结果驱动迭代机制
- 代表知识点：鸡兔同笼(pv) / 厨房着火(bs) / There is/are 句型(ds)
- 每轮：Writer 生成 → QA 评审 → PE 据 mustFix/promptHints 改 skill/prompt → 下一轮
- 聚合：每类维护历史最佳教具（按 total 分）+ prompt 版本演进日志
- 比较保留：新版本 total ≥ 旧最佳才替换；否则回退 prompt

## 20 轮计划
- **R1-R3 基线**：建 v0 资产（重写 skill + 改 agent.ts + qa tool）→ 3 类各生成 v0 → QA 基线评分
- **R4-R9 分类型深挖**（每类 2 轮）：pv R4-5 / bs R6-7 / ds R8-9，针对性修 mustFix
- **R10-R15 跨类型共性**：聚合所有 promptHints，优化 SYSTEM_PROMPT 共性部分，三类重生验证
- **R16-R19 边界与鲁棒**：无解/边界/低龄降阶/触控/动画预算等长尾
- **R20 终审聚合**：多视角终审，输出最终资产 + 迭代报告 + 评分曲线

## 评分驱动门禁
- E 维度硬伤或 C2<4 -> 必修，不计入「最佳」候选
- 每轮 total 落盘到 `rounds/log.csv`，形成演进曲线
