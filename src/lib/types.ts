import { z } from "zod";

// 직업 검색용 대상 19개(docs/직업추천_재설계 1-1). 앞 15개는 10초 선택 화면의 대상, 뒤 4개는 검색 전용.
// 판정 단계가 업무마다 이 중 하나를 표시하고, 확인된 대상(A 목록)도 이 이름으로 적는다.
export const SEARCH_OBJECTS = [
  "신체",
  "재료",
  "기계·장비",
  "공간",
  "물건",
  "생물",
  "사람·관계",
  "글·문서",
  "데이터·숫자",
  "코드",
  "수식",
  "개념·전략·규칙",
  "그림·이미지·디자인",
  "소리·음악",
  "영상",
  "일정·절차",
  "돈·재무",
  "조직·프로젝트",
  "몸·건강",
] as const;
export type SearchObject = (typeof SEARCH_OBJECTS)[number];
// 대상을 넣지 않은 검색 문장(19개에 없는 대상을 잡는 안전망)
export const NO_OBJECT = "대상 없음";

// 인터뷰 끝에 팝업에서 고르는 현재 상태(셋 중 하나)
export const SITUATIONS = ["working", "applying", "exploring"] as const;
export type Situation = (typeof SITUATIONS)[number];
export const SITUATION_LABEL: Record<Situation, string> = {
  working: "직장이 있다",
  applying: "가고 싶은 분야를 정했다",
  exploring: "진로 탐색 중이다",
};

// 결과지 문장에 끼워 쓰는 짧은 이름("○○으로 선택하셔서 …")
export const SITUATION_SHORT: Record<Situation, string> = {
  working: "직장이 있음",
  applying: "분야를 정함",
  exploring: "진로 탐색 중",
};

// 경험 3은 선택이다(v0.32): 경험 2가 끝나면 참가자가 "경험 하나 더 이야기하기"를 고를 때만 연다. 로직은 경험 2와 같다.
export type WindowKind = "exp1" | "exp2" | "exp3" | "hardship" | "advice";
export const WINDOW_ORDER: WindowKind[] = ["exp1", "exp2", "exp3", "hardship", "advice"];
export const EXP_WINDOWS = ["exp1", "exp2", "exp3"] as const;
export type ExpWindow = (typeof EXP_WINDOWS)[number];
export const isExpWindow = (k: WindowKind): k is ExpWindow => (EXP_WINDOWS as readonly string[]).includes(k);
export const WINDOW_LABEL: Record<WindowKind, string> = {
  exp1: "경험 1",
  exp2: "경험 2",
  exp3: "경험 3",
  hardship: "견디기 힘들었던 상황",
  advice: "친구에게 해줄 조언",
};

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  at: string;
  // restatement: 채팅 말풍선이 아니라 별도 카드("지금까지 이해한 내용")로 보여주는 재진술
  kind?: "restatement";
}

// 경험 창에서 스펙의 "확보 원칙" 여섯 가지 항목. 재진술 카드를 띄우기 전에 각각 확보됐거나 답 없음이어야 한다.
export const COVERAGE_KEYS = [
  "scene",
  "actions",
  "chosen_parts",
  "extra_effort",
  "fulfillment",
  "same_action_diff_object",
] as const;
export type CoverageKey = (typeof COVERAGE_KEYS)[number];
export const COVERAGE_LABEL: Record<CoverageKey, string> = {
  scene: "장면",
  actions: "실제 한 행동, 다룬 대상, 무엇을 가지고 시작했는지",
  chosen_parts: "요구받은 것과 본인이 정한 것",
  extra_effort: "요구 이상으로 들인 수고",
  fulfillment: "과정이나 결과물 자체에서 온 만족",
  same_action_diff_object: "같은 행동·다른 대상",
};
export type CoverageValue = "미확보" | "확보" | "답 없음";

export interface Target {
  id: number;
  category: string;
  name: string;
}

// 10초 대상 선택 결과. 반응 시간·시간초과는 스펙상 "사용성 자료"로만 저장한다(코어 점수에 쓰지 않음).
export interface TargetSelection {
  survivors: Target[];
  scores: Record<number, number>;
  timedOut: Record<number, boolean>;
  answerMs: Record<number, number>;
  passedCount: number;
  eliminatedCount: number;
  totalMs: number;
}

