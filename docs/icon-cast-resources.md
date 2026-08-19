# 角色 / 图标资源清单（可代码编辑，不调生图）

约束：单文件 HTML、离线、无 CDN。用法是 **网页里挑 → 下 SVG / 抄 path → 写进教具或 `pi/assets/`**。不要把整站运行时打进教具。

先看带「推荐先看」的。许可以各站当前页面为准，商用前点开那一枚核对。

---

## 0. 一个入口搜完全部（先逛这个）

| 名字 | 地址 | 说明 |
|------|------|------|
| **Icônes**（推荐先看） | https://icones.js.org/ | 浏览器里搜 200+ 套开源图标，点一下复制 SVG |
| Iconify 图集 | https://icon-sets.iconify.design/ | 同上数据源，按套浏览 |
| Iconify 官网 | https://iconify.design/ | 文档；有搜索 API，只适合「生成时查」，不要运行时拉 |

中文搜：在 Icônes 里搜 `cow` `magpie` `clothes` `bridge` `sun` `moon`。

---

## 1. 线框图标（MIT / ISC，协议干净）

| 名字 | 地址 | 许可 | 适合 |
|------|------|------|------|
| Lucide | https://lucide.dev/icons/ | ISC | 结构清楚的日用图标 |
| Tabler | https://tabler.io/icons | MIT | 比 Lucide 全 |
| Phosphor | https://phosphoricons.com/ | MIT | 更圆，按钮友好 |
| Heroicons | https://heroicons.com/ | MIT | 少而干净 |
| Lucide GitHub | https://github.com/lucide-icons/lucide | ISC | 下源码 SVG |

教具里只内联用到的那几枚 path，不要整包。

---

## 2. 彩色 Emoji SVG（牛 / 鹊 / 月现成）

| 名字 | 地址 | 许可 | 注意 |
|------|------|------|------|
| **Noto Emoji SVG** | https://github.com/googlefonts/noto-emoji/tree/main/svg | Apache 2.0 / OFL | 优先。彩色 SVG，可内联改色有限 |
| Noto 在 Icônes | https://icones.js.org/collection/noto | 同上 | 网页复制 SVG |
| Fluent Emoji | https://github.com/microsoft/fluentui-emoji | MIT | 偏 3D，文件偏大 |
| Twemoji | https://github.com/twitter/twemoji | CC BY 4.0 | 要署名 Twitter/X |
| OpenMoji | https://openmoji.org/ | CC BY-SA 4.0 | ShareAlike，改过还要同许可，教具库不优先 |

系统里直接写 `🐂🐦` 当按钮可以；主图不要只靠系统 emoji（各系统长得不一样）。

---

## 3. 人物拼装（CC0，头/身/手分开）

| 名字 | 地址 | 许可 | 说明 |
|------|------|------|------|
| **Open Peeps** | https://www.openpeeps.com/ | CC0 | 手绘人，零件可拼；下载库看站内 Download |
| Open Peeps npm | https://github.com/opeepsfun/open-peeps | 跟源 CC0 | 程序拼人 |
| 在线拼 Peeps | https://www.opeeps.fun/ | — | 浏览器里拼完再导出 |
| **Humaaans** | https://www.humaaans.com/ | CC0 | 更扁平的人 |
| Open Doodles | https://www.opendoodles.com/ | CC0 | 同一作者，场景涂鸦 |

适合「牛郎/织女」这种人，不适合牛、鹊——动物还是用 Noto 或自己写函数。

---

## 4. 程序生成 SVG（生成时跑，不打进教具）

| 名字 | 地址 | 说明 |
|------|------|------|
| **DiceBear** | https://www.dicebear.com/ | 多种 style，Node/API 出 SVG 字符串再贴进 HTML |
| Open Peeps 在 DiceBear | https://www.dicebear.com/styles/open-peeps/ | 上面那套的程序入口 |
| DiceBear 文档 | https://www.dicebear.com/how-to-use/js-library/ | `@dicebear/core` + style 包 |

**不要**把 DiceBear 运行时塞进单文件教具。只在 `/create` 或整理资产时跑一次，得到 SVG 源码。

---

## 5. 故事道具 / 兽 / 桥

| 名字 | 地址 | 许可 | 说明 |
|------|------|------|------|
| game-icons.net | https://game-icons.net/ | CC BY 3.0 | 兽、桥、道具多；要署名 |
| game-icons GitHub | https://github.com/game-icons/icons | 同上 | SVG 源文件 |
| SVG Repo | https://www.svgrepo.com/ | 按枚标注 | 先过滤 MIT / CC0 |

