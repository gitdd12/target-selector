"use client";

import { useState } from "react";

// 인터뷰가 끝난 뒤 화면. 결과지는 바로 보여주지 않고, 이메일을 받아 3일 안에 검토 후 보낸다(스펙: 결과지 전달 방식).
export default function Complete({
  emailSubmitted,
  onSubmitEmail,
}: {
  emailSubmitted: boolean;
  onSubmitEmail: (email: string) => Promise<string | null>; // 실패하면 안내 문구를 돌려준다
}) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setBusy(true);
    setError("");
    const err = await onSubmitEmail(email);
    if (err) setError(err);
    setBusy(false);
  }

  return (
    <div className="app fade-in" style={{ minHeight: "100svh", display: "flex", flexDirection: "column", justifyContent: "center", paddingTop: 24, paddingBottom: 40 }}>
      <div className="interlude" style={{ paddingTop: 0, paddingBottom: 12 }}>
        <div className="q-title">이야기 들려줘서 고마워요</div>
        <div className="q-sub">
          모든 질문이 끝났어요. 나눈 이야기를 바탕으로 결과지를 만들고 있어요.
        </div>
      </div>

      {!emailSubmitted ? (
        <div className="card">
          <div className="eyebrow">결과지 받을 곳</div>
          <div className="q-sub" style={{ marginTop: 0 }}>
            결과지는 직접 확인하고 다듬어서 <b>3일 안에 이메일로</b> 보내드려요. 받을 이메일 주소를 적어주세요.
          </div>
          <input
            className="text-input"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="example@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing && email.trim() && !busy) submit();
            }}
          />
          {error && <div className="error-text">{error}</div>}
          <div style={{ height: 14 }} />
          <button className="btn-primary" onClick={submit} disabled={busy || !email.trim()}>
            {busy ? "저장하는 중…" : "이 주소로 받을게요"}
          </button>
        </div>
      ) : (
        <div className="card">
          <div className="eyebrow">접수됐어요</div>
          <div className="q-title" style={{ fontSize: 18 }}>
            3일 안에 이메일로 보내드릴게요
          </div>
          <div className="q-sub">
            결과지와 함께 몇 가지 여쭤보는 메일도 같이 갈 거예요. 이제 이 창을 닫아도 괜찮아요.
          </div>
        </div>
      )}

    </div>
  );
}