export type WindowStatus = "pending" | "active" | "done" | "skipped";
// declined: 경험 3을 고르지 않음(창을 열지 않고 건너뜀)
export type CloseReason = "completed" | "no_experience" | "user_stopped" | "turn_limit" | "misuse" | "declined";

export interface WindowState {
  kind: WindowKind;
  status: WindowStatus;
  messages: ChatMessage[];
  closeReason?: CloseReason;
  // 창이 끝났고 기록 정리(분석)까지 마쳤는지
  recorded: boolean;
  // 재진술 카드가 떠 있고 사용자가 버튼을 누르기를 기다리는 중
  pendingRestatement?: boolean;
  // 이 창에서 재진술 카드가 한 번이라도 떴는지. 뜬 뒤에는 카드가 사라져도 "다음 질문으로 넘어가기" 버튼이 계속 남는다.
  restatedOnce?: boolean;
  // 경험 창의 확보 현황(인터뷰어가 매 턴 갱신, 운영자 검토용)
  coverage?: Partial<Record<CoverageKey, CoverageValue>>;
}

// ── 기록 필드(질문흐름 스펙의 "기록 필드") ─────────────────────────
// 분석자 정리/분석자 항목은 전부 AI가 채운다. 비어 있으면 추정하지 않고 "미상".
const WeightSignal = z.object({ present: z.boolean(), evidence: z.string().describe("대화 속 근거(사용자 표현 인용). 없으면 빈 문자열") });

