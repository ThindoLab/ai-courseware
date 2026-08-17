# 多层级目录说明

本文是仓库的**目录索引**。改代码前先看本文件，避免在历史目录里改运行时。

- 启动：`npm start` → `src/server.ts` → [http://localhost:3000](http://localhost:3000)
- 主流程：`pi/教练.md`
- 工具清单：`pi/tools/README.md`
- 架构：`docs/04-architecture-design.md`

---

## 总览（一层）

```
ai-courseware-sideproject/
│
│  ┌─ 运行时（改功能主要看这些）
├── public/              创作台前端
├── src/                 宿主：HTTP、开会话、契约旁路
├── pi/                  Agent 层（给人审）
├── samples/             精品 HTML
├── skills/              类型工艺 + 创作者扩展
├── knowledge/           本地知识切片
├── templates/           旧契约壳（CLI/测试，不是 /create 主路）
│
│  ┌─ 说明与规格
├── docs/                产品 / 架构（现状）
├── specs/               mission / tech-stack / roadmap
├── DIRECTORY.md         本文件
├── README.md            怎么跑、改哪
├── package.json
│
│  ┌─ 验证与脚本
├── tests/
├── scripts/
│
│  ┌─ 产物与历史（不要当源码入口）
├── output/              每次生成的拷贝
├── archive/             过期 phase、旧轮次
├── optimization/        评分卡 / 动画笔记
├── resources/           设计参考
│
│  ┌─ 工具链残留
├── .pi/                 符号链接 → pi/角色、pi/teams.yaml
├── .agents/ .claude/    编辑器技能，与线上生成无关
└── .pi-subagents/       本地子代理缓存
```

---

## 运行时（多层）

```
public/
├── index.html                 创作台：一句话 + 样例库
└── diagram-preview/           图解增强复跑（/diagram-preview）

src/                           宿主，不编教学 if/else
├── README.md
├── server.ts                  GET /  /samples  /diagram-preview  POST /create { text }
├── agent.ts                   选模型、注入 pi/SKILL + 工具白名单
├── tools.ts                   knowledge_search / qa_check 实现
├── ima-client.ts / ima-catalog.ts   ima 凭证、目录解析
├── knowledge.ts               本地切片检索
├── skills-loader.ts           扫描 skills/ 与 skills/creator/
├── inject.ts / validate.ts / inline.ts / io.ts
└── cli.ts                     create-from-content / validate / search

pi/                            Agent 层，给人审（分层说明见 pi/README.md）
├── README.md                  一层总览 + 一场 /create 读序
├── 教练.md                    ★ 排程 / 分工 / 收工
├── teams.yaml                 花名册（不含顺序）
├── memory/                    product.md 原则 · lessons.md 教训
├── 角色/                      README 按 全员 / 线上 / 离线 / 进化 分层
├── tools/                     README 按 注入 / 岗位 / 未注入 分层
├── samples/portraits.json     精品短画像
└── ima/                       README + 检索指南 + 知识库目录

samples/                       精品教具本体（约 30 份）
├── manifest.json
├── average.html
├── chicken-rabbit.html
└── …

skills/
├── README.md
├── best-teaching-skill.md     通用规范
├── param-visual/SKILL.md      参数图解
├── branch-story/SKILL.md      分支故事
├── drag-slot/SKILL.md         拖拽槽位
└── creator/                   原 creator-skills/
    ├── math-app-visual/SKILL.md
    └── pinyin-drag/SKILL.md

knowledge/
└── extracted/
    └── learning-coaching/     *.md 切片（鸡兔、分数…）

templates/
├── param-visual/v1/           shell.html + schema + sample json
├── branch-story/v1/
└── drag-slot/v1/
```

---

## 说明、测试、脚本

```
docs/
├── layout.md                  短版目录（与本文件互补）
├── README.md                  文档阅读顺序
├── 01-product-overview.md
├── 02-content-planning.md
├── 03-resources-research.md
├── 04-architecture-design.md  以代码为准的架构
├── architecture-runtime.html  可视化架构图
├── create-vs-samples.md
└── creator-sop.md

specs/
├── mission.md / tech-stack.md / roadmap.md
└── 2026-08-0x-*/              当时 phase 的需求/验收（可能过时）

tests/
├── agent.test.ts
├── contract.test.ts
├── knowledge.test.ts
└── skills.test.ts

scripts/
├── README.md
├── sample-detect.mjs / sample-qa-batch.mjs / sample-smoke-http.mjs
└── teams-run.mjs / evolve-run.mjs
```

---

## 产物与历史（一般不用改）

```
output/                        npm start 生成结果
├── param-visual/
├── branch-story/
├── drag-slot/
└── best/                      曾选中的较好版本

optimization/
├── README.md
├── prompts/ · qa-rubric.md    角色仍可能引用

archive/
├── specs/2026-08-*            过期 phase
├── optimization-rounds/
└── optimization-teams/

resources/design-refs/         CSS / 设计摘录
```

---

## 点名对照：我想改 X

| 我想改 | 打开 |
|--------|------|
| 用户只说一句话的页面 | `public/index.html` |
| 生成怎么排程、何时收工 | `pi/教练.md` |
| 某岗位认定与工具 | `pi/角色/<岗>.md` |
| 注入了哪些工具 | `pi/tools/README.md` |
| 案例怎么匹配 | `pi/tools/match-sample.ts`、`pi/samples/portraits.json` |
| 精品 HTML 本身 | `samples/*.html` |
| 某类教具写法 | `skills/<type>/SKILL.md` |
| HTTP / 模型 / 超时 | `src/server.ts`、`src/agent.ts` |
| 架构图 | `docs/04-architecture-design.md`、`docs/architecture-runtime.html` |