---

## 6. 中文站（素材多，许可要逐枚看）

| 名字 | 地址 | 说明 |
|------|------|------|
| **Iconfont** | https://www.iconfont.cn/ | 免费搜、免费下 SVG。无官方开放 API。每个图标自己的授权，标「免费使用」才好进教具 |
| 单个图标用法 | https://www.iconfont.cn/help/detail?helptype=code | 选 **SVG 下载**，不要 Font / 外链 `at.alicdn.com` |
| Iconfont 用户协议 | https://terms.alicdn.com/legal-agreement/terms/platform_service/20220704165734807/20220704165734807.html | 许可总则 |
| iconfont-plus issues | https://github.com/thx/iconfont-plus | 官方不提供下载 API 的讨论 |

社区批量下载脚本、非官方 CLI **不要接进生成链路**。人在网页下好，再放进仓库。

---

## 7. 自己写函数（零依赖，最好改）

不指向外站。仓库里准备：

```text
pi/assets/cast/bean.js     豆人
pi/assets/cast/cow.js      牛（必须有角、蹄）
pi/assets/cast/magpie.js   鹊（必须有翅、尾）
pi/assets/icons/*.svg      从上面库挑 20–30 个抄进来
```

写手只 `read` 后复制进 HTML。新角色 = 加一个函数，不是再调生图。

---

## 建议你怎么点

1. https://icones.js.org/collection/noto — 搜 cow / bird / clothing  
2. https://www.openpeeps.com/ — 看人能不能拼出牛郎织女  
3. https://lucide.dev/icons/ — 看日用图标全不全  
4. https://www.iconfont.cn/ — 中文搜「喜鹊」「老牛」，只看免费可商用、下 SVG  
5. https://www.dicebear.com/styles/open-peeps/ — 看程序拼人效果  

看完可以说：主图用 Noto / 自写函数，人用 Open Peeps，中文缺口用 Iconfont 补几枚。再决定要不要我往仓库落第一批零件。

---

## 8. 可进一步测试的内容及方案

目标：确认「免注册、程序化、出 SVG、能进 pi 工具、成品仍离线」。**不测生图 LLM。**  
已做过冒烟（2026-08-18）：Iconify 搜 `cow`、拉 `noto:cow-face` SVG、DiceBear Open Peeps，均 HTTP 200、无 Key。

### 8.1 测什么（按优先级）

| 序号 | 测什么 | 方案 | 怎么算过 | 不过怎么办 |
|------|--------|------|----------|------------|
| T1 | Iconify 搜索稳不稳 | 中英词：`cow` `喜鹊` `bridge` `clothes` `moon`；限制套件 `noto,lucide,ph,game-icons` | 每次有 id 列表 + collection 许可字段 | 换词或只测英文；中文不行就工具里只收英文 query |
| T2 | Iconify 拉 SVG | `GET https://api.iconify.design/{prefix}/{name}.svg?height=64` 对 T1 命中各拉 1 枚 | 正文以 `<svg` 开头，体积合理（彩色 emoji 约 2–20KB） | 改拉 JSON body 自己拼 path |
| T3 | 孩子认不认得 | 把 T2 的牛、鹊、衣、月贴进一张空白 HTML，和牛郎那版土豆牛并排 | 3 秒内能说出是什么 | 该物改自写函数，图标只当按钮 |
| T4 | 内联进一幕教具 | 复制 SVG 进 `samples/made` 测试页，禁止外链 | 断网打开仍显示；改 `fill` / `transform` 能动 | 路径带外链 `<image>` 的丢掉 |
| T5 | DiceBear 拼人 | `GET https://api.dicebear.com/9.x/open-peeps/svg?seed=niulang` 与 `seed=zhinu` | 两段不同 SVG，像人 | 人设走 Open Peeps 手工零件 |
| T6 | DiceBear 商用边界 | 读 https://www.dicebear.com/how-to-use/http-api/ 与 https://www.dicebear.com/licenses/ | 记下：公网 API 官方写非商用免费；style 许可跟源 | 商用改 `@dicebear/core` 本地，不打公网 |
| T7 | 本地 npm（离线创建） | 生成机 `npm i @iconify/json @dicebear/core @dicebear/open-peeps`，不联网搜/出 SVG | 与 T1/T5 结果同类 | 只 vendor `noto`+`lucide` 减小体积 |
| T8 | 体积 | 一枚 Noto 牛 + 一枚 Lucide + 一个 Open Peeps 人，合计进单文件 | 三角色 < 40KB 为佳；单枚 >30KB 不当主图六幕复用 | 减 viewBox / 只用线框 |
| T9 | 许可抽检 | Noto、Lucide、Phosphor、game-icons、Iconfont 各打开 1 枚授权页 | 能写进清单：许可 + 要不要署名 | Iconfont 非「免费使用」的不进库 |
| T10 | Iconfont 人工流 | 网页搜「喜鹊」「老牛」，下 SVG，人工贴进测试 HTML | 能改色、能离线 | 不接爬虫；只当补洞 |
| T11 | pi 工具草样（未接代码前） | 手跑两步当未来 `icon_search` / `icon_svg`：先 search 再按 id 拉 svg | 写手能只凭工具输出拼进 HTML | 接口变了再包一层 |
| T12 | 和自写函数对比 | 同一幕：Noto 牛 vs `cow(x,y)` 函数 | 函数更好改姿势则主图用函数，图标当道具 | 函数先做牛/鹊/豆人三个 |

