# 仓库目录（短表）

多层树见仓库根目录 [DIRECTORY.md](../DIRECTORY.md)。根目录只放入口配置；业务按层分开放。

```
ai-courseware-sideproject/
├── public/                 创作台页面（用户只输入一句话）
├── src/                    宿主：HTTP、开会话、契约旁路
├── pi/                     Agent 层（给人审）：主 Skill、工具、画像、角色
├── samples/                精品 HTML + manifest.json
├── skills/                 类型工艺文；创作者扩展在 skills/creator/
├── knowledge/              本地知识切片
├── templates/              旧契约壳（CLI / 测试旁路）
├── tests/                  自动化测试
├── scripts/                样例 QA、teams 脚手架
├── docs/                   产品与架构说明
├── specs/                  分阶段需求/验收（历史规格）
├── output/                 生成落盘（运行产物，勿当源码）
├── optimization/           历史迭代与质检材料（非运行时）
├── resources/              设计参考
└── package.json            npm start / npm test
```

## 运行时你会碰到的

| 目录 | 打开它干什么 |
|------|----------------|
| `public/` | 改前端 |
| `src/server.ts` `src/agent.ts` | 改接入与宿主边界 |
| `pi/教练.md` `pi/角色/` `pi/tools/` | 教练排程 / 岗位认定 / 工具 |
| `pi/samples/portraits.json` | 改精品画像 |
| `samples/` | 改精品 HTML |
| `skills/<type>/` | 改某一类教具工艺 |
| `skills/creator/` | 放创作者 Skill |

## 不要和运行时搞混

| 目录 | 说明 |
|------|------|
| `archive/` | 过期 phase 与旧轮次 |
| `optimization/` | 仅保留评分卡/动画笔记 |
| `.pi/` | 指向 `pi/agents`、`pi/teams.yaml` 的链接，兼容旧脚本 |
| `templates/` | inject 契约链，不是 `/create` 主路径 |
| `output/` | 每次生成的拷贝 |

## 点名文件

- 启动：`npm start` → `src/server.ts`
- 教练手册：`pi/教练.md`
- 工具清单：`pi/tools/README.md`
- 架构：`docs/04-architecture-design.md`、`docs/architecture-runtime.html`
