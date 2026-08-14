# 创作者 Skill SOP

## 一、写一个技能
1. 新建目录 `skills/creator/<你的技能名>/`（kebab-case，如 `fraction-visual`）
2. 在其中建 `SKILL.md`，按标准格式写 frontmatter + 正文：

```markdown
---
name: fraction-visual
description: 一句话说明这个技能做什么
type: param-visual          # param-visual | branch-story | drag-slot
module: learning-coaching    # learning-coaching | preschool | safety-life | story-culture
license: free-share          # free-share（默认，免费分享）| personal（个人使用）
author: 你的名字
---
# 技能正文
给 Agent 的内容创作指引……（只讲 content 怎么填，不要写 HTML 骨架）
```

3. frontmatter 必填：`name` / `type` / `module`；可选：`description` / `license` / `author`
4. `type` 必须是三种之一；想用新 type 需先在 `templates/` 下配套 `shell.html` + `schema.json`（后续支持）

## 二、生效方式
- 重启服务即可（`npm start`），会扫描 `skills/`（内置类型）+ `skills/creator/`（你的）
- 前端技能下拉会自动列出所有已注册技能
- 用 `GET /skills` 可查看注册表与校验状态

## 三、校验
- `node --test tests/skills.test.ts` 检查所有技能必填字段与 type 合法性
- 缺字段不会被加载（不影响其他技能），但会出现在 `/skills` 的 invalid 列表

## 四、分享与授权
- **free-share（默认）**：可自由复制、分享、二次修改，免费使用。分享就是把 `skills/creator/<name>/` 文件夹给别人，对方放进自己的 `skills/creator/` 即可。
- **personal**：仅个人使用，不建议分享。
- 本框架不内置在线市场/审核；分享 = 文件拷贝。请自行确保内容准确、不侵权。

## 五、示例
见 `skills/creator/math-app-visual/` 与 `skills/creator/pinyin-drag/`。
