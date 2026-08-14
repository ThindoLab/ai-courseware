---
name: pinyin-drag
description: 拼音/汉字拖拽组合练习（声母韵母、偏旁部首组字）
type: drag-slot
module: preschool
license: free-share
author: demo
---
# 拼音拖拽练习

面向学前拼音/汉字组合。content 要点：
- slots 为待填空位，tokens 含正确项 + 1–2 干扰项
- solution 给出 slotId -> tokenId
- feedback 讲清组合规则（如声母+韵母+声调）

流程：knowledge_search -> get_schema -> render_artifact。只填 content，不写 HTML 骨架。
