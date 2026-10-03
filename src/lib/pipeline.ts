import { cached, callJson } from "./llm";
import { jobsStep, jobWorkSummary } from "./jobfinder";
import { computeReliability } from "./reliability";
import { explorePlan, shownCandidates } from "./explore";
import { ConflictError, getStore, save } from "./store";
import type { TurnResult } from "./interview";
import {
  celebSystem,
  celebUser,
  judgeSystem,
  judgeUser,
  CLOSING_HINT,
  OPENING,
  recorderSystem,
  recorderUser,
  writerSystem,
  writerUser,
} from "./prompts";
import {
  CelebDraftSchema,
  ExperienceFieldsSchema,
  FinalJudgmentSchema,
  ReportSchema,
  ValuesFieldsSchema,
  WINDOW_ORDER,
  EXP_WINDOWS,
  isExpWindow,
  type ChatMessage,
  type ExperienceFields,
  type Session,
  type ValuesFields,
  type WindowKind,
} from "./types";

const now = () => new Date().toISOString();

// 스펙의 확정 조건: 구체 행동이 없으면 근거 부족, 있으면 무게 신호 세 가지(보탬·만족·반복) 중 두 개 이상일 때 확정(단일 경험), 아니면 후보.
// AI가 적은 근거(weight_signals)로 코드가 status를 다시 계산한다(스펙 v0.34).
export const MIN_WEIGHT_SIGNALS = 2;
export function deriveStatus(f: ExperienceFields): ExperienceFields["status"] {
  if (f.concrete_action_confirmed === false) return "근거 부족";
  const n = Object.values(f.weight_signals).filter((x) => x.present).length;
  return n >= MIN_WEIGHT_SIGNALS ? "확정(단일 경험)" : "후보";
}
export const logEvent = (s: Session, event: string, detail?: string) => s.log.push({ at: now(), event, detail });

/** 새 대화창을 연다. 앞 창의 대화 내용은 넘기지 않는다(맥락 오염 방지) — 기록은 세션에 따로 쌓인다. */
export function startWindow(s: Session, kind: WindowKind) {
  s.currentWindow = kind;
  s.windows[kind] = {
    kind,
    status: "active",
    messages: [{ role: "assistant", content: OPENING[kind], at: now() }],
    recorded: false,
  };
  logEvent(s, "window_start", kind);
}

/** 경험 3 창을 열지 않고 건너뛴 것으로 기록한다. */
function skipExtra(s: Session) {
  s.windows.exp3 = { kind: "exp3", status: "skipped", closeReason: "declined", messages: [], recorded: true };
}

/** 경험 2 뒤 선택 카드: yes면 경험 3 창을 열고, no면 건너뛰고 인터뷰를 끝낸다(exp2는 이미 기록됨). AI를 부르지 않는다. */
export function chooseExtra(s: Session, choice: "yes" | "no") {
  if (s.extraOffer !== "pending") return;
  s.extraOffer = choice;
  logEvent(s, "extra_chosen", choice);
  if (choice === "yes") startWindow(s, "exp3");
  else {
    skipExtra(s);
    s.phase = "finalizing";
    s.finalizeStep = "judge";
    logEvent(s, "interview_complete");
  }
}

/** 기록 정리(분석) 하나: 판정 기록 AI 호출 결과를 target.records[kind]에 쓰고 로그를 남긴다.
 * advance()가 응답을 막지 않으려고 기록을 미룰 때(§pending), 호출한 쪽이 뒤에서 이걸 불러 잇는다 —
 * 실제 서버는 recordWindow(세션을 다시 읽어와서)로, 시험 스크립트처럼 세션 객체를 그대로 쓰는 쪽은
 * 이 함수를 바로 불러도 된다(export됨). */
