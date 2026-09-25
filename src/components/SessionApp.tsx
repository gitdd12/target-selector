"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PublicSession } from "@/lib/public";
import type { TargetSelection } from "@/lib/types";
import Chat from "./Chat";
import Complete from "./Complete";
import SituationPicker from "./SituationPicker";
import TargetPicker from "./TargetPicker";


async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.message ?? "잠시 문제가 생겼어요. 다시 시도해주세요."), { code: data.error });
  return data;
}

export default function SessionApp({ id }: { id: string }) {
  const [s, setS] = useState<PublicSession | null>(null);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const running = useRef(false);
  const quietRetries = useRef(0);

  const base = `/api/sessions/${id}`;

  useEffect(() => {
    api(base)
      .then(setS)
      .catch((e) => (e.code === "not_found" ? setMissing(true) : setError(e.message)));
  }, [base]);

  // 창이 끝나면 자동으로: 기록 정리 → 새 창. (앞 창의 대화는 새 창으로 넘어가지 않는다)
  // 결과지 단계에서는 끝날 때까지 한 걸음씩 자동 진행한다.
  useEffect(() => {
    if (!s || running.current) return;
    const advanceNow = s.phase === "interview" && s.awaitingAdvance;
    // 현재 상태를 고르기 전에는 결과지 초안 만들기를 시작하지 않는다(그 선택이 결과지 내용에 들어간다)
    const finalizeNow = s.phase === "finalizing" && Boolean(s.situation);
    if (!advanceNow && !finalizeNow) return;

    running.current = true;
    const delay = advanceNow ? 1400 : 0; // 마무리 인사를 읽을 시간
    const t = setTimeout(async () => {
      setError("");
      try {
        const next = await api(`${base}/${advanceNow ? "advance" : "finalize"}`, { method: "POST" });
        setS(next);
      } catch (e) {
        setError(e instanceof Error ? e.message : "잠시 문제가 생겼어요.");
        // 결과지 초안은 참가자에게 안 보이는 뒷단계라, 실패하면 조용히 두 번까지만 다시 시도한다.
        // (그래도 안 되면 운영자가 review 스크립트로 이어서 마무리한다.)
        if (finalizeNow && quietRetries.current < 2) {
          quietRetries.current += 1;
          setTimeout(() => setRetry((n) => n + 1), 20000);
        }
      } finally {
        running.current = false;
      }
    }, delay);
    return () => {
      clearTimeout(t);
      running.current = false;
    };
  }, [s, base, retry]);

  const send = useCallback(
    async (text: string) => {
      setSending(true);
      setError("");
      // 내 말이 바로 보이도록 먼저 화면에 올린다
      setS((cur) =>
        cur ? { ...cur, messages: [...cur.messages, { role: "user", content: text, at: new Date().toISOString() }] } : cur,
      );
      try {
        setS(await api(`${base}/chat`, { method: "POST", body: JSON.stringify({ text }) }));
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "잠시 문제가 생겼어요.");
        // 실패한 말은 화면에서 빼고 입력창에 다시 남겨둔다
        setS((cur) => (cur ? { ...cur, messages: cur.messages.slice(0, -1) } : cur));
        return false;
      } finally {
        setSending(false);
      }
    },
    [base],
  );

  async function submitTargets(sel: TargetSelection) {
    setBusy(true);
    setError("");
    try {
      setS(await api(`${base}/targets`, { method: "POST", body: JSON.stringify(sel) }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "잠시 문제가 생겼어요.");
    } finally {
      setBusy(false);
    }
  }

  async function submitEmail(email: string): Promise<string | null> {
    try {
      setS(await api(`${base}/email`, { method: "POST", body: JSON.stringify({ email }) }));
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "잠시 문제가 생겼어요. 다시 시도해주세요.";
    }
  }

  async function submitSituation(situation: string) {
    setBusy(true);
    setError("");
    try {
      setS(await api(`${base}/situation`, { method: "POST", body: JSON.stringify({ situation }) }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "잠시 문제가 생겼어요. 다시 시도해주세요.");
    } finally {
      setBusy(false);
    }
  }

  // 재진술 카드의 버튼: 더 할 얘기 있어요(more) / 다음 질문으로 넘어갈게요(next)
  async function restate(action: "more" | "next") {
    setError("");
    try {
      setS(await api(`${base}/restatement`, { method: "POST", body: JSON.stringify({ action }) }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "잠시 문제가 생겼어요. 다시 시도해주세요.");
    }
  }

  if (missing) {
    return (
      <div className="app">
        <div className="q-title">이 인터뷰를 찾을 수 없어요</div>
        <div className="q-sub">링크가 잘못됐거나 기록이 삭제됐어요.</div>
        <div style={{ height: 16 }} />
        <Link href="/">
          <button className="btn-primary">처음으로</button>
        </Link>
      </div>
    );
  }
  if (!s) {
    return (
      <div className="app">
        {error ? <div className="error-text">{error}</div> : <div className="q-sub">불러오는 중…</div>}
      </div>
    );
  }

  if (s.phase === "targets") return <TargetPicker onDone={submitTargets} busy={busy} error={error} />;

  if (s.phase === "interview") {
    return (
      <Chat
        key={s.currentWindow}
        session={s}
        onSend={send}
        onRestatement={restate}
        onRetry={() => setRetry((n) => n + 1)}
        sending={sending}
        error={error}
      />
    );
  }

  // 인터뷰가 끝난 뒤: 이메일을 받는 동안 결과지 초안은 뒤에서 조용히 만들어진다(참가자에게는 안 보임).
  // 참가자가 창을 닫아도 운영자가 review 스크립트로 남은 단계를 마무리할 수 있다.
  return (
    <>
      <Complete emailSubmitted={s.emailSubmitted} onSubmitEmail={submitEmail} />
      {s.phase === "finalizing" && !s.situation && <SituationPicker onPick={submitSituation} busy={busy} error={error} />}
    </>
  );
}
