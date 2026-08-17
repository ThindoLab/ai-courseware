# AI 原子教具

创作者用一句话生成「单考点」单文件 HTML，家庭平板 / 教室白板离线打开。

## 怎么跑

```bash
git clone https://github.com/ThindoLab/ai-courseware.git
cd ai-courseware
npm install
npm start          # http://localhost:3001
npm test
```

主分支 `main` 已保护（禁止直推删除/强推，走 PR）。CI 跑 `npm test`。密钥放本机（`~/.config/ima/`、模型环境变量），不要入库。

免费账号下分支保护需仓库为 **public**；若改回 private 需 GitHub Pro 才能继续规则集。

页面上只输入一句话。排程在 `pi/教练.md`，岗位在 `pi/角色/`，宿主在 `src/`。

## 目录（先看这个）

完整说明：[DIRECTORY.md](DIRECTORY.md)（多层树）· [docs/layout.md](docs/layout.md)（短表）

| 你想改 | 去哪 |
|--------|------|
| 前端 | `public/` |
| 生成流程 / 工具 | `pi/` |
| HTTP 与模型会话 | `src/` |
| 精品教具 | `samples/` |
| 产品/架构文档 | `docs/` |

## 文档

| 文档 | 说明 |
|------|------|
| [docs/layout.md](docs/layout.md) | 目录地图 |
| [docs/01-product-overview.md](docs/01-product-overview.md) | 给谁、解决什么 |
| [docs/04-architecture-design.md](docs/04-architecture-design.md) | 当前架构 |
| [docs/architecture-runtime.html](docs/architecture-runtime.html) | 可视化架构图 |
| [docs/create-vs-samples.md](docs/create-vs-samples.md) | 生成 vs 样例库 |
| [docs/creator-sop.md](docs/creator-sop.md) | 创作者 Skill |

## 许可证

MIT
