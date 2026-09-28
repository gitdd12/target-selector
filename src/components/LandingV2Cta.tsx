"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import PrivacyNotice from "./PrivacyNotice";
import styles from "./LandingV2.module.css";

const STORAGE_KEY = "coreFinder.session";

// 이 브라우저에 저장된 진행 중 인터뷰가 있는지(서버 화면에서는 항상 없음으로 본다)
function readResumeId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
const noSubscribe = () => () => {};

// /v2의 "시작하기" 버튼. 원래 랜딩(Landing.tsx)과 같은 로직(실제 세션 시작, 이어서 하기, 개인정보 안내)을 쓴다.
export default function LandingV2Cta({ needsCode, contact, full }: { needsCode: boolean; contact: string; full: boolean }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const resumeId = useSyncExternalStore(noSubscribe, readResumeId, () => null);
  // 저장된 번호가 있어도, 서버에서 확인해 "아직 이어서 할 게 있는 인터뷰"일 때만 버튼을 보여준다
  const [resumable, setResumable] = useState(false);
  useEffect(() => {
    if (!resumeId) return;
    let cancelled = false;
    const forget = () => {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
    };
    fetch("/api/sessions/" + resumeId)
      .then(async (res) => {
        if (!res.ok) return forget();
        const s = await res.json();
        if (s.emailSubmitted) return forget();
        if (!cancelled) setResumable(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [resumeId]);

  async function start() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent: true, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "시작하지 못했어요. 다시 시도해주세요.");
      try {
        localStorage.setItem(STORAGE_KEY, data.id);
      } catch {}
      router.push(`/s/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "시작하지 못했어요.");
      setBusy(false);
    }
  }

  if (full) {
    return <p className={styles.ctaFull}>이번 베타는 참여 인원이 모두 찼어요. 관심 가져줘서 고마워요.</p>;
  }

  return (
    <>
      <button className={styles.button} onClick={start} disabled={busy || (needsCode && !code.trim())}>
        {busy ? "준비 중…" : "시작하기"}
      </button>
      {(error || (resumeId && resumable) || needsCode) && (
        <div className={styles.ctaExtra}>
          {error && <p className={styles.ctaError}>{error}</p>}
          {resumeId && resumable && (
            <button className={styles.ctaResume} onClick={() => router.push(`/s/${resumeId}`)}>
              하던 인터뷰 이어서 하기
            </button>
          )}
          {needsCode && (
            <input
              className={styles.ctaCode}
              placeholder="참여 코드"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="off"
            />
          )}
        </div>
      )}
      <PrivacyNotice contact={contact} className={styles.notice} listClassName={styles.noticeList} />
    </>
  );
}
