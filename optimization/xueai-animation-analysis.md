# xueai.app Slides 前端动画深度分析报告

**分析日期**：2026-08-05  
**分析范围**：learn.html 壳 + training-data.html、train-vs-infer.html、1-2-gpt.html、1-2-fake-chat.html、prompt-attack-cases.html 等 5 个核心课件页（含 shared lesson.css 风格）  
**目标**：提取高质量、可复用的前端动画模式，用于提升 AI 教具（param-visual / branch-story / drag-slot）的交互质感与教学效果。

---

## 1. 整体设计哲学

- **自包含单文件**：每个 lesson 都是完整 HTML（内联 style + script），仅依赖共享 lesson.css。零外部依赖（无 GSAP、无 Three.js），完美匹配我们「单文件教具」约束。
- **状态驱动 UI**：一个数据源（数组 / 对象）驱动多个 DOM 元素的同步更新（slider → 大数字 pop + 卡片 class + icon stagger + 进度条）。
- **微交互优先**：大量使用 0.15s–0.4s 的短时动画（pop、shake、stagger、fade），避免长时间 loading。
- **教学即交互**：动画不是装饰，而是「让用户亲手感受概念」的载体（CNN 窗口滑动、RNN 记忆衰减、GPT 因果生成、Prompt 攻击切换 bad/good）。
- **主题友好**：data-theme 切换时，动画颜色 / 缓动均平滑过渡。

---

## 2. 动画分类与实现代码片段

### 2.1 进入与反馈类（最通用）

**页面淡入**
```css
body { opacity:0; animation: _si 0.15s ease 0.08s forwards; }
@keyframes _si { from{opacity:0} to{opacity:1} }
```

**Pop 缩放反馈**（training-data big-num）
```css
.big-num.pop { transform: scale(1.06); }
```
```js
bigNum.classList.remove('pop');
void bigNum.offsetWidth;
bigNum.classList.add('pop');
setTimeout(() => bigNum.classList.remove('pop'), 300);
```

**Shake 警示**（train-vs-infer frozen badge）
```css
@keyframes shake {
  0%,100%{transform:translateX(0)}
  20%{transform:translateX(-5px)} 40%{transform:translateX(5px)}
  60%{transform:translateX(-4px)} 80%{transform:translateX(4px)}
}
.shake { animation: shake 0.4s ease; }
```

**Stagger 阶梯进场**（icon-grid、消息气泡、GPT token）
```js
for (let i = 0; i < count; i++) {
  const el = createElement();
  container.appendChild(el);
  setTimeout(() => el.classList.add('in'), i * 15); // 15ms 阶梯
}
```
```css
.icon-unit { opacity:0; transform:scale(0.5); transition: all .15s; }
.icon-unit.in { opacity:1; transform:scale(1); }
```

### 2.2 状态驱动多元素联动（最推荐）

**Slider 实时更新全 UI**（training-data scaleSlider）
```js
function updateScale(v) {
  const s = SCALES[+v];
  // 1. 大数字 pop
  bigNum.textContent = s.num; bigNum.classList.add('pop');
  // 2. 模式 badge 颜色切换
  badge.style.background = bc.bg; badge.style.color = bc.text;
  // 3. 规模类比文案 + 进度条
  visAnalogy.innerHTML = s.analogy; scaleBarFill.style.width = s.pct + '%';
  // 4. icon-grid 重建 + stagger
  grid.innerHTML = ''; for(...) { span.classList.add('in'); }
  // 5. 模型卡片 class 切换（is-hallucination / is-correct）
  card.className = 'model-card ' + VERDICT_CLASS[s.verdict];
}
```

**Corpus 条形图填充**
```css
.corpus-fill { width:0; transition: width .9s cubic-bezier(0.25,1,0.5,1); }
```
```js
setTimeout(() => el.style.width = el.dataset.w + '%', 200);
```

### 2.3 对比与流程可视化

**双栏对比 + 颜色语义**（train-vs-infer）
- `.cmp-col.train { background: rgba(8,145,178,0.05); border-color: rgba(8,145,178,0.2); }`
- `.cmp-col.infer { background: rgba(22,163,74,0.05); border-color: rgba(22,163,74,0.2); }`

**消息气泡进场 + 打字机**
```css
.msg { opacity:0; transform:translateY(6px); transition: all .3s; }
.msg.in { opacity:1; transform:translateY(0); }
```
```js
requestAnimationFrame(() => requestAnimationFrame(() => div.classList.add('in')));
```