export const ExperienceFieldsSchema = z.object({
  scene_title: z.string().describe("이 경험을 가리키는 짧은 제목(사용자 표현 위주, 해석 금지)"),
  context_and_objects: z.string(),
  starting_state: z.string().describe("손대기 전 대상의 모습(사용자 표현). 무엇을 가지고 시작했나(이미 있던 것 / 흩어진 재료 / 머릿속 생각 / 모르던 것 / 사람의 상태 등). 끝났을 때의 모습도 알면 함께 적는다. 없으면 미상"),
  actions: z.string(),
  required_parts: z.string(),
  chosen_parts: z.string(),
  extra_effort: z.string().describe("요구·필요 이상으로 스스로 더 들인 수고. 없으면 없음(사용자 답변). 시간이 길었다는 것만으로는 수고로 치지 않는다"),
  desired_change: z.string(),
  stopping_reason: z.string(),
  fulfillment_signal: z.string(),
  reengagement: z.string().describe("같은 행동 다른 대상 질문의 답: 이번 방식이 나온 다른 실제 경험(무엇에서, 언제, 어떻게). 없으면 없음"),
  external_conditions: z.string(),
  candidate_interpretations: z.array(
    z.object({
      behavior: z.string().describe("가능한 코어 후보를 행동으로(동작 + 다루는 것의 모양 + 기준, 대상 이름 없이). 이름·유형을 붙이지 않는다"),
      evidence: z.string(),
    }),
  ),
  competing_interpretations: z.array(
    z.object({ explanation: z.string(), evidence: z.string() }),
  ),
  comparison_result: z
    .string()
    .describe("same_action_different_object 비교 질문 결과. 없으면 미상"),
  // 확정 기본 조건(스펙 v0.28): 구체 행동이 확보돼 있는가. 흔한 행동이라는 이유로 미충족 판정하지 않는다.
  concrete_action_confirmed: z.boolean().describe("기본 조건: 그 경험에서 이 사람이 실제로 한 구체적인 행동이 확보됐다. 평가·성격 표현만 있고 행동이 없으면 false"),
  // 무게 신호 ④ 본인이 정한 부분(스펙 v0.28부터 기본 조건이 아니라 신호). 시켜서 한 일이면 미확인일 수 있다.
  self_chosen_evidence: z.object({
    result: z.enum(["확인됨", "미확인", "불명확"]),
    reasoning: z.string(),
  }),
  // 무게 신호 ①~③(스펙 "확정의 실제 조건"). ④(self_chosen_evidence)와 합쳐 두 개 이상이면 단일 경험으로 확정. status는 코드가 이 값으로 다시 계산한다.
  // 근거 하나는 신호 하나에만 쓴다(같은 발화를 두 신호의 근거로 겹쳐 쓰지 않는다).
  weight_signals: z.object({
    extra_effort: WeightSignal.describe("① 이번에 포착한 방식(본인이 정한 부분)에 요구·필요보다 더 들인 수고(그 자리에서 더 오래·더 여러 번, 그 방식을 위해 따로 알아보기·도구 마련). 일 전체에 들인 시간·수고와 마감·평가 때문에 한 것은 제외"),
    repeated: WeightSignal.describe("② 방식의 반복: 이번 경험에서 본인이 정한 방식이 다른 때에, 시키지 않았는데 다시 나왔다. 대상은 같아도(다른 자소서) 비슷해도(보고서) 멀어도(영상) 된다. 해야 해서 다시 한 것(취업 준비라 자소서를 또 씀)과 하고 싶다는 의향만 제외"),
    fulfillment_on_action: WeightSignal.describe("③ 과정이나 결과물 자체에서 온 만족을 사용자가 구체적으로 짚었다(결과물을 좋아하는 것 포함). 칭찬·합격 같은 외부 반응이 같이 있어도 된다. 외부 반응뿐이거나 끝난 후련함뿐이거나, 무엇인지 짚지 못하면 제외"),
  }),
  // 확정 신호가 아닌 기록(스펙). 비교 선호는 직업 추천에서, 다른 대상 표시는 직업 추천의 확인된 대상 칸에 쓴다(코어 문장은 대상 이름 없이 쓴다).
  comparison_preference: z.object({
    tried_other_action: z.boolean().describe("같은 대상에서 다른 행동을 직접 해 봤다고 사용자가 스스로 말했다(따로 묻지 않는다). 생각만 했거나 말이 없으면 false"),
    less_engaging: z.enum(["덜 끌림", "똑같이 끌림", "더 끌림", "미상"]).describe("직접 해 본 그 다른 행동이 이 행동과 비교해 어땠나. 해 보지 않았으면 미상"),
    evidence: z.string().describe("사용자 표현 인용. 없으면 빈 문자열"),
  }),
  other_object: z.object({
    present: z.boolean().describe("② 방식의 반복이 나왔다(② 근거가 곧 다른 대상이다)"),
    objects: z.string().describe("그 다른 대상(사용자 표현)과 이번 대상과 비슷한지·거리가 먼지. 없으면 빈 문자열"),
    evidence: z.string().describe("사용자 표현 인용. 없으면 빈 문자열"),
  }),
  next_question_and_reason: z.string(),
  status: z.enum(["근거 부족", "후보", "확정(단일 경험)"]),
});
export type ExperienceFields = z.infer<typeof ExperienceFieldsSchema>;

export const ValuesFieldsSchema = z.object({
  values_signal: z.string().describe("이 질문에서 드러난 가치관·성향 근거. 사용자 표현을 인용"),
  concrete_scene: z.string().describe("답이 가리키는 실제 장면이 있으면 사실 그대로, 없으면 미상"),
});
export type ValuesFields = z.infer<typeof ValuesFieldsSchema>;

// ── 코어 판정(모든 창이 끝난 뒤) ───────────────────────────────
// 코어 이름(여섯 단어)은 쓰지 않는다(v0.31). 코어는 행동 설명(동작·다루는 것의 모양·기준)으로 적고,
// 이 행동 설명이 직업 목록의 검색·판정 기준이 된다(docs/직업추천_재설계 0단계).
export const BehaviorSchema = z.object({
  action: z.string().describe("① 동작(한국어, 짧게). 예: 순서·배치를 바꾼다"),
  shape: z.string().describe("② 다루는 것의 모양(대상 이름 없이). 예: 이미 있는 여러 조각 / 힘들어하는 사람의 상태"),
  criterion: z.string().describe("③ 기준: 언제까지·무엇이 되면 멈추는지. 예: 전체가 매끄럽게 이어질 때까지. 기록에 없으면 빈 문자열"),
  en: z
    .string()
    .describe("①②③을 합친 영어 한 문장. 대상 자리는 일반화(existing parts, a person 등)하고 방식과 기준은 구체적으로 남긴다. 업무 문장 판정의 기준이 된다"),
});
export type Behavior = z.infer<typeof BehaviorSchema>;

