# 离线图解增强（调研结论）

产品约束：**单文件 HTML、离线、无 CDN**。教室白板 / 家庭平板要能双击打开。因此不能把 Three.js、GSAP、Lottie、外链 GIF/MP4 写进教具。

## 调研过、不采用（生成时）

| 方案 | 为什么不进教具 |
|------|----------------|
| Three.js / Babylon / model-viewer | 要外链或上百 KB 运行时；低龄立体用 CSS 3D 足够 |
| GSAP / anime.js / Motion | 缓动库，能抄关键帧语义，不必带库 |
| Lottie / GIF | 体积大、不可调参、reduced-motion 差 |
| D3 / Chart.js / Mermaid | 偏数据图，不是儿童过程图解 |
| `image_gen` / 视频 skill | 出的是位图或外链资源，不是可拖滑块的关系图 |

这些库的**手法**可以学（ease-out、stagger、粒子上限），写法要内联。

## 采用（写进 `pi/角色/图解.md`）

| 能力 | 原生手段 | 典型知识点 |
|------|----------|------------|
| 2D 关系 | 内联 SVG，改 `x`/`cx`/`d`/`width` | 影子、分数扇区、行程 |
| 过程动画 | CSS `@keyframes` / `transition` / WAAPI | 切开、搬格、拉长 |
| 伪 3D | `perspective` + `rotateY`/`rotateX` | 正方体翻面、展开 |
| 粒子 | Canvas 2D ≤40 点 | 气态 / 蒸汽 |
| 无障碍 | `prefers-reduced-motion` 停循环，保留终态 | 全部 |

`qa_check` 会警告：没有 `<svg>` / `perspective` / `<canvas>`，或没有任何 motion。

## 写手怎么接到

教练派写手前要求 `read pi/角色/图解.md`。禁止 CDN 与只改数字。体积目标仍是整份教具大约 8–20KB 可读（复杂题可略超）。
