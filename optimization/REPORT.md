# 教具生成质量优化 - 迭代报告

> 多角色 agent teams 驱动的 prompt/skill/tool 系统优化。以 QA 多视角评分为驱动，迭代聚合相对最优结果。

## 一、架构与角色

| 角色 | 实现 | 职责 |
|------|------|------|
| Orchestrator / PE | 主代理 | 流程控制、聚合决策、prompt/skill 优化 |
| Writer | `worker` subagent（fresh） | 按 prompt 生成单件教具 HTML |
| QA Reviewer | `reviewer` subagent（fresh） | 五视角评分（孩子/家长/老师/机构/工程），输出 JSON |
| Engineer | `worker` subagent（async） | 改 agent.ts、建 qa_check tool |

**结果驱动闭环**：Writer 生成 → QA 评审 → PE 据 mustFix/promptHints 改 prompt → 下一轮重生 → 比较 total 保留最佳。

## 二、资产层（优化对象，均已落地）

1. **`optimization/prompts/system.md`** - 强化 system prompt（v1→v3）：流程/工具决策/动态判断/19 条质量铁律
2. **`skills/{param-visual,branch-story,drag-slot}/SKILL.md`** - 重写为新流程类型专属指导（替代死的旧 content 契约版）
3. **`skills/best-teaching-skill.md`** - 通用教学规范（保留，分龄/方法论/动画/验收）
4. **`src/agent.ts`** - 改为运行时拼装 system.md + best-teaching-skill + 类型 SKILL（按 type 注入），allowlist 含 qa_check
5. **`src/tools.ts`** - 新增 `qa_check` 自动化质检工具（外链/触控/字号/结构/外库/reduced-motion）
6. **`optimization/qa-rubric.md`** - 多视角评分卡（5 视角 × 23 维度）

## 三、20 轮计划与执行

### 已完成（R1-R11，11 轮，23 教具产出）

| 轮 | 焦点 | 结果 |
|----|------|------|
| R1 | 基线生成+QA | pv 4.5 / bs 4.4(2 mustFix) / ds 4.3(2 mustFix) |
| R2 | 修 R1 mustFix | pv 4.8 / bs 4.6 / ds fail(错别字) |
| R3 | 修 R2 mustFix | pv 4.4(回归) / bs 4.9 / ds 4.65 |
| R4 | 修 pv 回归 | pv 4.8（stepper 触控修复） |
| R5 | 泛化批次1 | 分数 4.66 / 防溺水 4.74 / 拼音 4.92 |
| R6 | 泛化批次2 | 相遇 4.6 / 防拐 4.56 / 时态 4.7 |
| R7-R10 | 泛化批次3 | 植树 4.8 / 数字安全 4.8 / 近反义词 fail / 周长面积 4.88 |
| R11 | 修 R9 bug | 近反义词 4.7（判定态清除） |

### 中断（R12-R14）
第四批变式（平移旋转/防欺凌/量词）派发时遭遇 **账户 5 小时配额超限（429）**，subagent 全部失败，仅留半成品（触控/字号未自检达标，不纳入最佳）。配额于 05:25:55 重置后可继续。

### 待执行（R15-R20 计划）
- R15-R17：终审 - reviewer 对各类最佳版本跨视角终评
- R18：PE 据终审最终微调
- R19：qa_check 全量自动验证 + 最终样例选定
- R20：聚合交付（本报告 + 资产）

## 四、评分演进（结果驱动证据）

```
param-visual:  R1 4.5 → R2 4.8 → R3 4.4(回归) → R4 4.8 ✓   | 泛化: 分数4.66 相遇4.6 植树4.8 周长4.88
branch-story:  R1 4.4 → R2 4.6 → R3 4.9 ✓                 | 泛化: 防溺水4.74 防拐4.56 数字安全4.8
drag-slot:     R1 4.3 → R2 fail → R3 4.65 ✓               | 泛化: 拼音4.92 时态4.7 近反义词4.7(修)
```
- 3 类代表知识点均从 good/fail 提升到 **excellent（≥4.5）**，无 mustFix。
- **泛化验证**：9 个新知识点（3 批）8 个 excellent，证明 prompt 系统未过拟合初始知识点。

## 五、关键 prompt 改进（PE 演进）

R1→R11 固化的硬约束（写入 system.md 19 铁律 + 3 skill）：
1. 字号硬约束（标题≥24/正文≥16/SVG≥14）
2. 可访问性（label for / SVG role+aria / 槽位 role）
3. 安全红线（错误选项严禁祈使句，统一疑问式，强警示「停下不要这样做」）
4. 答对反馈保留（禁自动跳转清空，手动下一步，安全提示不截断）
5. 键盘可操作（keydown Enter/Space）
6. 术语校对（同音近形字零容忍）
7. 状态联动（复述/叙述随交互状态切换）
8. 触控防回归（所有 button 含辅助统一达标）
9. 动态叙述映射（禁局部 replace 术语）
10. 互斥判定态清除（错答->改正红->绿切换）
11. 无解态/边界可达（滑块不锁死，触发可教学生特殊状态）
12. 干扰项视觉一致 / 错误反馈动态读实际值 / 多题闭环

## 六、最终资产清单

- **prompt 系统**：`optimization/prompts/system.md` + `skills/best-teaching-skill.md` + `skills/{3类型}/SKILL.md`
- **代码**：`src/agent.ts`（type 注入）+ `src/tools.ts`（qa_check）
- **评分卡**：`optimization/qa-rubric.md`
- **最佳样例**：`output/best/`（6 件，每类 2 个代表知识点）
- **迭代日志**：`optimization/rounds/log.csv`（24 条）
- **全部产物**：`optimization/rounds/R1-R14/`（23 教具 + QA 报告）

## 七、后续计划（配额恢复后）

1. 完成 R12-R14 第四批变式（平移旋转/防欺凌/量词）泛化验证
2. R15-R17 终审跨视角终评
3. 持续扩充知识点覆盖（目标 20+ 知识点泛化验证）
4. 将 best 样例同步到 `samples/` 供前端展示
5. 考虑加入截图视觉 QA（需截图扩展）

---

## 八、skill-v3 续推进（2026-08 · 场景重设）

**锚定**：中幼儿 / 家庭 / 教室 / 培训 · 图解降难度（非文档题单驱动）。

### 机制
- `.pi/agents/_CORE.md` + 全角色必读  
- `system.md` 铁律 24–29；`qa-rubric.md` v2 五硬核  
- evolve run：`optimization/teams/evolve/runs/skill-v3-core-1786262657465/`

### 样例库主推（11）
规律灯串 · 找零 · 颜色分类 · 课堂举手 · 合规消防 · there-be · 平均数 · **假设法鸡兔** · **段点植树** · **分数双表征** · **相遇过程**

### 自主续轮（已完成）
- `he-bei` 纠偏为**和倍图解**（原误作地理选择题）
- `perimeter-area` 格子面积 vs 描边周长
- `transform` 先平移后旋转 + 路径
- 样例库 **14 件全部 featured**，结构门禁全绿，已同步 `output/best/`

### 待办
触控实机点验；可选培训向新场景；knowledge 例题与样例对齐。

### R13 前端+样例自主迭代
- 样例 16 件（+钟表认读、反义词配对）
- 前端：类型筛选、scene/age 卡片、chips 多样化、hero/guide 对齐图解目的
- API：/samples 自动补 bytes
- 服务：http://localhost:3000
