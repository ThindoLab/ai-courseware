# 前端动画质量规范（供 agent 生成教具时强制遵循）

**版本**：v1.0  
**来源**：xueai.app Slides 深度分析（training-data、train-vs-infer、1-2-gpt、fake-chat、prompt-attack-cases 等页）  
**目的**：让生成的 HTML 教具达到专业教学课件级交互质感，避免「静态卡片 + 简单按钮」。

---

## 铁律（必须 100% 遵守）

1. **状态驱动多元素联动**  
   任何可交互控件（slider、按钮、拖拽）必须同时更新 ≥4 个视觉元素：数字/文案 + 卡片 class + 进度/图标 + 状态色。参考 training-data scaleSlider。

2. **错误反馈三件套**  
   错误必须同时触发：
   - shake 动画（@keyframes shake）
   - 状态色卡片（is-hallucination / is-danger / is-wrong）
   - 允许重选（错误项禁用但正确项保留）

3. **Stagger 阶梯进场**  
   列表、图标、气泡、token 必须使用 15ms 阶梯：
   ```js
   setTimeout(() => el.classList.add('in'), i * 15)
   ```
   CSS：`.item { opacity:0; transform:scale(0.5); } .in { opacity:1; transform:scale(1); }`

4. **缓动函数**  
   数据可视化 / 进度类过渡统一使用 `cubic-bezier(0.25,1,0.5,1)`。普通 UI 用 `ease`。

5. **动画时长约束**  
   所有 transition / animation 控制在 0.15s–0.9s。移动端自动降级（禁用长动画）。

6. **Bad/Good 切换或算法 Tab**  
   复杂概念优先用「中招版 vs 防御版」一键切换，或「CNN/RNN/BERT/GPT」式 Tab 形式呈现。参考 prompt-attack-cases 和 1-2-gpt。

7. **打字机 + 光标**  
   生成 / 补全 / 消息类演示必须带光标闪烁（`.cursor { animation: blink 0.85s step-start infinite; }`）。

8. **注意力 / 记忆可视化**  
   需要解释「关注」「遗忘」「因果」时，必须用方向色条 + 权重 cell（BERT 热图）或指数衰减柱（RNN 记忆）。

---

## 推荐组件（直接 copy 使用）

### A. SliderMultiUpdate（param-visual 首选）
```html
<input type="range" ... oninput="updateAll(this.value)">
```
```js
function updateAll(v) {
  // 1. 大数字 pop
  // 2. 卡片 class 切换（is-hallucination / is-correct）
  // 3. 进度条 width
  // 4. icon-grid 重建 + stagger
  // 5. 文案 / 颜色同步
}
```

### B. ErrorFeedback（branch-story / drag-slot 必备）
```css
@keyframes shake { ... }
.is-wrong { border-color: var(--danger); background: rgba(220,38,38,0.03); }
```
```js
card.classList.add('is-wrong', 'shake');
setTimeout(() => card.classList.remove('shake'), 400);
```

### C. StaggerList
```js
function addStaggerItems(container, items, delay = 15) {
  items.forEach((item, i) => {
    const el = createItem(item);
    container.appendChild(el);
    setTimeout(() => el.classList.add('in'), i * delay);
  });
}
```

### D. BadGoodDemo（branch-story 错误后果）
```html
<button onclick="setMode('bad')">中招版</button>
<button onclick="setMode('good')">防御版</button>
```
```js
function setMode(mode) {
  bubble.className = mode === 'bad' ? 'bubble b-bad' : 'bubble b-good';
  // 同时更新分析行
}
```

### E. TypingCursor
```html
<span class="cursor-blink"></span>
```
```css
.cursor-blink { animation: blink 0.9s step-start infinite; }
@keyframes blink { 50% { opacity:0; } }
```

---

## 禁止事项

- 禁止使用 linear 缓动做数据可视化。
- 禁止错误后直接禁用所有选项（必须保留正确项可重选）。
- 禁止动画时长 > 1s 或使用复杂 easing（除非特殊需求）。
- 禁止只有 emoji 做危害后果，必须搭配 SVG 场景图 + 三段式文字。
- 禁止静态卡片堆砌，必须有至少一个「可动手」的交互点。

---

## 验收 Checklist（生成后 read 回读）

- [ ] 是否实现了至少一个 Slider / 步进器驱动的多元素联动？
- [ ] 错误反馈是否同时包含 shake + 状态色卡片 + 重选？
- [ ] 列表/气泡是否使用了 stagger 进场？
- [ ] 是否使用了 Bad/Good 或 Tab 形式呈现复杂概念？
- [ ] 所有过渡是否使用了推荐缓动函数？
- [ ] 移动端是否自动降级？

---

**本规范已同步注入 system.md 铁律 20 及各类型 SKILL.md**。违反本规范的生成视为质量不达标，需回滚重做。