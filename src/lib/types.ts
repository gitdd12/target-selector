import { z } from "zod";

export const CORES = ["알기", "짜기", "다루기", "이끌기", "돌보기", "꺼내기"] as const;
export type Core = (typeof CORES)[number];

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

export type WindowKind = "exp1" | "exp2" | "hardship" | "advice";
export const WINDOW_ORDER: WindowKind[] = ["exp1", "exp2", "hardship", "advice"];
export const WINDOW_LABEL: Record<WindowKind, string> = {
  exp1: "경험 1",
  exp2: "경험 2",
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

// 경험 창에서 스펙의 "확보 원칙" 열 가지 항목. 재진술 카드를 띄우기 전에 각각 확보됐거나 답 없음이어야 한다.
export const COVERAGE_KEYS = [
  "scene",
  "actions",
  "required_parts",
  "chosen_parts",
  "extra_effort",
  "stopping_reason",
  "fulfillment",
  "reengagement",
  "same_object_diff_action",
  "same_action_diff_object",
] as const;
export type CoverageKey = (typeof COVERAGE_KEYS)[number];
export const COVERAGE_LABEL: Record<CoverageKey, string> = {
  scene: "장면",
  actions: "실제 한 행동",
  required_parts: "꼭 해야 했던 부분",
  chosen_parts: "본인이 정해서 한 부분",
  extra_effort: "요구 이상으로 들인 수고",
  stopping_reason: "그만둔 계기",
  fulfillment: "'됐다' 싶은 순간과 직전과의 차이",
  reengagement: "이후 비슷한 일을 다시 한 적",
  same_object_diff_action: "같은 대상·다른 행동",
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
export type CloseReason = "completed" | "no_experience" | "user_stopped" | "turn_limit" | "misuse";

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
  actions: z.string(),
  required_parts: z.string(),
  chosen_parts: z.string(),
  extra_effort: z.string().describe("요구·필요 이상으로 스스로 더 들인 수고. 없으면 없음(사용자 답변). 시간이 길었다는 것만으로는 수고로 치지 않는다"),
  desired_change: z.string(),
  stopping_reason: z.string(),
  fulfillment_signal: z.string(),
  reengagement: z.string(),
  external_conditions: z.string(),
  candidate_interpretations: z.array(
    z.object({ core: z.enum(CORES), evidence: z.string() }),
  ),
  competing_interpretations: z.array(
    z.object({ explanation: z.string(), evidence: z.string() }),
  ),
  comparison_result: z
    .string()
    .describe("same_object_different_action / same_action_different_object 비교 질문 결과. 없으면 미상"),
  // 확정 기본 조건(스펙): 구체 행동이 확보돼 있고, 방법·순서·범위를 본인이 정하거나 그 방식을 택한 부분이 확인되는가. 흔한 행동이라는 이유로 미충족 판정하지 않는다.
  self_chosen_evidence: z.object({
    result: z.enum(["확인됨", "미확인", "불명확"]),
    reasoning: z.string(),
  }),
  // 무게 신호 네 가지(스펙 "확정의 실제 조건"). 두 개 이상이면 단일 경험으로 확정 가능. status는 코드가 이 값으로 다시 계산한다.
  weight_signals: z.object({
    extra_effort: WeightSignal.describe("① 요구·필요를 넘어 스스로 더 들인 수고(따로 알아보기, 다시 해보기, 돈·도구 마련). 오래 걸렸다는 것, 마감·평가 때문에 한 것은 제외"),
    repeated: WeightSignal.describe("② 이후 비슷한 일을 실제로 다시 했거나 다른 대상에서도 같은 행동을 했다. 하고 싶다는 의향은 제외"),
    fulfillment_on_action: WeightSignal.describe("③ '됐다' 싶은 순간이 결과·칭찬·마감이 아니라 그 행동 자체에 붙어 있다. 외부 제약 때문에 멈춘 것은 제외"),
    returned: WeightSignal.describe("④ 같은 대상에서 다른 행동도 해봤지만 이 행동으로 돌아왔거나, 다른 행동에는 끌리지 않았다"),
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
export const FinalJudgmentSchema = z.object({
  cores: z.array(
    z.object({
      core: z.enum(CORES),
      status: z.enum(["확정(단일 경험)", "확정(반복 확인)"]),
      basis_experiences: z.array(z.number().int()),
      reasoning: z.string(),
      scope_note: z.string().describe("어디까지 확인됐고 어디부터 추정인지"),
    }),
  ),
  unresolved: z.array(z.object({ core: z.string().describe("보류한 코어 후보 이름"), reason: z.string() })),
  cross_experience_pattern: z.string(),
  hold_summary: z
    .string()
    .describe("확정된 코어가 하나도 없을 때: 현재 이야기로는 무엇을 구별하기 어려운가. 있으면 빈 문자열"),
});
export type FinalJudgment = z.infer<typeof FinalJudgmentSchema>;

// ── 결과지 ──────────────────────────────────────────────────
// 결과지 초안. core는 내부 태그(직업 매핑용)라 화면에 보이지 않는다. 화면에는 코어 행동 문장(behavior)만 나온다. 여섯 단어는 어디에도 쓰지 않는다.
export const ReportSchema = z.object({
  cores: z.array(
    z.object({
      core: z.enum(CORES).describe("내부 태그. 화면에도 본문에도 쓰지 않는다"),
      behavior: z.string().describe("이 사람의 코어 행동을 한 문장으로(해요체, 20~30자). 이름이나 유형이 아니라 하는 행동. 예: 끊긴 흐름이 이어질 때까지 앞뒤를 맞춰 봐요"),
      restatement: z.string().describe("경험: 실제로 있었던 일을 짧은 문장 2~3개로. 문장마다 줄바꿈(\n)으로 구분. 문장당 45자 안팎, 사용자 표현 인용은 짧게"),
      pattern: z.string().describe("파악한 코어: 그 경험에서 파악한 행동 방식을 1~2문장(해요체). 짧고 바로 알아듣게, 센스 있게. 작성 메모·범위 안내·이름 붙이기 금지"),
      cost_note: z.string().describe("이 방식이 힘들어질 때 1문장(해요체): 이 행동 자체가 낳는 부작용(예: 내 몫 밖까지 손대다 시간이 더 듦)만. 못 견디는 상황(가치관 쪽)과 겹치면 쓰지 않는다. 기록에 근거가 없으면 빈 문자열"),
      // 직무와 연결하면: 이 행동이 쓰일 만한 업무와 아직 모르는 것. say(면접 한 문장)는 취업 준비 분기용으로 저장만 하고 화면에는 아직 안 보인다.
      bridge: z.object({
        usable: z.string().describe("쓰일 수 있는 일: 이 행동이 쓰일 만한 업무 내용을 한 문장. 직업명이 아니라 하는 일. 확정하지 않고 '~수 있어요' 꼴"),
        unknown: z.string().describe("아직 모르는 것: 이 경험만으로는 확인되지 않은 것을 한 문장"),
        say: z.string().describe("면접에서 이 경험을 한 문장으로 말한다면(해요체, 큰따옴표 없이, 경험 그대로 요약). 화면에는 아직 안 나온다"),
      }),
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
  // 대상: 공식 칸에 들어가는 짧은 표시(별도 섹션으로 만들지 않는다)
  object: z.object({
    label: z.string().describe("참가자가 말한 두 경험에서 실제로 다룬 대상을 짧은 명사구로(예: 발표 자료, 경제 개념). 처음에 고른 대상 목록에서 가져오지 않는다. 확정 코어가 없으면 빈 문자열"),
    note: z.string().describe("사용하지 않는다. 항상 빈 문자열(대상 안내는 결과지 화면의 고정 문구가 한다)"),
  }),
  // 직접 해 보기: 진로 탐색 중일 때만 채운다(직장이 있다·가고 싶은 분야를 정했다는 고정 문구를 코드가 붙인다). 그 외에는 items를 빈 배열로.
  explore: z.object({
    items: z
      .array(
        z.object({
          title: z.string().describe("해 볼 일의 이름(참가자의 실제 표현이나 실제로 한 일의 이름. 만든 용어 금지)"),
          do: z.string().describe("지금 혼자 바로 할 수 있는 일 한 문장(\"~해 보세요\"). 표시·기록·적기가 아니라 직접 하는 일. 시간 조건은 쓰지 않는다"),
          why: z.string().describe("이 일 하나가 무엇을 알려주는지 한 문장. 다른 일과 견주는 말 금지"),
        }),
      )
      .describe("진로 탐색 중이면 정확히 3개(서로 다른 종류의 일), 아니면 빈 배열"),
    common_why: z.string().describe("공통 이유 한 문장. 예: 팀플 슬라이드를 다시 짜고 환율 이유를 찾아보면서 하셨던 많은 행동 중에서, 정확히 어떤 행동이 끌리는지 찾아내는 거예요. 진로 탐색 중이 아니면 빈 문자열"),
  }),
  hold_note: z.string(),
});
export type Report = z.infer<typeof ReportSchema>;

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

export interface JobCandidate {
  code: string;
  title: string;
  percentiles: Record<Core, number>;
  gap: number;
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
    hardship?: ValuesFields;
    advice?: ValuesFields;
  };
  final?: FinalJudgment;
  jobCandidates?: JobCandidate[];
  jobPick?: JobPick;
  report?: Report;
  // 코어별 신뢰도(report.cores와 같은 순서). 무게 신호 개수로 코드가 정한다: 2개 = 상, 3개 이상 = 최상
  reliability?: { grade: "상" | "최상"; met: string[]; quotes?: string[] }[];
  celebDraft?: CelebDraft;
  // 운영자가 검토를 마치고 결과지를 공개했는지, 그리고 출처를 확인해 승인한 인물 사례(candidates 순번)
  published?: boolean;
  publishedAt?: string;
  approvedCelebs?: number[];
  // 인터뷰가 끝난 뒤 참가자가 고른 현재 상태. 결과지의 "직접 해 보기"가 이 선택에 맞춰진다.
  situation?: Situation;
  // 이메일은 대화 기록과 분리해 저장한다(store의 contacts). 여기에는 받았는지 여부만 둔다.
  emailSubmitted: boolean;
  // 비용 추적: 이 세션에서 AI를 부른 횟수와 토큰 사용량
  usage: { calls: number; input: number; output: number; cacheRead: number; cacheWrite: number };
  // budget: 총량 상한에 걸림(인터뷰를 거기서 마무리) / misuse: 인터뷰와 무관한 요청·오용이 반복돼 중단(결과지 초안을 만들지 않음)
  flagged?: "budget" | "misuse";
  // 마지막 단계 진행 상황(새로고침해도 이어서 하도록)
  finalizeStep?: "judge" | "write" | "jobs" | "celeb" | "done";
  log: { at: string; event: string; detail?: string }[];
}
