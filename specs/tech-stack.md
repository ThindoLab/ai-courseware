# Tech Stack

以仓库当前代码为准。架构说明见 [`docs/04-architecture-design.md`](../docs/04-architecture-design.md)。

## 项目类型与入口

**本地 Web 应用**：Hono 后端 + 单页 `public/index.html`。生成逻辑全在后端。

```
用户只输入一句话 text
    → POST /create（src/server.ts）
    → 宿主开会话：注入 pi/教练.md + pi/角色/_CORE.md + 工具白名单
    → Agent 按主流程：match_sample → use_sample 或 write → qa_check → 结束
    → 返回 html + audience + quality
```

旁路（契约测试 / 手写 content，**不是** `/create` 主路径）：

```
node src/cli.ts create-from-content
    → inject → validate → inline
```

启动：`npm start` → `node src/server.ts`（默认 `:3000`）。  
Node.js **≥ 18**。包管理：**npm**（`package-lock.json`）。

---

## 语言与运行时

| 层 | 技术 | 现状 |
|----|------|------|
| 后端 | TypeScript / Node（`.ts` 直接跑，`type: module`） | `src/*.ts` |
| HTTP | Hono + `@hono/node-server` | `src/server.ts` |
| 前端 | 单文件静态 HTML/CSS/JS，无框架 | `public/index.html` |
| Agent | `@earendil-works/pi-coding-agent` | write 会话 + `ModelRuntime` |
| 脚本 | Node `.ts` / `.mjs` | `scripts/`、`src/cli.ts` |

依赖见 `package.json`：另有 `typebox`、`pi-web-access`（扩展存在，create 会话 `noExtensions: true` 默认不加载）。

---

## 核心选择

| 选择 | 用什么 | 为什么（现状） |
|------|--------|----------------|
| 创作主循环 | `pi/教练.md` 排程；`pi/角色/` 认定 | 宿主不写死教学 if/else |
| 质量上限 | `samples/` + `pi/samples/portraits.json` | 画像匹配后可交付精品 |
| 三类型 | `param-visual` / `branch-story` / `drag-slot` | 交互形态仍分三类；LLM 写整页，不强制 `#widget-config` |
| 契约旁路 | `templates/*/v1` + `inject` / `validate` / `inline` | CLI 与 `tests/contract.test.ts` |
| 知识检索 | 本地切片 + 可选 ima | `knowledge_search` 本地；`ima_search` 由教练按目录判断 |
| 教练 / 角色 | `pi/教练.md` + `pi/角色/*.md` | 排程与岗位认定分开 |
| 受众 | `inferAudience` + `scoreAudienceQuality` | 中幼儿/家庭/教室/培训 + 五硬核打分 |
| 模型 | `pickAgentModel`（`bai/deepseek-v4-flash` 优先，其次 ark 套餐，避开 fable）；`maxTokens` ≥ 32k | B.AI：`https://api.b.ai/v1`。火山 Agent Plan 作后备。官方 `api.deepseek.com` 常 402。 |

---

## 数据约定

**内容模块 `module`**（知识目录名；create 也作受众/文案上下文）：

| 值 | 覆盖 | 知识层现状 |
|----|------|------------|
| `learning-coaching` | 中小学数/语/英 | 本地 md 有则命中，否则空 hits |
| `preschool` | 学前启蒙 | 同上 |
| `safety-life` | 消防 / 安全 / 急救 | 同上（无自动外搜） |
| `story-culture` | 童话 / 成语 / 民俗 | 同上 |

**类型 `type`**：用户不指定 `skillId` 时，按 `topic` 关键词匹配；匹配不到 → `param-visual`。

**创作请求**：`{ text: string }`（兼容旧字段 `topic`；`module` / `skillId` 可选且前端本阶段不展示）

**成功响应（节选）**：`html`、`type`、`model`、`fromSample`、`sampleSlug`、`audience`、`quality`、`toolCalls`、`bytes`、`report`

---

## 测试与验证

| 层级 | 测什么 | 命令 / 位置 |
|------|--------|-------------|
| 契约 | inject → validate → 无外链 | `tests/contract.test.ts` |
| 单元 | 知识检索、Skill、agent 匹配/受众/模型选择、qa_check | `tests/knowledge.test.ts` `skills.test.ts` `agent.test.ts` |
| 样例 QA | 结构/外链等批跑 | `npm run qa-all`（detect + qa-samples） |
| HTTP smoke | 样例静态可访问 | `npm run smoke-samples` |
| 真实生成 | `POST /create` 或 `createTeachingAid` | 需本机模型；无 `npm run smoke` 脚本 |

```bash
npm test                 # 上表契约 + 单元
npm start                # 前端 + API
npm run qa-all           # 样例检测 + 批 QA
npm run smoke-samples    # 样例 HTTP 烟测
```

---

## 约束（不得违反）

- **输出必须自包含**：CSS/JS 内联；禁止 CDN / 外链资源（SVG `xmlns` 除外）
- **触摸热区**：下限 44px；分龄更严（3–6 ≥64、7–9 ≥52、10–12 ≥44）
- **体积**：软警告约 500KB（`qa_check`）；含图不作为硬门禁卡死 `/create`
- **样例匹配必须高置信**：禁止弱匹配或静默塞无关样例
- **LLM 失败要报错**：不得用「output 里 5 分钟内最新文件」冒充本次生成
- **无用户认证 / 支付代码**
- **依赖锁版本**：以 `package-lock.json` 为准

已取消的旧约束：

- ~~LLM 不得写 HTML 骨架、只能输出 content JSON~~ → 主路径改为整页 `write`；JSON 注入仅 CLI 旁路

---

## 环境变量

| 变量 | 默认 / 作用 |
|------|-------------|
| `PORT` | 3000 |
| `AGENT_MODEL` / `GMNCODE_MODEL` | 指定模型 |
| `AGENT_TIMEOUT_MS` | 180000 |
| `AGENT_MAX_TOKENS` | 32000 |
| `CREATE_FORCE_LLM` | `1` 跳过样例命中 |

| `MATCH_SAMPLE_LLM` | `0` 关闭画像匹配里的小模型 |

---

## 已知空白（暂不做）

- PDF 教材批量切片与索引
- FireCrawl / 域名白名单外搜（未接线）
- create 会话内默认挂上 `knowledge_search` / `qa_check`（工具在仓库里，会话为保 write 未注册）
- 共享市场 / 订阅计费
- 移动端原生 App
- 白板/平板实机验收记录（roadmap Phase 6 尾巴）
