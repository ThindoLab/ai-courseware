# Remotion 调研:能否作为 pi skill/tool 辅助图文?

## 结论
**不建议为交互式教具引入 Remotion。** 它与本项目核心约束(单文件、离线、≤500KB、可触控交互、无 CDN)根本性冲突。已改用**模板内 SVG/CSS 图文**(bar/pie/rect/icon-grid)达成同等效果,且可交互、零依赖、体积极小。

## Remotion 是什么
- 基于 React 的编程式视频框架(Jonny Burger)。用 `<Sequence>`/`useFrame()` 写组件,`@remotion/renderer`/`npx remotion render` 用无头 Chromium 渲染成 MP4/WebM/GIF。
- Web 内嵌播放:`@remotion/player`(需 React + composition bundle)。

## 三条集成路径评估

| 路径 | 可行性 | 问题 |
|---|---|---|
| `@remotion/player` 嵌入教具 | ❌ | 需 React 运行时 + bundle,非单文件、需构建、依赖 CDN/打包;教具是 vanilla JS |
| 渲染 MP4 嵌 `<video>` | ⚠️ 技术可行但代价高 | ① 渲染需无头 Chromium(@remotion/renderer 重依赖,~数百 MB,慢) ② MP4 易超 500KB,base64 再涨 33% ③ **非交互**(线性视频,滑块拖动无响应) ④ 流水线复杂(临时文件/清理) |
| 渲染 GIF | ❌ | 更大、画质差 |

## 根本矛盾
教具的核心价值是**可交互**(拖滑块即时更新)。Remotion 产出是**线性视频**或 React 播放器,无法响应滑块拖动。模型不匹配。

## 若未来想要"导出动画讲解"
Remotion 适合做**独立的导出视频**功能(如把某教具导出成 10s 讲解动画用于分享),而非教具本体。届时可:
- 加一个 `defineTool` `render_video({type, content, duration})`:生成 Remotion composition -> `@remotion/renderer` 出 MP4 -> 返回路径/base64
- 作为独立导出管线,不影响单文件交互教具
- 列为后续可选阶段(非当前路线图)

## 已采用的替代方案(模板内 SVG/CSS)
param-visual 模板新增 4 种可交互视觉:
- `icon-grid`:计数(鸡兔/植树)
- `bar`:得分/进度(停电安全度)
- `pie`:分数/占比
- `rect`:几何周长面积
- 无 visual 时回退 formula 数值统计片

均为内联 SVG/CSS,随滑块实时更新,零依赖、离线、<1KB 增量。**这就是本项目的"图文"路径,无需 Remotion。**
