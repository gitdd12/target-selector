"use client";

import { useEffect, useRef, useState } from "react";
import type { PublicSession } from "@/lib/public";

// 휴대폰 키보드가 올라오면 "눈에 보이는 화면"이 줄어든다. 채팅 화면 높이를 그 높이에 맞춰서
// 입력창이 키보드 위에 붙고, 대화 목록만 안에서 스크롤되게 한다(입력창이 키보드와 겹치지 않도록).
function useVisibleViewport() {
  useEffect(() => {
    const vv = window.visualViewport;
    const apply = () => {
      const h = vv ? vv.height : window.innerHeight;
      const top = vv ? vv.offsetTop : 0;
      const root = document.documentElement.style;
      root.setProperty("--app-h", `${h}px`);
      root.setProperty("--app-top", `${top}px`);
      if (window.scrollY > 0) window.scrollTo(0, 0); // iOS가 페이지 전체를 위로 밀어 올리는 것을 되돌린다
    };
    apply();
    vv?.addEventListener("resize", apply);
    vv?.addEventListener("scroll", apply);
    window.addEventListener("resize", apply);
    return () => {
      vv?.removeEventListener("resize", apply);
      vv?.removeEventListener("scroll", apply);
      window.removeEventListener("resize", apply);
      document.documentElement.style.removeProperty("--app-h");
      document.documentElement.style.removeProperty("--app-top");
    };
  }, []);
}

