"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { RATE_SECONDS, SCALE_LABELS, TARGET_COUNT, TARGET_LIST } from "@/lib/targets";
import type { Target, TargetSelection } from "@/lib/types";

// index.html의 "10초 안에 대상을 평가하고 제거해서 좁히는 방식"만 가져왔다.
// 15개를 10초씩 평가 → 5점 이상만 남김 → 덜 끌리는 것을 지워서 좁힘.
// 4개 이하여도 더 지울 수 있다(확실히 더 끌리는 게 있으면 1개까지).

type Step = "intro" | "rating" | "eliminate" | "candidates";

const nowMs = () => Date.now();

// 대상 하나를 10초 안에 평가하는 카드. 대상이 바뀌면 key로 새로 만들어져 타이머가 처음부터 다시 돈다.
function RatingCard({
  item,
  index,
  total,
  onRate,
  onBack,
}: {
  item: Target;
  index: number;
  total: number;
  onRate: (score: number, timedOut: boolean, ms: number) => void;
  onBack: () => void;
}) {
  const [timeLeft, setTimeLeft] = useState(RATE_SECONDS);
  const startedAt = useRef(0);
  const timeUp = useEffectEvent(() => onRate(4, true, nowMs() - startedAt.current)); // 시간초과는 "보통이다(4점)"

  useEffect(() => {
    startedAt.current = nowMs();
    const t = setInterval(() => {
      const left = Math.max(0, RATE_SECONDS - (nowMs() - startedAt.current) / 1000);
      setTimeLeft(left);
      if (left <= 0) {
        clearInterval(t);
        timeUp();
      }
    }, 60);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="app">
      {/* 화면 맨 위의 타이머 바: 가득 찬 채로 시작해서 10초 동안 줄어든다(마지막 3초쯤 붉게 바뀐다) */}
      <div className="timer-bar" aria-hidden>
        <div className="timer-fill" style={{ ["--dur" as string]: `${RATE_SECONDS}s` }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
        <span style={{ fontSize: 12, color: "var(--dim)", fontVariantNumeric: "tabular-nums" }}>
          {index + 1} / {total}
        </span>
        <span>
          <span style={{ fontSize: 12, color: "var(--dim)" }}>남은 시간 </span>
          <span style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: timeLeft <= 3 ? "var(--warn)" : "inherit" }}>
            {Math.ceil(timeLeft)}초
          </span>
        </span>
      </div>
      <div className="card">
        <div className="eyebrow">{item.category}</div>
        <div className="q-title">{item.name}</div>
        <div className="q-sub">
          이 대상을 자주 다루는 일을 한다면 어떨까요?
          <br />
          생각하지 말고 떠오른 느낌 그대로 골라주세요.
        </div>
        <div className="scale-container">
          {[7, 6, 5, 4, 3, 2, 1].map((n) => (
            <button key={n} className="scale-btn" onClick={() => onRate(n, false, nowMs() - startedAt.current)}>
              <span>{SCALE_LABELS[n]}</span>
              <span className="n">{n}점</span>
            </button>
          ))}
        </div>
      </div>
      <button className="skip-link" onClick={onBack}>
        이전으로
      </button>
    </div>
  );
}

export type TargetStep = Step;

