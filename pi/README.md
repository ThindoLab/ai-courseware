# pi/ · Agent 层

给人审的调度层：一场 `/create` 读这里，不读 `src/` 里的 if/else。  
宿主只负责开会话、注入白名单、把 HTML 落盘。

## 一层：谁说了算

| 层级 | 文件 | 管什么 |
|------|------|--------|
| **排程** | `教练.md` | 谁先谁后、可否跳过、何时收工 |
| **花名册** | `teams.yaml` | 只有岗位名；不含顺序 |
| **岗位手册** | `角色/*.md` | 职责、允许工具、不管什么 |
| **工具** | `tools/` | 会话里实际能调什么 |
| **记忆** | `memory/` | 人群、五硬核、踩过的坑 |
| **检索** | `ima/` | 账号知识库：先读目录再决定搜不搜 |
| **画像** | `samples/portraits.json` | 精品短标签，给 `match_sample` |

出场顺序只认 `教练.md`。不要在 `角色/` 或 `teams.yaml` 里另排一版流程。

## 二层：目录树

```
pi/
├── README.md                 本文件
├── 教练.md                   ★ 教练手册
├── teams.yaml                花名册（线上 / 快线 / 进化环）
├── memory/
│   ├── product.md            人群、目的、五硬核
│   ├── keep.md               当前基线保留清单（禁止整页重写）
│   └── lessons.md            写不出文件、假命中等教训
├── 角色/                     队员认定（见该目录 README）
│   ├── README.md
│   ├── _CORE.md              全员原则
│   ├── 匹配员.md / writer.md / 图解.md / qa.md / regenerator.md
│   └── researcher.md …       离线流水线、进化环
├── tools/                    工具说明 + 实现（见该目录 README）
│   ├── README.md
│   ├── index.ts              INJECTED 白名单
│   ├── match-sample.ts
│   ├── use-sample.ts
│   ├── ima-search.ts
│   └── web-search.ts         扩展入口，不在此 defineTool
├── samples/
│   └── portraits.json        精品画像（HTML 本体在仓库 samples/）
└── ima/                      见 ima/README.md
    ├── README.md
    ├── 检索指南.md
    ├── 知识库目录.md
    ├── allowlist.txt
    └── catalog.json          工具用，gitignored
```

`.pi/agents` 符号链接指向 `角色/`，兼容旧脚本。

## 三层：一场 `/create` 读什么

```
1. 教练.md
2. memory/product.md + memory/lessons.md + 角色/_CORE.md
3. 匹配员 → match_sample（画像：samples/portraits.json）
   ├ use        → use_sample → qa → 结束（不搜 ima）
   ├ reference  → 先判 ima，再派写手（只学结构）
   └ none       → 先判 ima，再派写手
4. 教练 read ima/知识库目录.md → 对得上才 ima_search（≤5）
   本地/ima 都盖不住 → 可 web_search 1–2 次
5. 写手 read writer.md + 图解.md + assets/cast 手册 → write（人 roster，动物/物 search+asset；不调 cast_image）
6. 质检 qa_check；不过 → regenerator 再 write 一轮
7. 教练宣布结束
```

用户只给一句话。模块、交互类型、要不要搜，都由教练按手册判断。

## 四层：子目录入口

| 子目录 | 说明文档 | 改它之前先看 |
|--------|----------|--------------|
| `角色/` | [角色/README.md](角色/README.md) | 加岗、改工具允许集 |
| `tools/` | [tools/README.md](tools/README.md) | 加工具、改注入清单 |
| `ima/` | [ima/README.md](ima/README.md) | 检索策略、同步目录 |
| `memory/` | `product.md` / `lessons.md` | 产品原则、失败教训 |

## 点名：我想改 X

| 我想改 | 去哪 |
|--------|------|
| 流程、跳过规则、收工 | `教练.md` |
| 花名册里有哪些岗 | `teams.yaml` |
| 某岗职责 / 能调哪些工具 | `角色/<岗>.md` |
| 五硬核、触控、离线 | `角色/_CORE.md`、`memory/product.md` |
| 图解 2D / 伪 3D / 一屏一幕 | `角色/图解.md` |
| 会话里多/少一个工具 | `tools/README.md` + `tools/index.ts` |
| 精品匹配太松/太紧 | `tools/match-sample.ts`、`samples/portraits.json` |
| ima 搜不搜、怎么搜 | `ima/检索指南.md`、`ima/知识库目录.md` |
| 刷新可搜知识库 | `npm run ima:sync` |
| 宿主怎么开会话 | 仓库 `src/agent.ts`（不属于本目录） |
