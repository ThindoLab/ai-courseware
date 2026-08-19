# 教具素材库（测试全量）

小朋友会碰到的人、动物、食物、车、学校、自然、故事符号。  
**没有**皮卡丘、小猪佩奇、迪士尼等有版权形象。

复下：`npm run cast:fetch`。`packs/`、`catalog.json`、`index.json` 不进 git。

## 搜图（已注入 pi Agent）

工具名 **`cast_search`**（界面标签：搜图）。

- 入参：`query`（牛 / cow / 老师 / dragon），可选 `type`（animal / people / food / vehicle / story / scene）
- 每条结果：`label` = **类型/名称**（如 `动物/cow-face`），`id` 给下一工具
- 取图：`cast_asset({ id })` → `<g data-cast-pack="noto:cow-face"></g>`

## 有什么（约 2.7 万枚）

| 分区 | 大约 | 说明 |
|------|------|------|
| `openmaic/` | 18 | Avataaars 课堂胸像 |
| `people/*` | 22 套 × 25 | Peeps / Lorelei / Adventurer / 机器人 / 像素等 |
| `doodles/open-doodles` | 33 | 已从 React JSX 转成可渲染 SVG |
| `packs/noto` + `noto-v1` | 6000 | 优先：动物食物车童话 |
| `packs/fluent-emoji-flat` | 3174 | MIT 彩色 |
| `packs/openmoji` | 4579 | 测试可用（CC-BY-SA） |
| `packs/emojione` / `fxemoji` / `streamline-emojis` | 若干 | 测试备用 |
| `packs/twemoji` / `game-icons` | 8300 | 要署名 |

索引字段：`type` / `type_zh` / `name` / `label`（类型/名称）/ `pack` / `id`。

未下：Humaaans（无稳定 git）、Fluent Emoji 3D（100MB+）、商业卡通 IP。
