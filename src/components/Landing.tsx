"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import LandingFrame from "./LandingFrame";
import LandingStory from "./LandingStory";

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

export default function Landing({
  needsCode,
  contact,
  full,
  demo = false,
}: {
  needsCode: boolean;
  contact: string;
  full: boolean;
  demo?: boolean; // 개발용 미리보기(/dev)에서는 실제 인터뷰를 시작하지 않는다
}) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const resumeId = useSyncExternalStore(noSubscribe, readResumeId, () => null);
  // 저장된 번호가 있어도, 서버에서 확인해 "아직 이어서 할 게 있는 인터뷰"일 때만 버튼을 보여준다
  // (기록이 없어졌거나, 이미 끝나고 이메일까지 남겼으면 숨기고 저장된 번호도 지운다)
  const [resumable, setResumable] = useState(false);
  useEffect(() => {
    if (!resumeId || demo) return;
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
  }, [resumeId, demo]);

  async function start() {
    if (demo) {
      setError("미리보기 화면이라 실제로 시작되지는 않아요.");
      return;
    }
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

  const notice = (
        <div className="site-foot">
          <details className="more">
            <summary>개인정보 수집·이용 안내</summary>
            <dl>
              <dt>받는 정보</dt>
              <dd>
                채팅으로 적어준 내용, 대상 고르기에서의 선택과 응답 시간, 결과지를 받을 이메일. 이메일은 대화 기록과 따로
                저장해요. 이름·연락처·회사명은 받지 않아요.
              </dd>
              <dt>쓰는 목적</dt>
              <dd>
                결과지 생성과 발송, 그리고 질문과 결과지를 개선하기 위한 분석. 개선을 위한 분석에는 이메일을 제외하고
                사용해요.
              </dd>
              <dt>운영자가 보는 것</dt>
              <dd>결과지를 검토하고 다듬으려고 운영자가 여러분이 적은 대화 내용을 직접 읽어요. 결과지는 3일 안에 이메일로 보내드려요.</dd>
              <dt>보관 기간</dt>
              <dd>
                이메일은 결과지를 보낸 뒤 30일 안에, 대화 기록은 베타가 끝난 뒤 90일 안에 삭제해요. 그 전에도 원하면 문의
                메일로 알려주면 바로 지워드려요.
              </dd>
              <dt>AI 처리와 해외 전송</dt>
              <dd>
                AI가 답변과 결과지 초안을 만들려면 적어준 내용이 AI 회사(Anthropic, 미국)의 서버로 전송돼 처리돼요. 이 회사가
                이 내용을 자기 목적으로 쓰지 않도록 서비스 이용 조건에 따라 처리를 맡기고 있어요.
              </dd>
              <dt>참여 조건</dt>
              <dd>만 14세 이상이면 참여할 수 있어요. 건강·종교·정치 성향 같은 민감한 내용은 적지 않아도 돼요.</dd>
              <dt>문의·삭제 요청</dt>
              <dd>{contact ? contact : "운영자에게 직접 알려주세요."}</dd>
            </dl>
            <div style={{ marginTop: 10 }}>
              <Link href="/privacy">개인정보 처리 안내 전문</Link>
            </div>
          </details>
        </div>
  );

  return (
    <>
      <LandingStory />
      <LandingFrame footer={notice}>
        {full ? (
          <p style={{ fontSize: 15, color: "#cfc9e6" }}>이번 베타는 참여 인원이 모두 찼어요. 관심 가져줘서 고마워요.</p>
        ) : (
          <div className="on-dark">
            <button className="cta-start" onClick={start} disabled={busy || (needsCode && !code.trim())}>
              {busy ? "준비 중…" : "시작하기"}
            </button>
            {error && <div className="cta-error">{error}</div>}
            {resumeId && resumable && (
              <button className="cta-link" onClick={() => router.push(`/s/${resumeId}`)}>
                하던 인터뷰 이어서 하기
              </button>
            )}

            {needsCode && (
              <input
                className="text-input"
                placeholder="참여 코드"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoComplete="off"
                style={{ marginTop: 14 }}
              />
            )}
          </div>
        )}
      </LandingFrame>

    </>
  );
}