**参数点「冻结」闪烁 + shake**（train-vs-infer）
- 发送时随机 8 个 dot 临时改色 400ms 恢复，badge shake。

### 2.4 复杂交互组件（1-2-gpt.html 亮点）

**算法 Tab + 多状态 Token 可视化**
- CNN：滑动窗口高亮（tk-window）
- RNN：每词独立记忆柱（高度 + 颜色按指数衰减）
- BERT：注意力热图（方向色条 + 权重 cell 动画）
- GPT：因果生成 + 光标闪烁 + 概率面板

**GPT 生成光标闪烁**
```css
.gpt-cursor { animation: blink 0.85s step-start infinite; }
@keyframes blink { 50% { opacity:0; } }
```

**Prompt Attack 12 案例切换**
- Nav grid + active 态
- Toggle bad/good 按钮切换气泡 class（b-bad / b-good）+ 分析行
- 视觉上「中招 vs 防御」一键对比

### 2.5 缓动与性能

- 首选 `cubic-bezier(0.25,1,0.5,1)`（带 overshoot，适合数据可视化）
- 所有 transition 控制在 0.15s–0.9s，避免卡顿
- requestAnimationFrame 两次确保 transition 生效
- 移动端自动降级（grid 折叠、字体缩小）

---

## 3. 核心可复用组件清单

1. **SliderMultiUpdate**：一个 range 驱动 N 个 UI 元素（数字、卡片、进度、图标）
2. **StaggerGrid**：icon / token / 气泡阶梯进场
3. **StateCard**：is-hallucination / is-correct / is-danger class 切换
4. **ShakeFeedback**：错误 / 冻结提示
5. **TypingWithCursor**：打字机 + 光标（fake-chat、GPT 生成）
6. **AttentionHeatmap**：BERT 式方向色条 + 权重 cell（可用于 drag-slot 注意力可视化）
7. **BadGoodToggle**：中招 vs 防御一键切换（branch-story 错误后果极佳）
8. **MemoryDecayBars**：RNN 式指数衰减柱（param-visual 参数遗忘可视化）

---

## 4. 对三类教具的具体映射

**param-visual**
- Slider 联动「参数 → 可视化图解 + 错误卡片 + 规模感受」
- 错误态：shake + is-hallucination 红色卡片 + 后果 SVG
- 参考 training-data 的「模型能力随参数量跃升」做「鸡兔同笼 / 分数」难度分级

**branch-story**
- 选择后果用 BadGoodToggle（中招版 vs 防御版）
- 消息气泡 stagger + 打字机
- 错误路径：shake + 危害 SVG 弹层 + 重选按钮
- 参考 fake-chat 的「伪造聊天记录逐步补全」做多轮决策树

**drag-slot**
- 拖放时 param-dot 闪烁 + 错误 shake
- 错放后果用 attention heatmap 式对比图（1 个苹果 is / 2 个苹果 are）
- 参考 GPT token 因果生成做「槽位填入」光标动画

---

## 5. Prompt 增强点（已同步到 animation-guidelines.md）

1. **必须实现 Slider / 步进器驱动的多元素联动**（至少更新 4 个以上视觉元素）。
2. **错误反馈必须包含 shake + 状态色卡片 + 允许重选**。
3. **列表 / 图标 / 气泡必须使用 15ms 阶梯 stagger 进场**。
4. **数据可视化过渡使用 cubic-bezier(0.25,1,0.5,1)**。
5. **复杂交互优先用「Bad/Good 切换」或「算法 Tab」形式呈现**。
6. **所有动画时长控制在 0.15s–0.9s，移动端自动降级**。
7. **打字机 + 光标闪烁** 用于生成 / 补全类演示。
8. **注意力 / 记忆衰减可视化** 用于解释模型机制。

---

## 6. 后续建议

- 继续 fetch 剩余页面（1-2-base.html、1-2-api.html、1-2-sft.html）补充更多模式。
- 把本报告中的「核心可复用组件」逐一实现为可直接 copy 的 HTML 片段，放入 `optimization/prompts/frontend-snippets/`。
- 在 system.md 铁律 20 后新增「动画质量」子条款，强制 agent 遵循以上 8 条。

**结论**：xueai.app 的动画水准极高，且完全符合「教学即交互」理念，是我们教具升级的绝佳参照系。已将核心模式提炼为可直接注入的 prompt 规则。