export const FinalJudgmentSchema = z.object({
  // 경험끼리 같은 코어인지(0-1단계). 두 경험 모두 코어 후보 이상인 쌍마다 판정한다(경험이 셋이면 최대 세 쌍).
  same_core: z
    .array(
      z.object({
        experiences: z.array(z.number().int()).describe("비교한 두 경험의 번호(experience_id). 예: [1, 2]"),
        result: z.enum(["같은 코어", "다른 코어"]),
        quotes: z.array(z.string()).describe("두 경험에서 판정 근거가 된 사용자 표현 인용(experiences와 같은 순서로 두 개)"),
        reasoning: z.string(),
      }),
    )
    .describe("비교할 쌍이 없으면(코어 후보 이상인 경험이 하나 이하) 빈 배열"),
  cores: z.array(
    z.object({
      status: z.enum(["확정(단일 경험)", "확정(반복 확인)"]),
      basis_experiences: z.array(z.number().int()),
      reasoning: z.string(),
      scope_note: z.string().describe("어디까지 확인됐고 어디부터 추정인지"),
      behavior: BehaviorSchema,
      objects: z.object({
        experience: z.string().describe("이 코어가 실제로 나온 대상(사용자 표현). ②로 확인된 다른 대상도 함께"),
        confirmed: z
          .array(z.enum(SEARCH_OBJECTS))
          .describe("확인된 대상: 경험의 대상 + ② 방식의 반복으로 확인된 다른 대상을 검색용 대상 19개로 옮긴 것(중복 없이)"),
      }),
    }),
  ),
  unresolved: z.array(z.object({ label: z.string().describe("보류한 후보를 행동으로 짧게"), reason: z.string() })),
  cross_experience_pattern: z.string(),
  hold_summary: z
    .string()
    .describe("확정된 코어가 하나도 없을 때: 현재 이야기로는 무엇을 구별하기 어려운가. 있으면 빈 문자열"),
});
export type FinalJudgment = z.infer<typeof FinalJudgmentSchema>;

