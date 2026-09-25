import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { LIMITS, MODELS } from "./config";
import { addUsage, anthropic, cached, LlmRefusal, plain } from "./llm";
import { interviewerStatus, interviewerSystem } from "./prompts";
import {
  COVERAGE_KEYS,
  COVERAGE_LABEL,
  type CloseReason,
  type CoverageKey,
  type CoverageValue,
  type Session,
  type WindowKind,
} from "./types";

// 인터뷰어의 출력은 형식이 고정된 JSON이다.
// 시험에서 자유 형식 글로 받았더니 답변 뒤에 자기 생각 메모·가짜 참가자 대사·엉뚱한 문장이 붙는 일이 매 턴 가깝게 생겼다.
// 형식을 고정하면 끝난 뒤에 잡음이 붙을 자리가 없다.
//   coverage    (경험 창만) 스펙 "확보 원칙" 열 가지 항목의 현재 상태. 맨 앞에 둬서 답변을 쓰기 전에 먼저 따져보게 한다.
//   reply       사용자에게 보일 인터뷰어의 다음 발화(재진술 카드가 뜰 때는 짧은 한마디이거나 빈 문자열)
//   restatement 재진술 카드 내용. 평소에는 빈 문자열, 창을 마무리할 때만 채운다
//   finish      none / 경험이 없음 / 사용자가 그만둠 / 오용으로 중단. (정상 종료는 사용자가 카드 버튼으로 정한다)
const CoverageEnum = z.enum(["미확보", "확보", "답 없음"]);
const CoverageSchema = z.object(
  Object.fromEntries(COVERAGE_KEYS.map((k) => [k, CoverageEnum])) as Record<CoverageKey, typeof CoverageEnum>,
);
const BaseShape = {
  reply: z.string().describe("사용자에게 그대로 보일 인터뷰어의 다음 발화 한 번. 재진술 카드를 띄울 때는 짧은 한마디이거나 빈 문자열"),
  restatement: z
    .string()
    .describe("재진술 카드 내용(사실 그대로, 해요체). 창을 마무리할 때만 채우고 평소에는 빈 문자열"),
  finish: z
    .enum(["none", "no_experience", "user_stopped", "misuse"])
    .describe(
      "none: 계속 / no_experience: 서로 다른 회상 경로를 두 번 시도했는데도 두 번째 경험이 없음(경험 2 창에서만) / user_stopped: 사용자가 그만하고 싶어 함 / misuse: 인터뷰와 무관한 요청이나 의미 없는 입력이 반복돼 중단",
    ),
};
const ExpTurnSchema = z.object({ coverage: CoverageSchema, ...BaseShape });
const ValuesTurnSchema = z.object(BaseShape);

const NAMES = "알기|짜기|다루기|이끌기|돌보기|꺼내기";
const LEAK_PATTERNS = [
  /코어/,
  new RegExp(`(${NAMES})\\s*(형|타입|유형|코어|패턴|성향|시네요|이네요|이라고|라고 부|에 가깝|쪽)`),
  new RegExp(`['"‘“「](${NAMES})['"’”」]`),
];

/** 인터뷰 도중 AI 답변에 코어 이름·해석이 새어 나갔는지 검사한다(스펙: 재진술 시점 해석 금지). */
export function leaksInterpretation(text: string): boolean {
  return LEAK_PATTERNS.some((re) => re.test(text));
}

/**
 * 결과지 초안 본문에 여섯 단어가 이름처럼 노출됐는지 검사한다(스펙: 결과지에 여섯 단어 노출 금지).
 * "알기 위해" 같은 평범한 문장은 걸리지 않게, 이름으로 쓰인 모양(따옴표·괄호·유형/패턴 표현·나열)만 잡는다.
 */
const NAME_IN_REPORT = [
  new RegExp(`['"‘“(（「](${NAMES})['"’”)）」]`),
  new RegExp(`(${NAMES})\\s*(형|타입|유형|코어|패턴|성향|조합|라는|라고|이라는|이라고)`),
  new RegExp(`(${NAMES})\\s*[·,、]\\s*(${NAMES})|(${NAMES})(와|과)\\s*(${NAMES})`),
];
export const leaksCoreNames = (text: string) => NAME_IN_REPORT.some((re) => re.test(text));

/**
 * 안전장치(그물): 형식이 고정돼 있어도 글 안에 자기 생각 메모("think…"), 참가자 대사("user…"),
 * 가짜 도구 호출 태그가 섞이면 첫 표시 앞에서 잘라낸다.
 */
const DIRTY_LINE = /(^|\n)[ \t]*(user|assistant|human|think|thought)/i;
const DIRTY_TAG = /<\s*(function_calls|invoke|thinking|antml)|<\/\s*(function_calls|invoke|thinking|antml)/i;

export function cleanReply(raw: string): { text: string; dirty: boolean } {
  let cut = raw.length;
  for (const re of [DIRTY_LINE, DIRTY_TAG]) {
    const m = re.exec(raw);
    if (m && m.index < cut) cut = m.index;
  }
  return { text: raw.slice(0, cut).trim(), dirty: cut < raw.length };
}

export interface TurnResult {
  reply: string;
  restatement?: string; // 있으면 재진술 카드를 띄운다
  finish?: CloseReason;
  coverage?: Partial<Record<CoverageKey, CoverageValue>>;
}

const FALLBACK_REPLY = "조금만 더 자세히 들려줄 수 있어요?";

