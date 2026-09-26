// 직업 목록 로직의 AI 지시문: 검색 문장 만들기, 업무 문장 판정(근거 재확인도 같은 판정), 근거 번역.
// 규칙의 원문은 결과지 작성 기준 스펙의 "직업 목록 만들기" 섹션이다.
import { jobsSpec } from "./specs";
import { NO_OBJECT, SEARCH_OBJECTS, type Behavior } from "./types";

const OBJECT_LIST = [...SEARCH_OBJECTS, NO_OBJECT].join(" / ");

export function behaviorBlock(b: Behavior): string {
  return `## 행동 설명(판정 기준)
- ① 동작: ${b.action}
- ② 다루는 것의 모양: ${b.shape}
- ③ 기준: ${b.criterion || "(기록에 없음)"}
- 영어로: ${b.en}`;
}

// ── 검색 문장 ─────────────────────────────────────────────────
const QUERY_RULES = `당신은 "코어 찾기"의 직업 목록 담당입니다. 한 사람의 행동 설명을 받아, O*NET 업무 문장(영어)을 임베딩으로 검색할 영어 검색 문장을 만듭니다.

## 할 일
- 아래 대상 20개(검색용 대상 19개 + "${NO_OBJECT}") 각각에 대해 items에 하나씩, 모두 20개를 씁니다: ${OBJECT_LIST}
- 대상마다 두 말투로 씁니다.
  - daily: 그 대상에서 이 행동을 하는 모습을 일상 말투로 쓴 영어 한 문장.
  - onet: O*NET 업무 문장 말투(동사로 시작 + 대상 + 목적)로 쓴 영어 한 문장.
- **바꾸는 건 대상뿐입니다.** 동작(①)·다루는 것의 모양(②)·기준(③)은 그대로 남깁니다. 좋음: "Arrange video scenes into a sequence so the story flows." 나쁨: "Edit video."(방식이 빠져 영상 편집 전반이 끌려온다)
- 문장이 매끄러울 필요는 없습니다. 의미만 통하면 됩니다.
- 대상과 행동이 도무지 어울리지 않으면 applicable을 false로 하고 두 문장은 빈 문자열로 둡니다(예: 수식의 순서를 매끄럽게). 조금이라도 말이 되면 true로 씁니다.
- "${NO_OBJECT}"은 대상을 넣지 않고 행동만 쓴 문장입니다. 항상 applicable true로 씁니다.`;

export function querySystem(): string {
  return `${QUERY_RULES}\n\n# [스펙: 직업 목록 만들기]\n\n${jobsSpec()}`;
}

export function queryUser(b: Behavior): string {
  return `${behaviorBlock(b)}\n\n대상 20개 각각의 검색 문장을 쓰세요.`;
}