// ── 결과지 ──────────────────────────────────────────────────
// 결과지 초안. 화면에는 코어 행동 문장(behavior)이 코어의 제목으로 나온다. 코어 이름·유형은 어디에도 쓰지 않는다.
export const ReportSchema = z.object({
  cores: z.array(
    z.object({
      behavior: z.string().describe("이 사람의 코어 행동을 한 문장으로(해요체, 20~30자). 이름이나 유형이 아니라 하는 행동. 대상 이름 없이. 예: 끊긴 흐름이 이어질 때까지 앞뒤를 맞춰 봐요"),
      restatement: z.string().describe("경험: 실제로 있었던 일을 짧은 문장 2~3개로. 문장마다 줄바꿈(\n)으로 구분. 문장당 45자 안팎, 사용자 표현 인용은 짧게"),
      pattern: z.string().describe("파악한 코어: 그 경험에서 파악한 행동 방식을 1~2문장(해요체). 짧고 바로 알아듣게, 센스 있게. 작성 메모·범위 안내·이름 붙이기 금지"),
      cost_note: z.string().describe("이 방식이 힘들어질 때 1문장(해요체): 이 행동 자체가 낳는 부작용(예: 내 몫 밖까지 손대다 시간이 더 듦)만. 못 견디는 상황(가치관 쪽)과 겹치면 쓰지 않는다. 기록에 근거가 없으면 빈 문자열"),
      say: z.string().describe("면접에서 이 경험을 한 문장으로 말한다면(해요체, 큰따옴표 없이, 경험 그대로 요약). 저장만 하고 화면에는 아직 안 나온다"),
    }),
  ),
  // 가치관: 결과지에서 코어와 나란히 놓이는 별도 항목
  values: z.object({
    short: z.string().describe("공식 칸에 들어갈 짧은 문구(20자 안팎, 명사구나 '~하는' 꼴). 없으면 빈 문자열"),
    summary: z.string().describe("가치관을 한 문장으로(해요체)"),
    important: z.string().describe("중요하게 여기는 것 1~2문장(사용자 표현 인용). 근거가 없으면 빈 문자열"),
    hard: z.string().describe("못 견디는 것 1~2문장: 사용자 표현 인용 + 그래서 답답해질 수 있는 상황까지 한꺼번에. 근거가 없으면 빈 문자열"),
    alive: z.string().describe("가치관과 코어가 만나 살아나는 일·환경 1~2문장"),
    stuck: z.string().describe("사용하지 않는다(못 견디는 것에 통합). 항상 빈 문자열"),
  }),
  // 직접 해 보기: 진로 탐색 중일 때만 채운다(직장이 있다·가고 싶은 분야를 정했다는 고정 문구를 코드가 붙인다). 그 외에는 items를 빈 배열로.
  // 공통 이유는 고정 문구라 코드가 붙인다.
  explore: z.object({
    items: z
      .array(
        z.object({
          core: z.number().int().describe("어느 코어의 해 볼 일인지(코어 순번, 1부터)"),
          object: z.string().describe("해 볼 대상(주어진 '해 볼 대상 후보'의 대상 이름 그대로, 또는 채울 때 쓴 비슷한 대상)"),
          title: z.string().describe("해 볼 일의 이름(짧게, 만든 용어 금지)"),
          do: z.string().describe("지금 혼자 바로 할 수 있는 일 한 문장(\"~해 보세요\"). 같은 행동을 그 대상에 옮긴 작은 일. 표시·기록·적기가 아니라 직접 하는 일. 시간 조건은 쓰지 않는다"),
          why: z.string().describe("그 대상의 직업과 잇는 한 문장. 예: 이게 끌리면 영상 편집자 같은 일에서도 이 행동이 쓰여요"),
        }),
      )
      .describe("진로 탐색 중이면 정확히 3개(대상이 서로 겹치지 않게, 코어가 둘 이상이면 코어마다 최소 1개), 아니면 빈 배열"),
  }),
  hold_note: z.string(),
});
export type Report = z.infer<typeof ReportSchema>;

// 예전 결과지(v0.26까지)에만 있던 칸. 예전 세션을 화면에 그대로 보여주려고 형태만 남긴다.
export interface LegacyReportCore {
  core?: string;
  bridge?: { usable: string; unknown: string; say: string };
}
export interface LegacyReport {
  object?: { label: string; note: string };
  explore?: { common_why?: string; items?: { title?: string; do: string; why: string }[] };
}

// 인물 사례 초안. 운영자가 출처를 확인해 승인한 것만 참가자에게 보인다.
export const CelebDraftSchema = z.object({
  candidates: z.array(
    z.object({
      name: z.string(),
      field_and_era: z.string(),
      for_pattern: z.string().describe("어느 패턴 문구에 대한 사례인지"),
      why_similar: z.string().describe("이 사람이 결과지 속 방식과 어떻게 닮았는지 한 문장(해요체)"),
      scenes: z
        .array(
          z.object({
            title: z.string().describe("장면 제목 8~16자"),
            scene: z.string().describe("이 방식이 드러난 구체 장면 2~3문장(해요체). 확실히 아는 것만"),
            strength: z.string().describe("그 방식의 강점 한 문장"),
            cost: z.string().describe("그 장면에서 실제로 기록된 대가·문제가 있을 때만 한 문장. 없으면 빈 문자열(억지로 만들지 않는다)"),
          }),
        )
        .describe("장면 1~3개"),
      at_your_scale: z.string().describe("사용자의 실제 장면과 자연스럽게 이어질 때만 한 줄. 억지스러우면 빈 문자열"),
      source_hint: z.string().describe("출처 후보(자서전·인터뷰·전기 등 종류와 제목)"),
      verification_queries: z.array(z.string()).describe("운영자가 검증할 때 쓸 검색어"),
      confidence: z.enum(["높음", "보통", "낮음"]),
    }),
  ),
  notes: z.string().describe("검토자가 알아야 할 점(불확실한 부분, 매칭이 약한 이유 등)"),
});
export type CelebDraft = z.infer<typeof CelebDraftSchema>;

