# K-12 教具设计借鉴笔记

> 来源:已抓取到本地 `resources/design-refs/`
> - `animate.min.css`(animate.css,97 个 keyframes:bounce/pulse/fadeIn/jello/tada/heartBeat…)
> - `hover-min.css`(hover.css,688 个悬停微交互)
> - `animate-readme.md`(用法)
>
> web_search 因当前模型不支持原生搜索而不可用,改用 curl 直接抓 GitHub raw 真实资源。

## 借鉴要点(面向中小学)

### 1. 视觉风格
- 明亮配色:靛紫/天蓝/橙/绿渐变,大圆角(16–20px),柔和阴影
- 大字号、大触控目标(≥48px),字体友好(PingFang/圆体感)
- 卡片化、留白充足;顶部彩色渐变标题区

### 2. 动画(从 animate.css 借鉴,内联到模板)
| 场景 | keyframe | 作用 |
|---|---|---|
| 数值徽章变化 | jello / pulse | 拖滑块时数字「弹」一下 |
| 图标入场 | bounceIn | 错峰弹出,吸引注意 |
| 结论区 | fadeInUp | 结果平滑出现 |
| 正确/成功 | tada | 庆祝反馈 |
| 提示 | heartBeat | 引导注意 |
| 滑块拖动 | (JS count-up) | 数字递增动画 |
| 按钮按压 | scale + shadow | 微交互 |

### 3. 微交互(从 hover.css 借鉴思路)
- 按钮悬浮:上浮 + 阴影增强
- 按压:scale(0.96)
- 图标悬浮:轻微放大

### 4. 动态装饰
- 背景浮动几何形状(CSS 漂浮动画,纯装饰)
- 成功时星星/彩屑爆发(CSS keyframe,一次性)

### 5. 落地方式
- 所有 keyframes **内联**进模板 `<style>`(不引外链,保持单文件离线)
- 动画由模板自动施加,Agent 只填 content,无需懂动画
- 触控目标、对比度、字号均满足白板触控

## 约束不变
单文件、无外链、≤500KB、离线、触控≥44px。借的是 keyframe 定义与设计原则,不是外链依赖。
