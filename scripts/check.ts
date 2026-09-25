import { specVersions } from "../src/lib/specs";
import { interviewerSystem, writerSystem, celebSystem, jobPickerSystem, judgeSystem, recorderSystem } from "../src/lib/prompts";
import { shortlist } from "../src/lib/jobs";
import { leaksInterpretation, leaksCoreNames } from "../src/lib/interview";

console.log("스펙 버전:", specVersions());
const kinds = ["exp1", "exp2", "hardship", "advice"] as const;
for (const k of kinds) {
  const t = interviewerSystem(k);
  console.log(`인터뷰어[${k}] ${t.length}자`, "| 결과지 규칙 섞임?", /가치관·성향\(통합\)/.test(t), "| 실명?", /영훈|박종경/.test(t),
    "| 기록필드 표?", t.includes("experience_id"), "| 7단계 표?", t.includes("장면 선택"), "| 판별표(없어야 함)?", t.includes("알기 ↔ 짜기"),
    "| 여섯 단어 내부태그 안내?", t.includes("내부 태그일 뿐"));
}
console.log("기록정리[exp1]", recorderSystem("exp1").length, "자 | 코어판정", judgeSystem().length, "자 | 직업선정", jobPickerSystem().length, "자");
const w = writerSystem();
console.log("결과지작성", w.length, "자 | 실명 남음?", /영훈|박종경/.test(w), "| 새 이름문구 규칙 포함?", w.includes("이름 문구"), "| 예시 문구 포함?", w.includes("빈틈을 그냥 못 지나치는 사람"));
console.log("예시에 여섯 단어가 이름처럼 남았나?", leaksCoreNames(w.split("### 실제 적용 사례")[1] ?? ""));
const c = celebSystem();
console.log("유명인 사례", c.length, "자 | 생존자 편향 규칙 포함?", c.includes("생존자 편향"), "| 검증 절차 포함?", c.includes("검증된 사례"));
console.log("--- 직업 후보 수(알기+짜기)", shortlist(["알기", "짜기"]).length);
console.log("--- 결과지 노출 검사");
for (const t of ["이런 패턴을 '빈틈을 그냥 못 지나치는 사람'이라고 부를 수 있다.", "원인을 알기 전까지는 멈춘다", "이런 패턴을 '알기'라고 부른다", "알기와 짜기가 만나면", "빈틈을 못 지나치는 사람(알기)"])
  console.log(JSON.stringify(t), "→", leaksCoreNames(t));
console.log("인터뷰 유출검사 회귀:", leaksInterpretation("이거 짜기 유형이시네요"), leaksInterpretation("그때 뭘 하셨어요?"));