export const JobPickSchema = z.object({
  picks: z.array(
    z.object({
      code: z.string(),
      title_en: z.string(),
      title_ko: z.string(),
      tasks: z.array(z.string()).describe("실제 하는 일: 후보 목록에 적힌 '실제 업무' 중 이 사용자와 가장 닿는 2~3개를 한국어 한 문장씩(해요체 아닌 '~한다'가 아니라 명사형 끝맺음 가능)으로 옮긴 것. 목록에 없는 업무를 지어내지 않는다"),
      why: z.string().describe("연결되는 부분: 이 직업의 일 중 사용자의 코어 행동과 닿는 부분을 한 문장(해요체)"),
      unknown: z.string().describe("아직 확인 안 된 부분: 이 직업에서 이번 경험만으로는 확인되지 않은 것을 한 문장(해요체)"),
      scene_question: z.string().describe("떠올려 볼 장면: 사용자의 실제 경험 장면에 빗대어, 이 직업의 어느 부분이 자기에게 닿는지 가릴 수 있는 질문 한 문장(해요체)"),
      qualification_note: z.string().describe("항상 빈 문자열"),
    }),
  ),
  next_question: z
    .object({
      question: z.string().describe("세 직업을 한꺼번에 가르는 질문 한 문장. 사용자의 실제 경험 장면에서 '어느 순간이 가장 좋았나요?' 꼴"),
      choices: z
        .array(z.object({ when: z.string().describe("그 순간(해요체)"), meaning: z.string().describe("그렇다면 어느 방향에 닿는지 한 문장(해요체). 직업이 맞다/틀리다고 단정하지 않는다") }))
        .describe("선택지 3개. 마지막은 이번에 확인하지 못한 다른 방식일 수 있다는 쪽"),
    })
    .describe("직업 카드 아래에 그대로 보여줄 질문. 답을 받는 기능은 없고 사용자가 스스로 떠올려 본다"),
  excluded: z.array(z.object({ code: z.string(), reason: z.string() })),
});
export type JobPick = z.infer<typeof JobPickSchema>;

// 예전 방식(6개 코어 점수표)의 직업 후보. 예전 세션 검토 화면용으로만 남긴다.
export interface JobCandidate {
  code: string;
  title: string;
  percentiles: Record<string, number>;
  gap: number;
}

// ── 직업 목록(새 방식, docs/직업추천_재설계) ─────────────────────
// 업무 문장 판정 하나. 문장은 data/onet31/task_emb_texts.json의 순번(i)으로 가리킨다.
export interface TaskJudgment {
  s: number; // 강도(0 / 0.3 / 0.5 / 0.7 / 1)
  f: number; // 몫(0~1)
  o: string; // 이 업무의 대상(검색용 19개 중 하나 또는 대상 없음)
  q: string; // 행동에 해당하는 구절(원문 그대로). 0점이면 빈 문자열
}

export interface JobEntry {
  soc: string;
  name: string; // 한국어 이름
  desc: string; // 한 줄 설명
  score: number; // 직업 점수(그 직업이 하는 일 중 이 행동이 차지하는 비중)
  match: number; // 일치도(0~100)
  object: string; // 이 직업의 대상(점수에 가장 많이 기여한 대상)
  both?: boolean; // 두 코어 모두에서 쓰이는 일
  evidence: { text: string; quote: string; ko?: string }[]; // 재확인을 통과한 근거 업무(원문, 구절, 번역)
}

export interface CoreJobs {
  core: number; // final.cores 순번(0부터)
  confirmed: JobEntry[]; // 확인된 대상에서 이어지는 일(A)
  other: JobEntry[]; // 아직 확인 안 된 대상에서 쓰이는 일(B−A)
  // 직접 해 보기 후보: 아직 확인 안 된 대상마다 1등 직업(일치도 순)
  exploreObjects: { object: string; soc: string; name: string; match: number }[];
}

