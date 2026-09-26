import { specVersions } from "../src/lib/specs";
import { interviewerSystem, writerSystem, celebSystem, judgeSystem, recorderSystem } from "../src/lib/prompts";
import { judgeTaskSystem, querySystem, translateSystem } from "../src/lib/jobPrompts";
import { leaksInterpretation } from "../src/lib/interview";
import { splitBold } from "../src/lib/result";
import { onet } from "../src/lib/onet31";

// AI를 부르지 않고 스펙 조립·지시문·데이터가 제대로 들어가는지 점검한다.
const NAMES = /알기|짜기|다루기|이끌기|돌보기|꺼내기/;
console.log("스펙 버전:", specVersions());
const kinds = ["exp1", "exp2", "hardship", "advice"] as const;
for (const k of kinds) {
  const t = interviewerSystem(k);
  console.log(`인터뷰어[${k}] ${t.length}자`, "| 결과지 규칙 섞임?", /가치관·성향\(통합\)/.test(t), "| 실명?", /영훈|박종경/.test(t),
    "| 기록필드 표?", t.includes("experience_id"), "| 행동 설명 기준(없어야 함)?", t.includes("헷갈리는 차이"), "| 옛 코어 이름?", NAMES.test(t));
}
const r = recorderSystem("exp1");
const j = judgeSystem();
console.log("기록정리[exp1]", r.length, "자 | 행동 설명 기준 포함?", r.includes("헷갈리는 차이"), "| 옛 코어 이름?", NAMES.test(r));
console.log("코어판정", j.length, "자 | 행동 설명 기준 포함?", j.includes("헷갈리는 차이"), "| 같은 코어 규칙?", j.includes("애매하면 다른 코어"), "| 옛 코어 이름?", NAMES.test(j));
const w = writerSystem();
console.log("결과지작성", w.length, "자 | 실명 남음?", /영훈|박종경/.test(w), "| 옛 코어 이름?", NAMES.test(w), "| 직무와 연결하면 남음?", w.includes("bridge"));
const c = celebSystem();
console.log("유명인 사례", c.length, "자 | 생존자 편향 규칙 포함?", c.includes("생존자 편향"), "| 검증 절차 포함?", c.includes("검증된 사례"));
console.log("직업 검색 문장", querySystem().length, "자 | 업무 판정", judgeTaskSystem().length, "자 | 근거 번역", translateSystem().length, "자");
const o = onet();
console.log("O*NET: 업무 문장", o.byText.size, "| 직업", o.textsBySoc.size, "| 제외", o.excluded.size, "| 한국어 이름", Object.keys(o.ko).length);
console.log("굵게 표시:", JSON.stringify(splitBold("필름을 편집해 [[조각을 순서대로 잇는다]].")), JSON.stringify(splitBold("[[한쪽만")));
console.log("인터뷰 유출검사 회귀:", leaksInterpretation("이거 짜기 유형이시네요"), leaksInterpretation("그때 뭘 하셨어요?"));