function toApiMessages(s: Session, kind: WindowKind): Anthropic.MessageParam[] {
  const msgs = s.windows[kind].messages;
  // API는 첫 메시지가 사용자여야 한다. 첫 질문은 화면에서 이미 나간 AI 발화이므로 시작 신호를 앞에 붙인다.
  // 대화 기록의 AI 발화는 JSON 형식이 아니라 평문이라, 형식 규칙은 시스템 프롬프트로 알린다.
  const out: Anthropic.MessageParam[] = [{ role: "user", content: "[대화 시작]" }];
  for (const m of msgs) {
    // 재진술 카드는 화면에서는 카드지만 AI에게는 자기가 한 정리로 보인다
    out.push({ role: m.role, content: m.kind === "restatement" ? `(재진술 카드) ${m.content}` : m.content });
  }
  return out;
}

export async function interviewTurn(s: Session, kind: WindowKind): Promise<TurnResult> {
  const w = s.windows[kind];
  const isExp = kind === "exp1" || kind === "exp2";
  const userTurns = w.messages.filter((m) => m.role === "user").length;
  let retryNote: string | undefined;

  for (let attempt = 0; attempt < 3; attempt++) {
    const last = attempt === 2; // 마지막 시도에서는 확보 조건 때문에 대화가 막히지 않게 한다
    const res = await anthropic().messages.parse({
      model: MODELS.interviewer,
      max_tokens: 4000,
      // 인터뷰어는 사고를 끈다. 적응형 사고를 켜면 시험에서 세 번에 한 번꼴로 답변에 자기 생각 메모·가짜 참가자 대사가 섞였다.
      thinking: { type: "disabled" },
      output_config: { format: zodOutputFormat(isExp ? ExpTurnSchema : ValuesTurnSchema) },
      system: [
        cached(interviewerSystem(kind)),
        plain(
          interviewerStatus({
            kind,
            userTurns,
            softLimit: LIMITS.softUserTurns[kind],
            targets: s.targets,
            coverage: w.coverage,
            retryNote,
          }),
        ),
      ],
      messages: toApiMessages(s, kind),
    });

    addUsage(s, res.usage);
    if (res.stop_reason === "refusal") throw new LlmRefusal("모델이 응답을 거부했습니다");

    const parsed = res.parsed_output as (z.infer<typeof ExpTurnSchema> | z.infer<typeof ValuesTurnSchema>) | null;
    if (!parsed) {
      retryNote = "직전 출력이 정해진 JSON 형식이 아니었습니다. 정해진 항목만 쓰세요.";
      continue;
    }
    const coverage = "coverage" in parsed ? (parsed.coverage as TurnResult["coverage"]) : undefined;

    const cleanedReply = cleanReply(parsed.reply);
    const cleanedRestate = cleanReply(parsed.restatement);
    if (cleanedReply.dirty || cleanedRestate.dirty) {
      s.log.push({ at: new Date().toISOString(), event: "reply_sanitized", detail: `${kind}` });
    }
    const reply = cleanedReply.text;
    const restatement = cleanedRestate.text;

    if (leaksInterpretation(reply) || leaksInterpretation(restatement)) {
      retryNote = "직전 답변에 코어 이름이나 해석이 들어 있어 무효 처리됐습니다. 사실 그대로의 표현만으로 다시 쓰세요.";
      continue;
    }

    // ── 오용 중단: 언제든 허용 ──
    if (parsed.finish === "misuse") return { reply: reply || FALLBACK_REPLY, finish: "misuse", coverage };

    // ── 사용자가 그만두겠다고 함: 재진술 카드가 있으면 카드로, 없으면 바로 닫는다 ──
    if (parsed.finish === "user_stopped") {
      if (restatement) return { reply, restatement, coverage };
      return { reply: reply || FALLBACK_REPLY, finish: "user_stopped", coverage };
    }

    // ── 두 번째 경험이 없음: 서로 다른 회상 경로를 두 번 시도한 뒤(사용자 발화 3번째 이후)에만 ──
    if (parsed.finish === "no_experience") {
      if (userTurns < LIMITS.minTurnsNoExperience && !last) {
        retryNote =
          "첫 '없어요'를 바로 받아들이지 마세요. 서로 다른 회상 경로로 두 번 시도한 뒤(사용자가 세 번째로 없다고 한 뒤)에만 no_experience로 끝냅니다. finish를 none으로 하고 다른 회상 경로로 물어보세요.";
        continue;
      }
      return { reply: reply || FALLBACK_REPLY, finish: "no_experience", coverage };
    }

    // ── 재진술 카드를 띄우려는 경우: 너무 이르거나 확보가 덜 됐으면 막고 더 묻게 한다 ──
    if (restatement) {
      if (userTurns < LIMITS.minUserTurns[kind] && !last) {
        retryNote = "아직 이릅니다. 재진술은 비워 두고(restatement는 빈 문자열) 정보를 더 얻는 질문을 하세요.";
        continue;
      }
      const missing = coverage ? COVERAGE_KEYS.filter((k) => coverage[k] === "미확보") : [];
      if (isExp && missing.length > 0 && !last) {
        retryNote = `재진술 카드는 coverage에 "미확보"가 하나도 없을 때만 띄웁니다. 아직 미확보인 항목: ${missing
          .map((k) => COVERAGE_LABEL[k])
          .join(", ")}. restatement는 빈 문자열로 두고, 이 중 하나를 묻는 질문을 하세요.`;
        continue;
      }
      if (isExp && missing.length > 0) s.log.push({ at: new Date().toISOString(), event: "coverage_override", detail: `${kind}: ${missing.join(",")}` });
      return { reply, restatement, coverage };
    }

    // ── 보통의 한 턴: 다음 질문 ──
    if (reply.length < 2) {
      retryNote = "직전 reply가 비었거나 형식이 깨졌습니다. 인터뷰어의 다음 한 번의 발화를 평범한 문장으로 쓰세요.";
      continue;
    }
    return { reply, coverage };
  }

  // 세 번 다 실패하면 중립적인 되묻기로 대신한다.
  return { reply: FALLBACK_REPLY };
}
