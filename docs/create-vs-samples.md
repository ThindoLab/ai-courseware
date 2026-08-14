# 「生成教具」与样例库的关系

实现以 `pi/教练.md`（排程）+ `pi/角色/`（岗位）+ `pi/tools/match-sample.ts` 为准。总览见 [`04-architecture-design.md`](./04-architecture-design.md)。

## 用户侧

本阶段只输入**一句话**。不选内容模块、不选教具类型。

## 两条交付，由主流程决定

| 路径 | 谁决定 | 做什么 |
|------|--------|--------|
| **样例库页** | 人点预览 | 直接打开 `samples/*.html` |
| **生成 · 交付精品** | Agent 先调 `match_sample`，高置信再 `use_sample` | 与样例库页同源，`fromSample: true` |
| **生成 · 新写** | 未命中后 `write` + `qa_check` | 现场 HTML，`fromSample: false` |

## 匹配怎么做（工具，不是代码门闹）

`match_sample`：

1. 用**大类标签**缩小范围（math / safety / english / preschool…）  
2. 先画像/别名计分；不够确定再调小模型比短画像相似度  
3. 过短、泛词、弱包含 → 未命中  

画像在 `pi/samples/portraits.json`，给人审。  
禁止：单字乱配、同类型随便塞第一份、用旧 `output/` 冒充。

`CREATE_FORCE_LLM=1`：跳过交付精品，匹配结果只当参考。

## 使用建议

- 一句话接近精品主题（如「平均数」「鸡兔同笼」）→ 通常秒回样例。  
- 新知识点 → 走写作；需本机模型；看五硬核分。  
- 失败会明确报错，不会变成无关的「小熊凑十」。