// 직업 목록 만들기의 중간 상태(여러 번에 나눠 진행해도 이어서 하도록 세션에 저장)
export interface JobWork {
  cores: {
    queries?: { object: string; text: string }[];
    pending: number[]; // 아직 판정 안 한 문장 순번
    judged: Record<number, TaskJudgment>; // 점수가 있는 판정
    zero: number[]; // 0점으로 판정한 문장
    expanded: boolean; // 후보 직업 확장을 했는지
    lists?: { confirmed: string[]; other: string[] }; // 근거 재확인 전 후보 순서(직업 코드)
  }[];
  stage: "search" | "judge" | "lists" | "evidence" | "translate" | "done";
  both?: string[]; // 두 코어 모두에 걸린 직업 코드
  recheck?: Record<number, boolean>; // 근거 재확인 결과(문장 순번 → 통과 여부)
}

// finalizing: 인터뷰 끝, 이메일을 받으며 결과지 초안을 만드는 중 / complete: 초안 생성까지 끝남
export type Phase = "targets" | "interview" | "finalizing" | "complete";

export interface Session {
  id: string;
  createdAt: string;
  updatedAt: string;
  consent: { at: string; version: string };
  specVersions: { interview: string; result: string };
  models: Record<string, string>;
  phase: Phase;
  currentWindow: WindowKind;
  // 인터뷰 시작 전 입력(선택). 유명인 사례의 시대·분야를 맞추는 데만 쓴다.
  profile: { ageBand?: string };
  targets?: TargetSelection;
  windows: Record<WindowKind, WindowState>;
  records: {
    exp1?: ExperienceFields;
    exp2?: ExperienceFields;
    exp3?: ExperienceFields;
    hardship?: ValuesFields;
    advice?: ValuesFields;
  };
  final?: FinalJudgment;
  // 예전 방식의 직업 추천(v0.26까지). 새 세션에는 없다
  jobCandidates?: JobCandidate[];
  jobPick?: JobPick;
  // 새 방식의 직업 목록(코어마다)
  jobWork?: JobWork;
  jobLists?: CoreJobs[];
  report?: Report;
  // 코어별 신뢰도(report.cores와 같은 순서). 무게 신호 개수로 코드가 정한다: 2개 = 중, 3개 = 상, 4개 = 최상
  reliability?: { grade: "중" | "상" | "최상"; met: string[]; quotes?: string[] }[];
  celebDraft?: CelebDraft;
  // 운영자가 검토를 마치고 결과지를 공개했는지, 그리고 출처를 확인해 승인한 인물 사례(candidates 순번)
  published?: boolean;
  publishedAt?: string;
  approvedCelebs?: number[];
  // 경험 2가 끝난 뒤 "경험 하나 더 이야기하기" 선택: pending(버튼을 기다림) / yes(경험 3 창을 엶) / no(건너뜀)
  extraOffer?: "pending" | "yes" | "no";
  // 인터뷰가 끝난 뒤 참가자가 고른 현재 상태. 결과지의 "직접 해 보기"가 이 선택에 맞춰진다.
  situation?: Situation;
  // 이메일은 대화 기록과 분리해 저장한다(store의 contacts). 여기에는 받았는지 여부만 둔다.
  emailSubmitted: boolean;
  // 비용 추적: 이 세션에서 AI를 부른 횟수와 토큰 사용량
  usage: { calls: number; input: number; output: number; cacheRead: number; cacheWrite: number };
  // budget: 총량 상한에 걸림(인터뷰를 거기서 마무리) / misuse: 인터뷰와 무관한 요청·오용이 반복돼 중단(결과지 초안을 만들지 않음)
  flagged?: "budget" | "misuse";
  // 마지막 단계 진행 상황(새로고침해도 이어서 하도록)
  // 새 순서: judge → jobs → write → celeb. 직업 목록은 결과지 작성(직접 해 보기)에 쓰여서 먼저 만든다.
  finalizeStep?: "judge" | "write" | "jobs" | "celeb" | "done";
  log: { at: string; event: string; detail?: string }[];
}
