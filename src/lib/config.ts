// 어떤 AI 모델을 어느 역할에 쓸지 한 곳에서 정한다. 바꾸려면 환경변수만 바꾸면 된다.
// 미묘한 판단이 핵심인 코어 판정(judge)과 결과지 작성(writer)만 Opus, 나머지는 더 빠르고 싼 Sonnet.
const OPUS = "claude-opus-5-5";
const SONNET = "claude-sonnet-5";
export const MODELS = {
  interviewer: process.env.MODEL_INTERVIEWER ?? SONNET,
  recorder: process.env.MODEL_RECORDER ?? SONNET,
  judge: process.env.MODEL_JUDGE ?? OPUS,
  writer: process.env.MODEL_WRITER ?? OPUS,
  jobs: process.env.MODEL_JOBS ?? SONNET,
  celeb: process.env.MODEL_CELEB ?? SONNET,
};

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

// 생각을 얼마나 깊게 할지. 인터뷰는 응답 속도가 중요해서 medium, 판단·작성은 high.
export const EFFORT: Record<keyof typeof MODELS, Effort> = {
  interviewer: "medium",
  recorder: "medium",
  judge: "high",
  writer: "high",
  jobs: "medium",
  celeb: "high",
};

// 베타 참가자 수 상한(운영자가 결과지를 직접 검토하는 인력의 한계). 환경변수 MAX_SESSIONS로 바꾼다.
export const MAX_SESSIONS = Number(process.env.MAX_SESSIONS ?? 30);

export const AGE_BANDS = ["10대", "20대 초반", "20대 후반", "30대", "40대 이상"] as const;

// 인터뷰 창 하나가 끝없이 길어지지 않게 하는 안전장치
export const LIMITS = {
  // 사용자 발화가 이만큼 넘으면 AI에게 "슬슬 재진술로 정리하라"고 알린다
  softUserTurns: { exp1: 24, exp2: 24, hardship: 10, advice: 10 },
  // 이만큼 넘으면 서버가 창을 강제로 닫는다
  hardUserTurns: { exp1: 45, exp2: 45, hardship: 22, advice: 22 },
  // AI가 너무 일찍 창을 닫지 못하게 하는 최소 사용자 발화 수
  minUserTurns: { exp1: 4, exp2: 4, hardship: 2, advice: 2 },
  maxUserChars: 2500, // 메시지 하나의 최대 글자 수
  // 두 번째 경험이 "없다"로 끝나려면 서로 다른 회상 경로를 두 번 시도한 뒤여야 한다(사용자가 세 번째로 없다고 답한 뒤)
  minTurnsNoExperience: 3,
  // 한 사람이 인터뷰 전체(4개 창)에서 쓸 수 있는 총량. 넘으면 그 창을 닫고 바로 결과지 단계로 넘어간다.
  totalUserTurns: 70,
  totalUserChars: 45000,
  // 도배 방지: 같은 세션에서 메시지 사이 최소 간격, 같은 IP에서 10분 동안 보낼 수 있는 메시지 수
  minMsgIntervalMs: 1500,
  perIpChatsPer10Min: 90,
};

// 동의 안내문 버전. 문구를 바꾸면 올린다(누가 어느 버전에 동의했는지 기록됨).
export const CONSENT_VERSION = "2026-09-19";