export default function TargetPicker({
  onDone,
  busy,
  error,
  initialStep = "intro",
  initialSurvivors = [],
}: {
  onDone: (sel: TargetSelection) => void;
  busy: boolean;
  error: string;
  // 개발용 미리보기(/dev)에서 특정 단계로 바로 열 때만 쓴다
  initialStep?: Step;
  initialSurvivors?: Target[];
}) {
  const [step, setStep] = useState<Step>(initialStep);
  const [idx, setIdx] = useState(0);
  const [practice, setPractice] = useState<number | null>(null);
  const [survivors, setSurvivors] = useState<Target[]>(initialSurvivors);
  const [initialCount, setInitialCount] = useState(initialSurvivors.length);

  const scores = useRef<Record<number, number>>({});
  const timedOut = useRef<Record<number, boolean>>({});
  const answerMs = useRef<Record<number, number>>({});
  const runStart = useRef(0);

  function rate(score: number, isTimeout: boolean, ms: number) {
    const item = TARGET_LIST[idx];
    scores.current[item.id] = score;
    timedOut.current[item.id] = isTimeout;
    answerMs.current[item.id] = ms;
    if (idx < TARGET_LIST.length - 1) {
      setIdx(idx + 1);
      return;
    }
    let passed = TARGET_LIST.filter((t) => (scores.current[t.id] ?? 0) >= 5);
    if (passed.length === 0) passed = [...TARGET_LIST];
    setInitialCount(passed.length);
    setSurvivors(passed);
    setStep("eliminate");
  }

  function begin() {
    runStart.current = nowMs();
    setIdx(0);
    setStep("rating");
  }

  function finish() {
    onDone({
      survivors,
      scores: scores.current,
      timedOut: timedOut.current,
      answerMs: answerMs.current,
      passedCount: initialCount,
      eliminatedCount: initialCount - survivors.length,
      totalMs: nowMs() - runStart.current,
    });
  }

  if (step === "intro") {
    return (
      <div className="app fade-in">
        <div className="intro-hero">
          <div className="intro-title">경험을 떠올리기 전에 어떤 대상에 끌리는지 먼저 조사할게요.</div>
          <div className="q-sub" style={{ marginTop: 0 }}>
            당신은 엄청난 부자라고 생각해보세요. 돈이 더 이상 문제가 안될 때, 다음 대상을 다루는 일을 하게 되면 어떨지 골라주세요.
          </div>
          <div className="q-note" style={{ marginTop: 10 }}>
            대상마다 10초 안에 고르면 돼요. 먼저 한 번 연습해볼게요.
          </div>
        </div>
        <div className="card" style={{ marginTop: 22 }}>
          <div className="practice-tag">연습 · 결과에 반영되지 않음</div>
          <div className="q-title">역사</div>
          <div className="q-sub">한 번 눌러서 감을 잡아보세요</div>
          <div className="scale-container">
            {[7, 6, 5, 4, 3, 2, 1].map((n) => (
              <button key={n} className={`scale-btn${practice === n ? " picked" : ""}`} onClick={() => setPractice(n)}>
                <span>{SCALE_LABELS[n]}</span>
                <span className="n">{n}점</span>
              </button>
            ))}
          </div>
        </div>
        <div style={{ height: 16 }} />
        <button className="btn-primary" onClick={begin}>
          시작하기
        </button>
      </div>
    );
  }

  if (step === "rating") {
    return (
      <RatingCard
        key={idx}
        item={TARGET_LIST[idx]}
        index={idx}
        total={TARGET_LIST.length}
        onRate={rate}
        onBack={() => (idx === 0 ? setStep("intro") : setIdx(idx - 1))}
      />
    );
  }

  if (step === "eliminate") {
    const remaining = survivors.length;
    const percent = Math.max(0, Math.min(100, (remaining / initialCount) * 100));
    return (
      <div className="app">
        <div className="topline">
          <div className="track">
            <div className="fill" style={{ width: `${percent}%` }} />
          </div>
          <div className="meta">
            {remaining} / {initialCount}
          </div>
        </div>
        <div className="q-title">
          그나마 덜 끌리는 것을
          <br />
          지워주세요
        </div>
        <div className="q-sub">
          {TARGET_COUNT}개 이하가 되면 멈춰도 되지만
          <br />
          확실히 더 끌리는 게 있다면 계속 지워도 됩니다.
        </div>
        <div className="chip-grid">
          {survivors.map((t) => (
            <button
              key={t.id}
              className="chip"
              onClick={() => remaining > 1 && setSurvivors(survivors.filter((x) => x.id !== t.id))}
            >
              <span>{t.name}</span>
              <span className="x">✕</span>
            </button>
          ))}
        </div>
        {remaining <= TARGET_COUNT && (
          <>
            <div style={{ height: 14 }} />
            <button className="btn-primary" onClick={() => setStep("candidates")}>
              결과 확인하기 ({remaining}개 남음)
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="app fade-in">
      <div className="q-title">
        이 안에서 이야기를
        <br />
        들어볼게요
      </div>
      <div className="q-sub">골라주신 대상들이에요. 이 중 하나와 관련해서 기억나는 경험을 여쭤볼게요.</div>
      <div className="result-list">
        {survivors.map((t) => (
          <div key={t.id} className="result-item">
            <span className="name">{t.name}</span>
          </div>
        ))}
      </div>
      <div style={{ height: 16 }} />
      <button className="btn-primary" onClick={finish} disabled={busy}>
        {busy ? "준비 중…" : "시작할게요"}
      </button>
      <button className="skip-link" onClick={() => setStep("eliminate")}>
        다시 고르기
      </button>
      {error && <div className="error-text">{error}</div>}
    </div>
  );
}