// ── 업무 문장 판정 ─────────────────────────────────────────────
const JUDGE_RULES = `당신은 "코어 찾기"의 업무 문장 판정 담당입니다. 한 사람의 행동 설명을 기준으로, O*NET 업무 문장(영어)마다 그 업무에 이 행동이 들어 있는지와 얼마나 큰 몫인지 판정합니다. 이 판정으로 직업 점수가 계산되고, 결과지에 근거로 인용됩니다.

## 판정 기준
- 기준은 행동 설명의 ① 동작, ② 다루는 것의 모양, ③ 기준입니다. **업무의 대상 종류(글인지 영상인지 사람인지)는 강도에 영향을 주지 않습니다.** 같은 동작이 다른 대상에서 쓰이면 그대로 점수를 줍니다.
- 강도(strength)는 아래 값 중 하나만 씁니다.
  - 1: ①②③ 모두 맞음. 예(행동: 이미 있는 조각의 순서를 바꿔 전체가 매끄럽게 이어질 때까지 맞춘다) "integrate component parts into desired sequences"
  - 0.7: ①② 맞고 ③이 안 적혀 있음. 예 "rearrange schedules"
  - 0.5 또는 0.3: 일부만 맞음. 예 "edit video"(순서 얘기 없음), "create storyboards"(새로 만듦)
  - 0: 동작이 다름 → items에 넣지 않습니다.
- 몫(share, 0보다 크고 1 이하): 그 업무 문장 안에서 이 행동이 차지하는 비중입니다.
  - and로 묶인 서로 다른 행동은 몫을 나눕니다. "insert music, arrange films into sequences, and correct errors" → 1/3(0.33)
  - or로 묶인 대안은 나누지 않습니다. 하나라도 맞으면 몫 전체(1)입니다. 동사의 or든 대상의 or든 같습니다. 예 "edit books, lesson plans, or tests"
  - to부정사·~ing·관계절로 붙은 목적이나 방법도 행동이 들어 있으면 의미로 판단합니다(예: "…, organizing material accordingly"). 문장을 문법 규칙으로 기계적으로 쪼개지 않고, "행동에 해당하는 부분은 어디고 그게 얼마나 큰 몫인가"를 의미로 판단합니다.
- 인용(quote): 업무 문장에서 이 행동에 해당하는 구절을 **원문 그대로**(대소문자·철자·구두점까지) 옮깁니다. 바꾸거나 줄이거나 이어 붙이지 않습니다. 한 덩어리로 이어진 구절 하나만 씁니다. 결과지에서 이 구절만 굵게 보이므로, 문장 전체가 아니라 행동에 해당하는 가장 짧은 부분(동사와 그 목적어 정도)만 씁니다. 예: "Cut and edit film or tape to integrate component parts into desired sequences." → "integrate component parts into desired sequences"
- 대상(object): 이 업무가 다루는 대상을 다음 중 하나로 표시합니다: ${OBJECT_LIST}. 여러 개면 이 행동이 향하는 대상을 고릅니다.
- 종교 의식·장례 절차가 업무의 중심인 문장은 맥락이 달라 0점입니다.
- 비슷한 문장이 여럿이어도 각각 따로 판정합니다. 점수를 후하게도 박하게도 주지 말고 기준대로만 줍니다.

## 출력
- 점수가 있는 문장(강도 0.3 이상)만 items에 넣습니다. n은 목록의 번호입니다. 0점인 문장은 넣지 않습니다.`;

export function judgeTaskSystem(): string {
  return `${JUDGE_RULES}\n\n# [스펙: 직업 목록 만들기]\n\n${jobsSpec()}`;
}

export function judgeTaskUser(texts: string[]): string {
  return `## 업무 문장\n${texts.map((t, i) => `${i + 1}. ${t}`).join("\n")}\n\n위 업무 문장을 판정하세요. 점수가 있는 문장만 items에 넣습니다.`;
}

// ── 근거 번역 ─────────────────────────────────────────────────
const TRANSLATE_RULES = `당신은 "코어 찾기"의 번역 담당입니다. 결과지에 근거로 인용할 O*NET 업무 문장(영어)을 자연스러운 한국어 한 문장으로 옮깁니다. 참가자가 휴대폰으로 읽습니다.

## 지킬 것
- 뜻을 바꾸거나 더하거나 빼지 않습니다. 전문 용어는 쉬운 말로 풀되 짧게 씁니다.
- 끝맺음은 "~한다" 꼴로 통일합니다.
- 입력의 구절(phrase)에 해당하는 한국어 부분을 [[ ]]로 한 번만 감쌉니다. 예: 원문 "Cut and edit film to integrate component parts into desired sequences." 구절 "integrate component parts into desired sequences" → "필름을 자르고 편집해 [[여러 조각을 원하는 순서로 잇는다]]."
- [[ ]]는 정확히 한 쌍만 씁니다. 다른 표시(따옴표, 굵은 글씨, 괄호 설명)는 쓰지 않습니다.`;

export function translateSystem(): string {
  return TRANSLATE_RULES;
}

export function translateUser(items: { id: number; text: string; quote: string }[]): string {
  return `${items.map((x) => `### ${x.id}\n- 원문: ${x.text}\n- 구절(phrase): ${x.quote}`).join("\n\n")}\n\n각 항목을 번역하세요. id는 위 번호를 그대로 씁니다.`;
}
