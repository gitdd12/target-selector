"use client";

import Link from "next/link";
import { useState } from "react";
import type { PublicSession } from "@/lib/public";
import { TARGET_LIST } from "@/lib/targets";
import type { ChatMessage } from "@/lib/types";
import Chat from "./Chat";
import Complete from "./Complete";
import SituationPicker from "./SituationPicker";
import Landing from "./Landing";
import TargetPicker, { type TargetStep } from "./TargetPicker";

// 개발용 미리보기: 가짜 데이터로 실제 화면 컴포넌트를 그대로 그린다. 서버·AI를 부르지 않는다.

const t0 = "2026-01-01T00:00:00.000Z";
const A = (content: string, kind?: "restatement"): ChatMessage => ({ role: "assistant", content, at: t0, kind });
const U = (content: string): ChatMessage => ({ role: "user", content, at: t0 });

const OPEN = A("골랐던 대상들과 관련해서 일상 속에서 겪은 경험을 말해줘요.\n잘 안 떠오르면 꼭 위의 대상이 아니어도 돼요. 아주 사소한 것이어도 괜찮으니, 머릿속에서 바로 떠오르는 걸 말해주세요.");
const TALK: ChatMessage[] = [
  OPEN,
  U("얼마전에 제육볶음 한 거. 레시피 찾아보고 입맛대로 좀 바꿔서 했어"),
  A("제육볶음이요, 좋네요. 그날 처음에 뭐부터 했는지, 레시피 찾는 것부터 다 만들기까지 순서대로 기억나는 만큼 말해줄래요?"),
  U("레시피 찾고, 조회수 높은 거 골라서 재료 사고, 만들면서 설탕 좀 더 넣고, 그래서 먹었어"),
  A("설탕을 더 넣은 건 왜 그렇게 하기로 한 거예요? 그때 맛이 어떻게 됐으면 했어요?"),
  U("내가 원래 달게 먹어서, 그렇게 맛있으라고"),
];
const CARD = A(
  "얼마 전에 제육볶음을 만들었고, 레시피를 찾아서 조회수 높은 걸 골라 재료를 사고 만들었어요. 재료랑 순서는 레시피 그대로 하고, 원래 달게 먹어서 맛있으라고 설탕만 좀 더 넣어 단맛을 바꿨어요. 먹어보고 맛있다 싶을 때 됐다 싶었고, 그전엔 좀 심심한 맛이었다고 했어요.",
  "restatement",
);
const VALUES: ChatMessage[] = [
  A("가장 견디기 힘들었던 상황이나 싫었던 상황이 있었어요?"),
  U("팀플할 때 팀원들 말 안 들을 때"),
  A("실제로 그런 적이 있었던 팀플 하나만 떠올려 볼까요? 그때 어떤 장면이었어요?"),
];

type ChatState = "normal" | "typing" | "card" | "after-card" | "closing" | "closing-error" | "values";
const CHAT_STATES: { key: ChatState; label: string }[] = [
  { key: "normal", label: "대화 중" },
  { key: "typing", label: "생각 중" },
  { key: "card", label: "재진술 카드" },
  { key: "after-card", label: "카드 뒤" },
  { key: "closing", label: "정리 중" },
  { key: "closing-error", label: "오류" },
  { key: "values", label: "가치관 창" },
];

function makeSession(state: ChatState, extra: ChatMessage[]): PublicSession {
  const values = state === "values";
  const withCard = state === "card" || state === "after-card" || state === "closing" || state === "closing-error";
  const base = values ? VALUES : TALK;
  const messages = [...base, ...(withCard ? [A("지금까지 들은 걸 정리해봤어요."), CARD] : []), ...extra];
  if (state === "after-card") messages.push(A("네, 더 들려주세요. 다르게 이해한 부분이 있으면 그것도 편하게 말해주세요."));
  if (state === "closing" || state === "closing-error") messages.push(A("이야기 잘 들었어요. 다음 질문으로 넘어갈게요."));
  return {
    id: "dev",
    phase: "interview",
    currentWindow: values ? "hardship" : "exp1",
    windowIndex: values ? 2 : 0,
    windowCount: 4,
    awaitingAdvance: state === "closing" || state === "closing-error",
    pendingRestatement: state === "card",
    canProceed: state === "after-card",
    messages,
    targets: values ? null : [{ id: 2, category: "물질", name: "재료 (음식, 나무, 천, 흙, 금속)" }, { id: 8, category: "기호", name: "글, 문서" }],
    emailSubmitted: false,
    situation: null,
  };
}