export default function Chat({
  session,
  onSend,
  onRestatement,
  onExtra,
  onRetry,
  sending,
  error,
}: {
  session: PublicSession;
  onSend: (text: string) => Promise<boolean>;
  onRestatement: (action: "more" | "next") => Promise<void>;
  onExtra: (choice: "yes" | "no") => Promise<void>;
  onRetry: () => void;
  sending: boolean;
  error: string;
}) {
  useVisibleViewport();
  const [text, setText] = useState("");
  const [choosing, setChoosing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const closed = session.awaitingAdvance;
  const pending = session.pendingRestatement;
  const offer = session.extraOffer; // 경험 2 뒤 "경험 하나 더 이야기하기" 선택 카드

  // 맨 아래에 붙어 있는 상태인지(사용자가 위로 올려서 지난 대화를 읽는 중이면 억지로 내리지 않는다)
  const stick = useRef(true);
  const toBottom = () => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  // 메시지가 늘거나 카드가 뜰 때마다 맨 아래로 내려간다. 렌더가 끝난 뒤(다음 화면 그리기 두 번 뒤)에 내려야 새 말풍선 높이가 반영된다.
  useEffect(() => {
    stick.current = true;
    const id = requestAnimationFrame(() => requestAnimationFrame(toBottom));
    return () => cancelAnimationFrame(id);
  }, [session.messages.length, sending, pending, closed, offer]);

  // 폰 키보드가 올라오거나 내려가서 화면 크기가 바뀔 때도, 맨 아래에 붙어 있었다면 다시 맨 아래로 내린다.
  // (AI가 답하는 사이 키보드가 움직이면 마지막 답이 가려지던 문제를 막는다)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      if (stick.current) toBottom();
    });
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, []);

  // "더 할 얘기 있어요"를 누르면 카드가 닫히고 입력창이 다시 열리니 바로 입력할 수 있게 한다
  useEffect(() => {
    if (!pending && !closed && !sending) inputRef.current?.focus();
  }, [pending, closed, sending]);

  async function submit() {
    const t = text.trim();
    if (!t || sending || closed || pending) return;
    const ok = await onSend(t);
    if (ok) setText("");
    inputRef.current?.focus(); // 보낸 뒤에도 입력창에 커서를 유지해서 키보드가 내려가지 않게 한다
  }

  async function chooseExtra(choice: "yes" | "no") {
    setChoosing(true);
    await onExtra(choice);
    setChoosing(false);
  }

  async function choose(action: "more" | "next") {
    setChoosing(true);
    await onRestatement(action);
    setChoosing(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // 한글 조합 중 Enter는 무시하고, 터치 기기에서는 Enter를 줄바꿈으로 둔다.
    if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    e.preventDefault();
    submit();
  }

  const pct = ((session.windowIndex + (closed ? 1 : 0.5)) / session.windowCount) * 100;
  const lastRestateIdx = session.messages.map((m) => m.kind).lastIndexOf("restatement");

  return (
    <div className="chat-screen">
      <div className="chat-head">
        <div className="topline" style={{ marginBottom: 12 }}>
          <div className="track">
            <div className="fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="meta">
            질문 {session.windowIndex + 1} / {session.windowCount}
          </div>
        </div>
        {session.targets && (
          <div className="targets-bar">
            <div className="lbl">내가 고른 대상</div>
            <div className="row">
              {session.targets.map((t) => (
                <span className="tag" key={t.id}>
                  {t.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div
        className="chat-scroll"
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
        }}
      >
        <div className="chat">
          {session.messages.map((m, i) =>
            m.kind === "restatement" ? (
              <div key={i} className={`restate-card fade-in${i === lastRestateIdx && pending ? "" : " done"}`}>
                <div className="restate-label">지금까지 이해한 내용</div>
                <div className="restate-text">{m.content}</div>
                {i === lastRestateIdx && pending && (
                  <>
                    <div className="restate-hint">다르게 이해한 부분이 있으면 &lsquo;더 할 얘기 있어요&rsquo;로 바로잡아 주세요.</div>
                    <div className="restate-btns">
                      <button className="btn-primary" disabled={choosing} onClick={() => choose("next")}>
                        다음 질문으로 넘어갈게요
                      </button>
                      <button className="btn-ghost" disabled={choosing} onClick={() => choose("more")}>
                        더 할 얘기 있어요
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div key={i} className={`bubble fade-in ${m.role === "user" ? "me" : `ai${session.messages[i - 1]?.role === "assistant" && session.messages[i - 1]?.kind !== "restatement" ? "" : " ai-first"}`}`}>
                {m.content}
              </div>
            ),
          )}
          {offer && (
            <div className="restate-card fade-in">
              <div className="restate-label">경험 하나 더</div>
              <div className="restate-text">더 이야기하고 싶은 경험이 있으면 하나 더 들려주세요. 없으면 다음 질문으로 넘어가도 돼요.</div>
              <div className="restate-btns">
                <button className="btn-primary" disabled={choosing} onClick={() => chooseExtra("no")}>
                  다음 질문으로 넘어가기
                </button>
                <button className="btn-ghost" disabled={choosing} onClick={() => chooseExtra("yes")}>
                  경험 하나 더 이야기하기
                </button>
              </div>
            </div>
          )}
          {sending && (
            <div className="bubble ai">
              <span className="typing">
                <i />
                <i />
                <i />
              </span>
            </div>
          )}
          {error && <div className="error-text">{error}</div>}
        </div>
      </div>

      <div className="chat-foot">
        {closed && error ? (
          <button className="btn-primary" onClick={onRetry}>
            다시 시도
          </button>
        ) : closed ? (
          <div className="q-sub" style={{ textAlign: "center", margin: "6px 0" }}>
            <span className="typing">
              <i />
              <i />
              <i />
            </span>{" "}
            이야기를 정리하고 있어요
          </div>
        ) : pending || offer ? (
          <div className="q-sub" style={{ textAlign: "center", margin: "6px 0" }}>
            위 카드에서 골라주세요
          </div>
        ) : (
          <>
            {session.canProceed && (
              <button
                className="btn-ghost"
                style={{ padding: "10px 14px", fontSize: 13.5, marginBottom: 8 }}
                disabled={choosing || sending}
                onClick={() => choose("next")}
              >
                다음 질문으로 넘어가기
              </button>
            )}
            <div className="box">
              <textarea
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="여기에 적어주세요"
                rows={1}
                readOnly={sending}
                enterKeyHint="send"
              />
              <button className="send" onClick={submit} disabled={!text.trim() || sending} aria-label="보내기">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