### 8.2 可直接复制的探测命令

```bash
# T1 搜索
curl -sS 'https://api.iconify.design/search?query=cow&limit=8'

# T2 拉 SVG
curl -sS 'https://api.iconify.design/noto/cow-face.svg?height=64' -o /tmp/cow.svg

# 限定套件（文档：prefixes）
curl -sS 'https://api.iconify.design/search?query=bridge&prefix=lucide,noto,game-icons&limit=8'

# T5 拼人
curl -sS 'https://api.dicebear.com/9.x/open-peeps/svg?seed=niulang' -o /tmp/niulang.svg
curl -sS 'https://api.dicebear.com/9.x/open-peeps/svg?seed=zhinu' -o /tmp/zhinu.svg
```

文档：  
https://iconify.design/docs/api/  
https://iconify.design/docs/api/svg.html  
https://iconify.design/docs/api/search.html  
https://www.dicebear.com/how-to-use/http-api/

### 8.3 建议测试顺序（你点网页 + 我可代跑命令）

1. 你先用眼睛：Icônes Noto 牛/鹊、Open Peeps 人、Lucide 日用（§建议你怎么点）。  
2. 再跑 T1/T2/T5 命令，确认和网页是同一套图。  
3. T3/T4/T8：贴进一张本地 HTML，断网看、看体积。  
4. T6/T9：决定公网 API 能不能进商用创建机。  
5. 过了再谈 T7/T11：本地包 + `pi/tools` 的 `icon_search` / `icon_svg`。

### 8.4 先不测

- Iconfont 非官方爬虫 / 登录 Cookie  
- 把 `api.iconify.design` 写进教具 HTML  
- gpt-image-2 / Imagine 出角色卡  
- 整包 `@iconify/json` 打进单文件教具

### 8.5 独立接口实测（2026-08-18，无 Key）

| 项 | 结果 | 写进工具的约束 |
|----|------|----------------|
| T1 `cow` / `clothes` / `moon` | HTTP 200，有 `icons` + `collections.license` | 可接 `icon_search` |
| T1 `喜鹊` / `magpie` / `鹊` / `鸟` | HTTP 200，`icons: []` | 中文几乎无效；工具把「喜鹊」译成 `bird` 再搜 |
| T1 `prefix=lucide,noto,game-icons` | **空列表**（单数 `prefix` 多套件无效） | 必须用 **`prefixes`（复数）** |
| T1 `prefixes=lucide,noto,game-icons` + `bridge` | 命中 `game-icons:bridge` 等；Lucide **没有** bridge | 404 当「没有这枚」，换套件 |
| T1 `limit=5` | 接口仍回 32 条 | 工具侧自己截断 |
| T2 `noto/cow-face` `noto/bird` `lucide/shirt` `noto/full-moon-face` `game-icons/cow` | 200，正文 `<svg`，2KB / 1.6KB / 375B / 2.6KB / 2.3KB | 无 `<image>` 外链 |
| T2 `lucide/bridge` | 404 `Not found` | 工具报「没有这枚图标」 |
| T5 DiceBear `seed=niulang` / `zhinu` | 200，两段 **不同** SVG，11.4KB / 13.3KB | 可接 `dicebear_svg` |
| T8 三角色体积 | Noto 牛 2KB + Lucide 衫 0.4KB + Peeps 人 ~12KB ≈ **15KB** | 低于 40KB 目标 |
| T11 手跑 search→svg | curl 正常；裸 `urllib` 曾 403 | 请求带 `User-Agent` |
| T3 / T4 / T6 / T9 / T10 / T12 | 未自动化（认图/断网页/许可页/Iconfont 人工/函数对比） | 成品仍禁止外链 URL |