export async function recordInto(target: Session, kind: WindowKind, messages: ChatMessage[]) {
  if (isExpWindow(kind)) {
    const rec = await callJson(
      "recorder",
      ExperienceFieldsSchema,
      [cached(recorderSystem(kind))],
      recorderUser(kind, messages),
      target,
    );
    rec.status = deriveStatus(rec);
    target.records[kind] = rec;
  } else {
    target.records[kind] = await callJson(
      "recorder",
      ValuesFieldsSchema,
      [cached(recorderSystem(kind))],
      recorderUser(kind, messages),
      target,
    );
  }
  logEvent(target, "recorded", kind);
}

/** 창 하나가 끝난 뒤: 다음 질문으로 이어지는 경우에는 그 창을 먼저 열고, 방금 끝난 창의 기록 정리(AI 호출, 느림)는
 * 여기서 기다리지 않고 { kind, messages }를 돌려줘서 부른 쪽(advance 라우트)이 응답을 막지 않고 recordWindow로 뒤에서 잇게 한다.
 * 인터뷰가 끝나는 경우도 마찬가지다 — 화면은 phase만 보고 바로 "현재 상태 고르기·이메일" 단계로 넘어가고(판정은
 * 아직 안 쓰임), 실제 코어 판정(judge)은 그보다 한 번 더 뒤(situation 선택 후 runFinalize)에야 시작되므로
 * 그 사이 사용자가 고르고 입력하는 시간이 자연스러운 버퍼가 된다. */
export async function advance(s: Session): Promise<{ kind: WindowKind; messages: ChatMessage[] } | null> {
  const kind = s.currentWindow;
  const w = s.windows[kind];
  if (w.status !== "done" && w.status !== "skipped") throw new Error("아직 끝나지 않은 창입니다");

  const hasUserText = w.messages.some((m) => m.role === "user");
  // 오용으로 중단되거나 아무 말도 안 한 창은 분석하지 않는다(쓸모없는 입력에 비용을 쓰지 않음)
  const needsRecording =
    !w.recorded && w.status === "done" && hasUserText && w.closeReason !== "no_experience" && w.closeReason !== "misuse";

  if (kind === "exp2" && !s.flagged && w.status === "done" && w.closeReason !== "no_experience") {
    // 경험 3 제안 카드는 s.extraOffer만 보고 뜬다(public.ts) — 기록 정리(AI 호출, 느림)를 기다릴 필요가
    // 없다. 다음 창을 여는 경우(위 next 분기)와 똑같이 바로 보여주고, 기록은 뒤에서 이어서 한다.
    if (!needsRecording) w.recorded = true;
    s.extraOffer = "pending";
    logEvent(s, "extra_offered");
    return needsRecording ? { kind, messages: [...w.messages] } : null;
  }

  let next: WindowKind | undefined = WINDOW_ORDER[WINDOW_ORDER.indexOf(kind) + 1];
  if (kind === "exp2" && !s.flagged) {
    // exp2가 "no_experience"나 "skipped"로 끝난 경우(위 분기를 안 탄 경우) — 경험 3을 건너뛰고 바로 마무리한다.
    skipExtra(s);
    next = undefined;
  }

  if (s.flagged === "misuse") {
    // 오용으로 중단: 결과지 초안을 만들지 않고 종료 화면으로 보낸다
    if (needsRecording) await recordInto(s, kind, w.messages);
    w.recorded = true;
    s.phase = "complete";
    s.finalizeStep = "done";
    logEvent(s, "interview_ended_misuse");
    return null;
  }

  if (next && s.flagged !== "budget") {
    if (!needsRecording) w.recorded = true;
    startWindow(s, next);
    return needsRecording ? { kind, messages: [...w.messages] } : null;
  }

  if (!needsRecording) w.recorded = true;
  s.phase = "finalizing";
  s.finalizeStep = "judge";
  logEvent(s, "interview_complete");
  return needsRecording ? { kind, messages: [...w.messages] } : null;
}

/** advance()가 다음 창을 이미 연 뒤, 방금 끝난 창의 대화를 기록 필드로 정리한다(응답을 막지 않고 뒤에서 부른다).
 * AI 호출(recordInto)은 한 번만 한다 — 저장이 §40의 저장 경쟁으로 실패하면, 세션을 다시 읽어와 이미 나온
 * 결과만 그 위에 다시 얹어서 저장을 재시도한다(AI를 다시 부르지 않는다). */
