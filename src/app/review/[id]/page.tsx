import Link from "next/link";
import CopyButton from "@/components/CopyButton";
import { isReviewer } from "@/lib/reviewAuth";
import PublishPanel from "@/components/PublishPanel";
import { coreBehavior, getScenes } from "@/lib/result";
import { estimateCost, reportToText } from "@/lib/reviewText";
import { headers } from "next/headers";
import { getStore, isValidId } from "@/lib/store";
import { COVERAGE_KEYS, COVERAGE_LABEL, WINDOW_LABEL, WINDOW_ORDER } from "@/lib/types";

export const dynamic = "force-dynamic";

const box = { background: "var(--card)", borderRadius: 16, padding: "18px 20px", marginTop: 14 } as const;
const h2 = { fontFamily: "var(--font-serif)", fontSize: 17, margin: "28px 0 4px" } as const;

export default async function ReviewDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await isReviewer())) {
    return (
      <div className="app">
        <div className="q-sub">로그인이 필요해요.</div>
        <Link href="/review">
          <button className="btn-ghost" style={{ marginTop: 12 }}>
            검토 화면으로
          </button>
        </Link>
      </div>
    );
  }
  const s = isValidId(id) ? await getStore().get(id) : null;
  if (!s) return <div className="app q-title">참가자를 찾을 수 없어요</div>;
  const contact = await getStore().getContact(id);
  const r = s.report;
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const text = reportToText(s, `${origin}/r/${s.id}`);

  return (
    <div className="app report">
      <Link href="/review" style={{ fontSize: 13, color: "var(--dim)" }}>
        ← 목록
      </Link>

      {/* 발송 정보 */}
      <div style={box}>
        <div className="eyebrow">발송 정보</div>
        <div className="q-sub" style={{ marginTop: 0, lineHeight: 1.9 }}>
          이메일: <b>{contact?.email ?? (s.emailSubmitted ? "(삭제됨)" : "(남기지 않음)")}</b>
          <br />
          나이대 {s.profile?.ageBand ?? "-"} · 고른 대상 {s.targets?.survivors.map((t) => t.name).join(", ") ?? "-"}
          <br />
          스펙 질문흐름 {s.specVersions.interview} / 결과지 {s.specVersions.result} · AI {s.usage?.calls ?? 0}회 · 약 $
          {estimateCost(s.usage).toFixed(2)}
          {s.flagged ? ` · ⚠ ${s.flagged === "misuse" ? "오용으로 중단" : "총량 상한"}` : ""}
        </div>
      </div>

      {!r && (
        <div style={box}>
          <div className="q-sub" style={{ marginTop: 0 }}>
            결과지 초안이 아직 없어요. {s.phase === "finalizing" ? "터미널에서 `npm run review -- " + s.id + "`로 마무리할 수 있어요." : ""}
          </div>
        </div>
      )}

      {r && (
        <>
          {/* 1. 결과지 미리보기 · 공개 */}
          <h2 style={h2}>1. 참가자에게 보낼 결과지</h2>
          <div className="q-sub" style={{ marginTop: 0 }}>
            아래는 참가자가 받는 화면 그대로예요. 인물 사례는 출처를 확인해서 승인한 것만 나가고, 공개하면 이메일에 넣을 링크가 열려요.
          </div>
          <div style={box}>
            <div className="eyebrow">공개 · 인물 승인</div>
            <PublishPanel
              id={s.id}
              published={Boolean(s.published)}
              people={(s.celebDraft?.candidates ?? []).map((c, i) => ({ name: c.name, field: c.field_and_era, approved: (s.approvedCelebs ?? []).includes(i) }))}
            />
          </div>
          <iframe
            src={`/r/${s.id}?preview=1`}
            title="결과지 미리보기"
            style={{ display: "block", width: "100%", maxWidth: 420, height: 760, border: "1px solid var(--line)", borderRadius: 20, marginTop: 14, background: "#fff" }}
          />

          <div style={{ ...box, marginTop: 10 }}>
            <div className="eyebrow">이메일 본문용 글 (링크 포함, 복사해서 붙여넣기)</div>
            <textarea className="out" readOnly value={text} style={{ height: 160, marginTop: 6 }} />
            <div style={{ marginTop: 10 }}>
              <CopyButton text={text} label="글 복사하기" />
            </div>
          </div>

          {/* 2. 검토 메모 */}
          <h2 style={h2}>2. 검토 메모 (참가자에게 보내지 않음)</h2>
          <div style={box}>
            <div className="eyebrow">화면에 나가는 코어 행동 ← 내부 코어 태그 (태그는 화면·본문 어디에도 나가지 않아야 함)</div>
            <div className="q-sub" style={{ marginTop: 0 }}>
              {r.cores.map((c, i) => `'${coreBehavior(c)}' ← ${c.core}${s.reliability?.[i] ? ` · 신뢰도 ${s.reliability[i].grade}` : ""}`).join(" / ") || "확정된 코어 없음"}
            </div>
            {s.final && (
              <>
                <div className="eyebrow" style={{ marginTop: 18 }}>
                  코어 판정
                </div>
                {s.final.cores.map((c) => (
                  <div key={c.core} style={{ marginTop: 8, fontSize: 14, lineHeight: 1.75, color: "var(--ink-soft)" }}>
                    <b>
                      {c.core} · {c.status} · 근거 경험 {c.basis_experiences.join("+")}
                    </b>
                    <br />
                    {c.reasoning}
                    <br />
                    <span style={{ color: "var(--dim)" }}>서술 범위: {c.scope_note}</span>
                  </div>
                ))}
                {s.final.unresolved.length > 0 && (
                  <>
                    <div className="eyebrow" style={{ marginTop: 18 }}>
                      보류한 후보
                    </div>
                    {s.final.unresolved.map((u) => (
                      <div key={u.core} style={{ marginTop: 8, fontSize: 14, lineHeight: 1.75, color: "var(--ink-soft)" }}>
                        <b>{u.core}</b> — {u.reason}
                      </div>
                    ))}
                  </>
                )}
                <div className="eyebrow" style={{ marginTop: 18 }}>
                  두 경험의 관계
                </div>
                <div style={{ marginTop: 6, fontSize: 14, lineHeight: 1.75, color: "var(--ink-soft)" }}>{s.final.cross_experience_pattern}</div>
              </>
            )}
            {s.jobPick && (
              <>
                <div className="eyebrow" style={{ marginTop: 18 }}>
                  AI가 제외한 직업
                </div>
                {s.jobPick.excluded.map((e) => (
                  <div key={e.code} style={{ marginTop: 6, fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.65 }}>
                    {s.jobCandidates?.find((c) => c.code === e.code)?.title ?? e.code} — {e.reason}
                  </div>
                ))}
              </>
            )}
          </div>

          {/* 3. 유명인 사례 초안 */}
          <h2 style={h2}>3. 유명인 사례 초안 — 전부 미검증</h2>
          <div className="q-sub" style={{ marginTop: 0 }}>
            출처를 직접 확인해서 통과한 것만 결과지에 넣으세요. 확신도가 높아도 검증 전에는 사실로 취급하지 마세요.
          </div>
          {(s.celebDraft?.candidates ?? []).map((c, i) => (
            <div key={i} style={box}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                <b style={{ fontSize: 16 }}>
                  {i + 1}. {c.name} <span style={{ fontWeight: 400, color: "var(--dim)", fontSize: 13 }}>· {c.field_and_era}</span>
                </b>
                <span style={{ fontSize: 12.5, background: "var(--accent-soft)", color: "var(--accent)", padding: "3px 10px", borderRadius: 99 }}>
                  AI 확신도 {c.confidence}
                </span>
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.75, color: "var(--ink-soft)", marginTop: 8 }}>
                <b>닮은 점</b> {c.why_similar}
                {getScenes(c).map((sc, j) => (
                  <div key={j} style={{ marginTop: 10 }}>
                    <b>장면 {j + 1}. {sc.title}</b>
                    <br />
                    {sc.scene}
                    <br />
                    <span style={{ color: "var(--dim)" }}>강점:</span> {sc.strength}
                    {sc.cost && (
                      <>
                        <br />
                        <span style={{ color: "var(--dim)" }}>문제점:</span> {sc.cost}
                      </>
                    )}
                  </div>
                ))}
                {c.at_your_scale && (
                  <div style={{ marginTop: 10 }}>
                    <b>나의 이야기와 이어 보면</b> {c.at_your_scale}
                  </div>
                )}
                <div style={{ marginTop: 10 }}>
                  <b>출처 후보</b> {c.source_hint}
                </div>
                <div style={{ marginTop: 6 }}>
                  <b>검증 검색어</b>{" "}
                  {c.verification_queries.map((q) => (
                    <a
                      key={q}
                      href={`https://www.google.com/search?q=${encodeURIComponent(q)}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ display: "inline-block", marginRight: 10, color: "var(--accent)" }}
                    >
                      {q}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          ))}
          {s.celebDraft?.notes && (
            <div className="quote-box" style={{ marginTop: 14, fontSize: 13.5 }}>
              <div className="label">AI의 검토 메모</div>
              {s.celebDraft.notes}
            </div>
          )}
        </>
      )}

      {/* 4. 원문 대화 */}
      <h2 style={h2}>4. 원문 대화 (사실 대조용)</h2>
      {WINDOW_ORDER.map((k) => {
        const w = s.windows[k];
        return (
          <details key={k} style={{ ...box, marginTop: 10 }}>
            <summary style={{ cursor: "pointer", fontWeight: 600 }}>
              {WINDOW_LABEL[k]} <span style={{ fontWeight: 400, color: "var(--dim)", fontSize: 13 }}>· {w.status}
                {w.closeReason ? ` / ${w.closeReason}` : ""} · 참가자 발화 {w.messages.filter((m) => m.role === "user").length}회</span>
            </summary>
            {w.coverage && (
              <div className="q-note" style={{ marginTop: 10 }}>
                <b>확보 현황(마지막 턴 기준)</b>{" "}
                {COVERAGE_KEYS.map((k) => `${COVERAGE_LABEL[k]}: ${w.coverage?.[k] ?? "-"}`).join(" · ")}
              </div>
            )}
            {(k === "exp1" || k === "exp2") && s.records[k]?.weight_signals && (
              <div className="q-note" style={{ marginTop: 10 }}>
                <b>기록 판정</b> {s.records[k]?.status} · 본인 선택 {s.records[k]?.self_chosen_evidence.result} · 무게 신호{" "}
                {(
                  [
                    ["요구 이상의 수고", "extra_effort"],
                    ["방식의 반복", "repeated"],
                    ["행동 자체의 충족", "fulfillment_on_action"],
                  ] as const
                )
                  .map(([label, key]) => `${label} ${s.records[k]?.weight_signals[key]?.present ? "○" : "×"}`)
                  .join(" · ")}
                {s.records[k]?.other_object && (
                  <>
                    <br />
                    다른 대상 {s.records[k]?.other_object.present ? `○ (${s.records[k]?.other_object.objects})` : "×"} · 비교 선호{" "}
                    {s.records[k]?.comparison_preference?.tried_other_action ? s.records[k]?.comparison_preference.less_engaging : "해 본 적 없음"}
                  </>
                )}
              </div>
            )}
            <div className="chat" style={{ marginTop: 14 }}>
              {w.messages.map((m, i) =>
                m.kind === "restatement" ? (
                  <div key={i} className="restate-card done">
                    <div className="restate-label">재진술 카드</div>
                    <div className="restate-text">{m.content}</div>
                  </div>
                ) : (
                  <div key={i} className={`bubble ${m.role === "user" ? "me" : "ai"}`}>
                    {m.content}
                  </div>
                ),
              )}
            </div>
          </details>
        );
      })}

      <h2 style={h2}>진행 로그</h2>
      <div className="q-note" style={{ marginTop: 6, fontFamily: "ui-monospace, monospace", fontSize: 12 }}>
        {s.log.map((l, i) => (
          <div key={i}>
            {l.at.slice(11, 19)} {l.event}
            {l.detail ? ` — ${l.detail}` : ""}
          </div>
        ))}
      </div>
    </div>
  );
}
