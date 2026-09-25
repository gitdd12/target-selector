import Link from "next/link";
import { estimateCost } from "@/lib/reviewText";
import { isReviewer, reviewEnabled } from "@/lib/reviewAuth";
import { getStore } from "@/lib/store";
import { WINDOW_LABEL, type Session } from "@/lib/types";

export const dynamic = "force-dynamic";

function status(s: Session): string {
  if (s.flagged === "misuse") return "오용으로 중단";
  if (s.phase === "complete") return s.report ? "초안 완료" : "종료(초안 없음)";
  if (s.phase === "finalizing") return "초안 만드는 중";
  if (s.phase === "interview") return `인터뷰 중 · ${WINDOW_LABEL[s.currentWindow]}`;
  return "시작 전";
}

export default async function ReviewHome({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  if (!reviewEnabled()) {
    return (
      <div className="app">
        <div className="q-title">검토 화면이 꺼져 있어요</div>
        <div className="q-sub">환경변수 REVIEW_PASSWORD를 설정하면 켜져요.</div>
      </div>
    );
  }

  if (!(await isReviewer())) {
    return (
      <div className="app" style={{ paddingTop: 60 }}>
        <div className="q-title">검토 화면</div>
        <div className="q-sub">운영자만 볼 수 있어요.</div>
        <form method="post" action="/api/review/login">
          <input className="text-input" type="password" name="password" placeholder="비밀번호" autoFocus />
          {error && <div className="error-text">비밀번호가 맞지 않아요.</div>}
          <div style={{ height: 14 }} />
          <button className="btn-primary" type="submit">
            들어가기
          </button>
        </form>
      </div>
    );
  }

  const store = getStore();
  const all = (await store.list()).reverse(); // 최근 것이 위로
  const rows = await Promise.all(all.map(async (s) => ({ s, contact: await store.getContact(s.id) })));
  const total = rows.reduce((n, r) => n + estimateCost(r.s.usage), 0);

  return (
    <div className="app">
      <div className="eyebrow">검토 화면</div>
      <div className="q-title">참가자 {rows.length}명</div>
      <div className="q-sub">누적 AI 사용 비용 추정 ${total.toFixed(2)} (콘솔 실제 청구와 다를 수 있어요)</div>
      <div style={{ marginTop: 18 }}>
        {rows.length === 0 && <div className="q-note">아직 참가자가 없어요.</div>}
        {rows.map(({ s, contact }) => (
          <Link key={s.id} href={`/review/${s.id}`} style={{ textDecoration: "none", color: "inherit" }}>
            <div className="card" style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <b style={{ fontSize: 15 }}>{status(s)}</b>
                <span style={{ fontSize: 12.5, color: "var(--dim)" }}>{s.createdAt.slice(0, 16).replace("T", " ")} (UTC)</span>
              </div>
              <div className="q-note" style={{ marginTop: 6 }}>
                나이대 {s.profile?.ageBand ?? "-"} · 이메일 {contact ? "받음" : s.emailSubmitted ? "받음(삭제됨)" : "없음"} · AI {s.usage?.calls ?? 0}회 · 약 $
                {estimateCost(s.usage).toFixed(2)}
                {s.flagged === "budget" ? " · ⚠ 총량 상한에 걸림" : ""}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