export async function recordWindow(sessionId: string, kind: WindowKind, messages: ChatMessage[]) {
  try {
    const base = await getStore().get(sessionId);
    if (!base) return;
    const before = { ...base.usage };
    await recordInto(base, kind, messages);
    const rec = base.records[kind];
    const usedDelta = {
      calls: base.usage.calls - before.calls,
      input: base.usage.input - before.input,
      output: base.usage.output - before.output,
      cacheRead: base.usage.cacheRead - before.cacheRead,
      cacheWrite: base.usage.cacheWrite - before.cacheWrite,
    };

    for (let attempt = 1; ; attempt++) {
      const target = attempt === 1 ? base : await getStore().get(sessionId);
      if (!target) return;
      if (attempt > 1) {
        if (isExpWindow(kind)) target.records[kind] = rec as ExperienceFields;
        else target.records[kind] = rec as ValuesFields;
        target.usage.calls += usedDelta.calls;
        target.usage.input += usedDelta.input;
        target.usage.output += usedDelta.output;
        target.usage.cacheRead += usedDelta.cacheRead;
        target.usage.cacheWrite += usedDelta.cacheWrite;
        logEvent(target, "recorded", kind);
      }
      if (target.windows[kind]) target.windows[kind].recorded = true;
      try {
        await save(target);
        return;
      } catch (e) {
        if (!(e instanceof ConflictError) || attempt >= 3) throw e;
      }
    }
  } catch (e) {
    console.error("[recordWindow]", kind, e);
  }
}

/**
 * 판정이 비어 보이는지: 확정 코어도 보류 설명도 없거나, 기록이 확정인 경험이 있는데 코어도 보류 사유도 없을 때.
 * (판정이 기록을 뒤집는 건 괜찮지만, 그러면 unresolved나 hold_summary에 이유가 있어야 한다)
 */
function emptyJudgment(s: Session): boolean {
  const f = s.final;
  if (!f || f.cores.length > 0) return false;
  const confirmedRecord = EXP_WINDOWS.some((k) => s.records[k]?.status === "확정(단일 경험)");
  return !f.hold_summary.trim() || (confirmedRecord && f.unresolved.length === 0);
}

/**
 * 결과지 초안 단계를 한 걸음씩 진행한다: 코어 판정 → 직업 목록 → 결과지 작성 → 유명인 사례 초안.
 * 직업 목록은 결과지의 "직접 해 보기"(아직 확인 안 된 대상)에 쓰여서 결과지 작성보다 먼저 만든다.
 * 직업 목록은 판정할 문장이 많아 여러 번의 호출에 나눠 진행한다(중간 상태는 s.jobWork).
 * 실패해도 같은 단계부터 다시 할 수 있다. 결과는 참가자에게 보이지 않고, 운영자 검토용으로만 저장된다.
 * deadline(기본 4분 뒤)을 넘기면 jobs 단계는 중간 상태로 멈춘다 — runFinalize가 이어서 호출을 예약한다(§38).
 */