已接入 pi 工具：`icon_search` `icon_svg` `dicebear_svg`（`pi/tools/icon-cast.ts`）。写手白名单已开。不接 Iconfont。

---

## 9. 成本 × 效果（2026-08-18 对照本场牛郎织女）

约束不变：单文件离线、不调生图 LLM、生成时可以拉 SVG，成品禁止外链。

本场实测：Noto 牛认得出；Peeps 认得出「是人」认不出「是牛郎织女」；正戏 `addPerson()` 建空 `<g>`，人只活在开场层；喜鹊仍是手画三角。

### 9.1 方案对照

| 方案 | 钱 | 每次生成成本 | 孩子认不认得 | 能改姿势 | 离线 | 结论 |
|------|----|--------------|--------------|----------|------|------|
| 当场手写 `bean()`/`person()` | 0 | token 少 | 差（断肢、空舞台） | 最好 | 是 | 禁止当主角色 |
| DiceBear Open Peeps | 0；**公网 HTTP API 官方写非商用** | 高：每枚 ~11KB，write 易撞 token | 是现代路人，不是古装角色 | 差 | 生成时要网 | 只给无名同学 |
| Noto / Fluent 身份符 | 0；Noto Apache 2.0 | 低：牛/鸟 2–4KB | **物和身份强**（牛、鸟、农夫、仙女、皇冠、和服） | 弱 | 内联即离线 | **道具 + 身份首选** |
| Humaaans / 手工 Peeps 零件 | 0，CC0 | 一次人工拼 | 比随机 seed 可控，仍偏现代扁平人 | 中 | 是 | 备选，不如 Noto 身份符 |
| 仓库 `<symbol>` 套件 | 一次人工 1–2h | **0 网、0 大段 SVG 进 write** | 最稳：挑好的那几枚 | 位移/`<use>` | 是 | **故事人物主路径** |
| 生图 LLM | 贵、难改 | 很高 | 高但不稳 | 几乎不能 | 位图 | 不做 |

Iconify 本场可搜到（免 Key，`prefixes=noto,fluent-emoji,twemoji`）：

- 人：`noto:man-farmer` `noto:woman-farmer` `noto:princess` `noto:fairy` `noto:person-with-crown` `noto:kimono`
- 兽/鸟：`noto:ox` `noto:cow` `noto:bird` `noto:black-bird`（无 magpie）
- 避开：Twemoji（要署名 X）、OpenMoji（ShareAlike）、Fluent 3D（偏大）

### 9.2 建议怎么配（兼顾成本和效果）

1. **仓库固定 6 枚**（一次抄进 `pi/assets/cast/`，以后 `/create` 不再赌模型手画）  
   `ox` `bird` `man-farmer` `fairy` 或 `princess` `person-with-crown` `kimono`  
   HTML 里 `<symbol id="cast-ox">` + 运行时 `<use href="#cast-ox">`。正戏克隆走 `<use>`，不要再 `createElement` 空组。
2. **新物件**才 `icon_search` + `icon_svg`（月、桥、衣）。小 SVG 可直接贴；人不要靠 Peeps 默认 seed。
3. **Peeps / DiceBear** 降级：只给「同学甲/乙」。故事主角不用。商用创建机不要打公网 DiceBear API，改本地 `@dicebear/core` 或不用。
4. **自写函数**只留手脚连上的豆人（`pi/assets/cast/bean.js`），给数学/安全无名同伴。
5. **不接**生图、Iconfont 爬虫。

### 9.3 为什么比「每次现场调 tool」便宜又稳

- 6 枚 Noto ≈ 15–25KB，整份教具可接受；Peeps 复制 7 次会到 100KB。  
- `<use>` 解决「注入只填静态 HTML、JS 新建空组」——这是本场正戏没人的根因，不是库本身坏了。  
- 农夫/仙女/皇冠语义对孩子比对随机卷毛眼镜便宜得多，也比再调一次生图便宜。  
- 缺口（汉服、喜鹊）用 `bird` + 自写翅尾，或人在 Iconfont 下 1 枚免费 SVG 进仓库，不进自动链路。

---

## 10. 纯文本 LLM + 代码/技能出图（和生图模型比）

「DeepSeek 类只出字，再靠 skill/代码变成图」是有的，而且正好是教具该走的路。论文和本场生成都说明：**让文本模型直接写 `<path d>` 当插画，代码能跑、样子不行。**

### 10.1 有哪些接法