function DevChat({ initial }: { initial: ChatState }) {
  const [state, setState] = useState<ChatState>(initial);
  const [extra, setExtra] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);

  const pick = (k: ChatState) => {
    setState(k);
    setExtra([]);
  };

  return (
    <>
      <details className="dev-menu">
        <summary>DEV</summary>
        <div className="dev-menu-body">
          {CHAT_STATES.map((c) => (
            <button key={c.key} className={c.key === state ? "on" : ""} onClick={() => pick(c.key)}>
              {c.label}
            </button>
          ))}
          <Link href="/dev">← 목록</Link>
        </div>
      </details>
      <Chat
        key={state}
        session={makeSession(state, extra)}
        sending={sending || state === "typing"}
        error={state === "closing-error" ? "잠시 문제가 생겼어요. 다시 시도해주세요." : ""}
        onSend={async (text) => {
          setExtra((e) => [...e, U(text)]);
          setSending(true);
          setTimeout(() => {
            setExtra((e) => [...e, A("(미리보기) 실제로는 AI가 여기에 다음 질문을 해요. 답이 오면 화면이 자동으로 맨 아래로 내려가요.")]);
            setSending(false);
          }, 1100);
          return true;
        }}
        onRestatement={async (action) => {
          if (action === "more") pick("after-card");
          else pick("closing");
        }}
        onRetry={() => pick("closing")}
      />
    </>
  );
}

const pickTargets = (ids: number[]) => TARGET_LIST.filter((t) => ids.includes(t.id));

export default function DevScreen({ name }: { name: string }) {
  const [note, setNote] = useState("");

  if (name === "landing" || name === "landing-full") {
    return (
      <>
        <BackLink />
        <Landing needsCode={false} contact="문의 메일이 여기에 표시돼요" full={name === "landing-full"} demo />
      </>
    );
  }

  if (name.startsWith("targets-")) {
    const step = name.replace("targets-", "");
    const cfg: Record<string, { step: TargetStep; ids: number[] }> = {
      intro: { step: "intro", ids: [] },
      rating: { step: "rating", ids: [] },
      eliminate: { step: "eliminate", ids: [2, 7, 8, 9, 12, 13] },
      "eliminate-few": { step: "eliminate", ids: [8, 12, 13] },
      candidates: { step: "candidates", ids: [8, 12, 13] },
    };
    const c = cfg[step] ?? cfg.intro;
    return (
      <>
        <BackLink />
        <TargetPicker
          key={name}
          initialStep={c.step}
          initialSurvivors={pickTargets(c.ids)}
          busy={false}
          error={note}
          onDone={() => setNote("미리보기 화면이라 저장되지 않아요.")}
        />
      </>
    );
  }

  if (name.startsWith("chat-")) return <DevChat key={name} initial={name.replace("chat-", "") as ChatState} />;

  if (name === "situation") {
    return (
      <>
        <BackLink />
        <Complete emailSubmitted={false} onSubmitEmail={async () => null} />
        <SituationPicker onPick={() => setNote("미리보기 화면이라 저장되지 않아요.")} busy={false} error={note} />
      </>
    );
  }

  if (name === "complete-email" || name === "complete-done") {
    return (
      <DoneWrapper initial={name === "complete-done"} />
    );
  }

  return (
    <div className="app">
      <div className="q-title">알 수 없는 화면</div>
      <BackLink />
    </div>
  );
}

function DoneWrapper({ initial }: { initial: boolean }) {
  const [done, setDone] = useState(initial);
  return (
    <>
      <BackLink />
      <Complete
        emailSubmitted={done}
        onSubmitEmail={async () => {
          setDone(true);
          return null;
        }}
      />
    </>
  );
}

function BackLink() {
  return (
    <div style={{ position: "fixed", top: 8, right: 8, zIndex: 100 }}>
      <Link href="/dev" style={{ fontSize: 12, background: "rgba(35,40,42,.85)", color: "#fff", padding: "5px 10px", borderRadius: 99, textDecoration: "none" }}>
        DEV · 목록
      </Link>
    </div>
  );
}