export async function finalizeStep(s: Session, deadline = Date.now() + 240_000) {
  switch (s.finalizeStep) {
    case "judge": {
      s.final = await callJson("judge", FinalJudgmentSchema, [cached(judgeSystem())], judgeUser(s), s);
      if (emptyJudgment(s)) {
        // 시험에서 AI가 칸을 거의 다 비운 판정을 한 번 돌려준 적이 있다(다시 부르면 정상). 한 번만 다시 요청한다.
        logEvent(s, "judge_empty_retry");
        s.final = await callJson(
          "judge",
          FinalJudgmentSchema,
          [cached(judgeSystem())],
          `${judgeUser(s)}\n\n※ 직전 판정이 비어 있었습니다(확정 코어도 보류 사유도 없음). 기록을 다시 보고 cores 또는 hold_summary·unresolved를 빠짐없이 채우세요.`,
          s,
        );
        if (emptyJudgment(s)) logEvent(s, "judge_empty_remaining", "검토 시 코어 판정을 직접 확인할 것");
      }
      s.finalizeStep = "jobs";
      logEvent(
        s,
        "judged",
        s.final.same_core.map((p) => `${p.experiences.join("·")} ${p.result}`).join(", ") + " · " + s.final.cores.map((c) => `${c.behavior.action}(${c.objects.confirmed.join("/")}):${c.status}`).join(", "),
      );
      break;
    }
    case "jobs": {
      const done = await jobsStep(s, deadline);
      logEvent(s, done ? "jobs_listed" : "jobs_progress", `${s.jobWork?.stage ?? "-"} · ${jobWorkSummary(s.jobWork)}`);
      if (done) s.finalizeStep = "write";
      break;
    }
    case "write": {
      if (!s.final) throw new Error("코어 판정이 없습니다");
      const report = await callJson("writer", ReportSchema, [cached(writerSystem())], writerUser(s, s.final), s);
      if (report.cores.length !== s.final.cores.length)
        logEvent(s, "report_core_count_mismatch", `판정 ${s.final.cores.length}개 / 결과지 ${report.cores.length}개 — 검토 필요`);
      // 코어 후보 칸은 판정의 후보(신호 1개, 최대 2개) 수에 맞추고, 해 볼 일의 종류는 코드가 정한 칸을 따른다.
      report.candidates = report.candidates.slice(0, shownCandidates(s.final).length);
      const plan = explorePlan(s);
      report.explore.items = report.explore.items
        .filter((it) => plan.some((p) => p.slot === it.slot))
        .map((it) => ({ ...it, kind: plan.find((p) => p.slot === it.slot)!.kind }));
      s.report = report;
      s.reliability = computeReliability(s);
      s.finalizeStep = "celeb";
      logEvent(s, "report_written");
      break;
    }
    case "celeb": {
      if (s.report && s.report.cores.length > 0) {
        s.celebDraft = await callJson("celeb", CelebDraftSchema, [cached(celebSystem())], celebUser(s), s);
        logEvent(s, "celeb_drafted", `${s.celebDraft.candidates.length}명`);
      }
      s.finalizeStep = "done";
      s.phase = "complete";
      break;
    }
    default:
      s.phase = "complete";
  }
}

// jobs 단계가 916개 직업을 다 훑으려면 Vercel 함수 시간제한(300초)보다 오래 걸릴 수 있다(§37에서 실제로 겪음).
// deadline을 넘기면 중간 상태(doneBatches)를 저장해두고, 스스로를 다시 호출해 새 시간 예산으로 이어받는다(§38).
// 버그로 끝없이 이어지는 걸 막는 안전장치로 이어서 호출 횟수를 제한한다.
const MAX_CONTINUATIONS = 8;

async function continueLater(s: Session, sessionId: string, baseUrl?: string) {
  const n = (s.finalizeContinuations ?? 0) + 1;
  if (!baseUrl || n > MAX_CONTINUATIONS) {
    console.error(`[runFinalize] 이어서 호출 ${baseUrl ? n + "번째" : "불가(baseUrl 없음)"} — 멈춤:`, sessionId);
    return;
  }
  s.finalizeContinuations = n;
  await save(s);
  try {
    await fetch(`${baseUrl}/api/sessions/${sessionId}/continue`, { method: "POST" });
  } catch (e) {
    console.error("[runFinalize] 이어서 호출 실패", e);
  }
}

/** 현재 상태를 고른 뒤(situation 라우트가 응답을 보낸 뒤) 결과지 초안이 끝까지 자동으로 이어지게 한다.
 * 예전에는 참가자 화면(탭)이 열려 있는 동안만 한 걸음씩 진행됐는데, 탭을 닫으면(특히 이메일만 입력하고 나가면)
 * 거기서 멈춰서 운영자가 npm run review로 직접 마무리해야 했다. 단계마다 세션을 다시 읽고 바로 저장해서,
 * 도중에 서버가 멈추거나 운영자가 review 스크립트로 동시에 손대도 이미 끝난 단계는 남는다.
 * baseUrl이 있으면 시간제한에 걸렸을 때 자기 자신(/continue)을 다시 호출해 새 시간 예산으로 이어간다(§38).
 */
