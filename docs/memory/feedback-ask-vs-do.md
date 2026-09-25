---
name: feedback-ask-vs-do
description: "사용자가 \"~할까?\", \"흠\", \"어때\", \"생각 말해줘\"처럼 묻는 말투면 작업하지 말고 의견만 답한다"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 5eeede0e-010b-47bc-a6ed-6dcde3a30a26
  modified: 2026-09-20T09:51:56.010Z
---

"달아둘까. 흠"처럼 물음표·망설임이 섞인 말은 지시가 아니라 의견을 묻는 것이다. 코드를 고치거나 배포하기 전에 먼저 생각(장단점·추천)을 답하고, 사용자가 "해줘/적용해/ㄱ"라고 하면 그때 작업한다. (2026-09-21, 랜딩 부제 문구를 묻는 말에 바로 작업하려다 사용자가 중단시킴)

**Why:** 사용자는 토큰 사용을 아끼고 싶어 하고, 결정권은 본인에게 있다고 본다.
**How to apply:** 명령형("~해줘", "수정", "바꿔")이면 바로 작업. 의문형·망설임·"어떻게 생각해?"면 의견만 짧게 답하고 확인을 받는다. 관련: [[user-non-developer-korean]], [[core-finder-project]]
