import { cached, callJson } from "./llm";
import { jobsStep, jobWorkSummary } from "./jobfinder";
import { computeReliability } from "./reliability";
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
  type ExperienceFields,
  type Session,
  type WindowKind,
} from "./types";

const now = () => new Date().toISOString();

// 스펙의 확정 조건: 기본 조건(구체 행동 + 본인이 정한 부분)을 못 넘으면 근거 부족, 넘었어도 무게 신호가 하나도 없으면 후보, 하나 이상이면 확정(단일 경험).
// AI가 적은 근거(self_chosen_evidence, weight_signals)로 코드가 status를 다시 계산한다.
// 무게 신호 네 가지(①~③ weight_signals + ④ 본인이 정한 부분) 중 두 개 이상이면 확정(스펙 v0.28).
export const MIN_WEIGHT_SIGNALS = 2;
export function deriveStatus(f: ExperienceFields): ExperienceFields["status"] {
  if (f.concrete_action_confirmed === false) return "근거 부족";
  const n =
    Object.values(f.weight_signals).filter((x) => x.present).length + (f.self_chosen_evidence.result === "확인됨" ? 1 : 0);
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

/** 경험 2 뒤 선택 카드: yes면 경험 3 창을 열고, no면 건너뛰고 가치관 질문으로 간다. AI를 부르지 않는다. */
export function chooseExtra(s: Session, choice: "yes" | "no") {
  if (s.extraOffer !== "pending") return;
  s.extraOffer = choice;
  logEvent(s, "extra_chosen", choice);
  if (choice === "yes") startWindow(s, "exp3");
  else {
    skipExtra(s);
    startWindow(s, "hardship");
  }
}

/** 창 하나가 끝난 뒤: 기록 정리(분석)를 하고 다음 창을 연다. 마지막 창이면 결과지 초안 단계로 넘어간다. */
export async function advance(s: Session) {
  const kind = s.currentWindow;
  const w = s.windows[kind];
  if (w.status !== "done" && w.status !== "skipped") throw new Error("아직 끝나지 않은 창입니다");

  if (!w.recorded) {
    const hasUserText = w.messages.some((m) => m.role === "user");
    // 오용으로 중단된 창은 분석하지 않는다(쓸모없는 입력에 비용을 쓰지 않음)
    if (w.status === "done" && hasUserText && w.closeReason !== "no_experience" && w.closeReason !== "misuse") {
      if (isExpWindow(kind)) {
        const rec = await callJson(
          "recorder",
          ExperienceFieldsSchema,
          [cached(recorderSystem(kind))],
          recorderUser(kind, w.messages),
          s,
        );
        rec.status = deriveStatus(rec);
        s.records[kind] = rec;
      } else {
        s.records[kind] = await callJson(
          "recorder",
          ValuesFieldsSchema,
          [cached(recorderSystem(kind))],
          recorderUser(kind, w.messages),
          s,
        );
      }
      logEvent(s, "recorded", kind);
    }
    w.recorded = true;
  }

  let next = WINDOW_ORDER[WINDOW_ORDER.indexOf(kind) + 1];
  if (kind === "exp2" && !s.flagged) {
    // 경험 2를 실제로 이야기했으면 "경험 하나 더 이야기하기"를 고를 수 있게 멈춘다(v0.32). 없다고 끝났으면 묻지 않고 건너뛴다.
    if (w.status === "done" && w.closeReason !== "no_experience") {
      s.extraOffer = "pending";
      logEvent(s, "extra_offered");
      return;
    }
    skipExtra(s);
    next = "hardship";
  }
  if (s.flagged === "misuse") {
    // 오용으로 중단: 결과지 초안을 만들지 않고 종료 화면으로 보낸다
    s.phase = "complete";
    s.finalizeStep = "done";
    logEvent(s, "interview_ended_misuse");
  } else if (next && s.flagged !== "budget") startWindow(s, next);
  else {
    s.phase = "finalizing";
    s.finalizeStep = "judge";
    logEvent(s, "interview_complete");
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
 */
export async function finalizeStep(s: Session) {
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
      const done = await jobsStep(s);
      logEvent(s, done ? "jobs_listed" : "jobs_progress", `${s.jobWork?.stage ?? "-"} · ${jobWorkSummary(s.jobWork)}`);
      if (done) s.finalizeStep = "write";
      break;
    }
    case "write": {
      if (!s.final) throw new Error("코어 판정이 없습니다");
      const report = await callJson("writer", ReportSchema, [cached(writerSystem())], writerUser(s, s.final), s);
      if (report.cores.length !== s.final.cores.length)
        logEvent(s, "report_core_count_mismatch", `판정 ${s.final.cores.length}개 / 결과지 ${report.cores.length}개 — 검토 필요`);
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