export async function runFinalize(sessionId: string, baseUrl?: string) {
  const deadline = Date.now() + 240_000;
  for (let i = 0; i < 40; i++) {
    if (Date.now() >= deadline) {
      const s = await getStore().get(sessionId).catch(() => null);
      if (s && s.phase === "finalizing") await continueLater(s, sessionId, baseUrl);
      return;
    }
    let s: Session | null;
    try {
      s = await getStore().get(sessionId);
    } catch (e) {
      console.error("[runFinalize] load", e);
      return;
    }
    if (!s || s.phase !== "finalizing") return;
    try {
      await finalizeStep(s, deadline);
    } catch (e) {
      console.error("[runFinalize] step", s.finalizeStep, e);
      return; // 여기서 멈춰도 방금까지 성공한 단계는 이미 저장돼 있다. npm run review로 이어서 마무리할 수 있다.
    }
    await save(s);
    if (s.phase !== "finalizing") return;
  }
  const s = await getStore().get(sessionId).catch(() => null);
  if (s && s.phase === "finalizing") await continueLater(s, sessionId, baseUrl);
}

const MORE_REPLY = "네, 더 들려주세요. 다르게 이해한 부분이 있으면 그것도 편하게 말해주세요.";

/**
 * 재진술 카드의 버튼 처리(AI를 부르지 않아 즉시 끝난다).
 *  more: "더 할 얘기 있어요" — 카드를 닫고 대화를 이어간다
 *  next: "다음 질문으로 넘어갈게요" — 이 창을 정상 종료한다(이후 화면이 자동으로 기록 정리 → 다음 창으로 넘어간다)
 */
export function applyRestatement(s: Session, action: "more" | "next") {
  const kind = s.currentWindow;
  const w = s.windows[kind];
  // 카드가 떠 있거나, 카드를 한 번 봤다면 "다음 질문으로 넘어가기"는 언제든 가능하다
  if (!w.pendingRestatement && !(action === "next" && w.restatedOnce)) throw new Error("재진술 카드가 없습니다");
  const at = now();
  w.pendingRestatement = false;
  if (action === "next") {
    w.status = "done";
    w.closeReason = "completed";
    w.messages.push({ role: "assistant", content: CLOSING_HINT[kind], at });
    logEvent(s, "window_closed", `${kind}:completed`);
  } else {
    w.messages.push({ role: "assistant", content: MORE_REPLY, at });
    logEvent(s, "restatement_more", kind);
  }
}

/**
 * 인터뷰어 한 턴의 결과를 세션에 반영한다(실제 채팅 API와 시험 스크립트가 같은 방식으로 쓴다).
 * 재진술은 말풍선이 아니라 카드로 쌓이고, 사용자가 버튼을 누를 때까지 입력이 잠긴다.
 */
export function applyTurnResult(s: Session, kind: WindowKind, turn: TurnResult) {
  const w = s.windows[kind];
  const t = now();
  if (turn.coverage) w.coverage = turn.coverage;
  if (turn.reply) w.messages.push({ role: "assistant", content: turn.reply, at: t });
  if (turn.restatement) {
    w.messages.push({ role: "assistant", kind: "restatement", content: turn.restatement, at: t });
    w.pendingRestatement = true;
    w.restatedOnce = true;
    logEvent(s, "restatement_shown", kind);
  }
  if (turn.finish) {
    w.status = turn.finish === "no_experience" ? "skipped" : "done";
    w.closeReason = turn.finish;
    if (turn.finish === "misuse") s.flagged = "misuse";
    logEvent(s, "window_closed", `${kind}:${turn.finish}`);
  }
}