| 接法 | 文本模型干什么 | 谁负责「像」 | 钱 | 可编辑 | 适不适合本仓库 |
|------|----------------|--------------|----|--------|----------------|
| **A. LLM 直接写 SVG/Canvas** | 整段 `d=` / `fillRect` | 模型自己 | 只付文本 token | 难改、易断肢 | 已验证失败（豆人、三角鹊） |
| **B. LLM 写场景 JSON + 仓库渲染器** | `{who:牛郎, x, action:走}` | `symbol` / 函数 | 文本 token + 0 生图 | 改 JSON 就动 | **最合适** |
| **C. LLM 调 icon_search / icon_svg** | 选英文词、选 id | Noto 等现成 path | 文本 + 免费 API | 内联 path 可动 | 物/身份符；人不靠 Peeps |
| **D. Mermaid / 数轴 / 格子** | 写图语法 | 固定渲染 | 几乎 0 | 结构图很好 | 只适讲解图，不适角色 |
| **E. 专用 Text-to-SVG 模型**（OmniSVG、LLM4SVG、StarVector） | 提示词 | 另内部署的模型 | GPU/运维 | 中 | infra 重，不值 |
| **F. Recraft 等「能出 SVG 的生图」** | 提示词 | 付费生图 | ~$0.04/张量级 | 仍难局部改 | 贵、破离线单文件 |
| **G. 本地 Flux/SD 快模型** | 提示词 | 本机 GPU | 电+显存 | 位图 | 用户已否决生图 |

DeepSeek-V4 Flash 这类模型写 **结构、选项、动画控制** 便宜且够用；写「像一个人」的贝塞尔曲线不行。ACM 2025 对比也是：LLM 直出 SVG 合法但平、空。

仓库里已有的 skill（`gpt-image-2`、Imagine）属于 F/G，不走。

### 10.2 和本场的对应

- 牛好看 = **C**（Noto path 贴上了）。  
- 开场 Peeps 像路人 = **C 选错库**。  
- 正戏没人 = **B 没做完**：运行时 `createElement('g')` 没有走 `<use href="#cast-niulang">`。  
- 三角鹊 = 退回 **A**。

所以「纯文本 + 代码出图」不是新发明，是把 DeepSeek 的职责收窄：**只调度，不画脸。**

### 10.3 推荐组合（成本优先、效果够认）

```
DeepSeek（现有 create）
  → 选 symbol 名 / 写关卡 JSON / 写「答对后 cx 怎么变」
  → 仓库渲染器：<symbol> + <use> + 已有 JS
  → 缺的物：icon_svg 补一枚 Noto
```

一次人工把 6 枚 Noto（牛、鸟、农夫、仙女/公主、皇冠、和服）放进 `pi/assets/cast/` 之后，每场生成 **不再付生图费、不再往 write 里塞 11KB 人**。孩子认「牛/鸟/农夫/仙女」，比随机 Peeps 准，比再调 Imagine 便宜两个数量级。

汉服级还原：人在 Iconfont 下 1 枚进仓库，或以后再加自写连肢函数；不要让 DeepSeek 当场发明。

---

## 11. 出图三档（产品路由）

按你的划分落地。先判断「这张图有多通用、能不能用一句话点名」，再选档，不要三档一起用在同一个角色上。

| 档 | 什么图 | 怎么出 | 成品怎么进教具 |
|----|--------|--------|----------------|
| **1 工具** | 小颗粒、词表稳定：表情、牛/鸟/月/衣/桥/皇冠、农夫/仙女符号 | `icon_search` → `icon_svg`（或仓库已抄的 `<symbol>`） | 内联 SVG；正戏 `<use href="#id">` |
| **2 生图 LLM** | ~~故事人物位图~~ **暂关** | `cast_image` / GPT Image 2 **未注入** `/create` | 人物改走 `cast_roster`；动物/物走 `cast_search` |
| **3 文本 LLM + skill** | 过程图、结构图、以及 1/2 都没有时 | DeepSeek 写 SVG/Canvas/`cx` 动画（图解.md） | 代码即图；**兜底**，脸和动物质量不稳 |

路由：能进 1 就不进 2；2 没挂工具或体积爆就回 1 的身份符（`man-farmer`/`fairy`），再不行才 3。过程动画（搬块、划河、搭桥）**永远 3**，不要生 6 张静帧冒充过程。

线上 `/create` 现状：1 和 3 已通；人物/动物走本地库（`cast_roster` / `cast_search`）；**2（GPT Image 2）暂不注入**。

和 Peeps：算 1 的弱替代，只给无名同学，不当牛郎织女。

