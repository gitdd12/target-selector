"use client";

import { useState } from "react";

// 검토 화면: 출처를 확인한 인물 사례를 승인하고, 결과지를 공개한다. 공개하면 /r/<세션번호> 링크가 열린다.
export default function PublishPanel({
  id,
  published,
  people,
}: {
  id: string;
  published: boolean;
  people: { name: string; field: string; approved: boolean }[];
}) {
  const [approved, setApproved] = useState(people.map((p) => p.approved));
  const [pub, setPub] = useState(published);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const link = typeof window === "undefined" ? `/r/${id}` : `${window.location.origin}/r/${id}`;

  async function send(nextPub: boolean) {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/review/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, published: nextPub, approved: approved.map((a, i) => (a ? i : -1)).filter((i) => i >= 0) }),
      });
      if (!res.ok) throw new Error();
      setPub(nextPub);
      setMsg(nextPub ? "공개했어요. 아래 링크를 이메일에 넣어 보내세요." : "저장했어요.");
    } catch {
      setMsg("저장하지 못했어요. 다시 로그인했는지 확인해 주세요.");
    }
    setBusy(false);
  }

  return (
    <div>
      {people.length > 0 && (
        <>
          <div className="q-sub" style={{ marginTop: 0 }}>
            출처를 직접 확인해서 맞는 인물만 체크하세요. 체크한 인물만 결과지에 나갑니다.
          </div>
          {people.map((p, i) => (
            <label key={p.name} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 0", fontSize: 15 }}>
              <input
                type="checkbox"
                checked={approved[i]}
                onChange={(e) => setApproved(approved.map((a, j) => (j === i ? e.target.checked : a)))}
              />
              <span>
                <b>{p.name}</b> <span style={{ color: "var(--dim)", fontSize: 13 }}>· {p.field}</span>
              </span>
            </label>
          ))}
        </>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
        <button className="btn-ghost" style={{ width: "auto", padding: "10px 16px" }} disabled={busy} onClick={() => send(pub)}>
          승인 저장
        </button>
        <button className="btn-primary" style={{ width: "auto", padding: "10px 18px" }} disabled={busy} onClick={() => send(!pub)}>
          {pub ? "공개 취소" : "결과지 공개하기"}
        </button>
      </div>
      <div className="q-note" style={{ marginTop: 12 }}>
        상태: <b>{pub ? "공개됨" : "비공개"}</b> · 링크: <a href={link}>{link}</a>
      </div>
      {msg && <div className="q-note">{msg}</div>}
    </div>
  );
}
