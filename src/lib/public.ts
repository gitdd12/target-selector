import type { ChatMessage, Phase, Session, Target, WindowKind } from "./types";
import { WINDOW_ORDER } from "./types";

// 화면에 내려보내는 세션 모습. 분석 기록·결과지 초안·유명인 사례는 참가자에게 절대 내려보내지 않는다
// (결과지는 운영자 검토 후 이메일로만 나간다).
export interface PublicSession {
  id: string;
  phase: Phase;
  finalizeStep?: Session["finalizeStep"];
  currentWindow: WindowKind;
  windowIndex: number; // 0~3
  windowCount: number;
  awaitingAdvance: boolean; // 창이 끝났고 다음으로 넘어가기를 기다리는 중
  pendingRestatement: boolean; // 재진술 카드가 떠 있고 버튼을 기다리는 중
  canProceed: boolean; // 카드를 한 번 본 뒤라 "다음 질문으로 넘어가기"를 언제든 누를 수 있음
  messages: ChatMessage[];
  targets: Target[] | null;
  emailSubmitted: boolean;
  situation: Session["situation"] | null; // 인터뷰 끝 팝업에서 고른 현재 상태(아직 안 골랐으면 null)
}

export function toPublic(s: Session): PublicSession {
  const w = s.windows[s.currentWindow];
  const showTargets = s.currentWindow === "exp1" || s.currentWindow === "exp2";
  return {
    id: s.id,
    phase: s.phase,
    finalizeStep: s.finalizeStep,
    currentWindow: s.currentWindow,
    windowIndex: WINDOW_ORDER.indexOf(s.currentWindow),
    windowCount: WINDOW_ORDER.length,
    awaitingAdvance: s.phase === "interview" && (w.status === "done" || w.status === "skipped") && !w.recorded,
    pendingRestatement: Boolean(w.pendingRestatement),
    canProceed: Boolean(w.restatedOnce) && !w.pendingRestatement && w.status === "active",
    messages: w.messages,
    targets: s.targets && showTargets ? s.targets.survivors : null,
    emailSubmitted: s.emailSubmitted,
    situation: s.situation ?? null,
  };
}
