"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./ResultView.module.css";

export interface PersonView {
  name: string;
  field_and_era: string;
  why_similar: string;
  scenes: { title: string; scene: string; strength: string; cost: string }[];
  at_your_scale: string;
  source_hint: string;
}

// 인물 카드 줄 + 눌렀을 때 떠오르는 카드 창(뒷배경은 흐리게, 옆으로 넘기며 장면을 본다).
// 공유는 인물 사례 글과 서비스 주소만 내보낸다(참가자 본인의 결과는 공유되지 않는다).
export default function PeopleCards({ people }: { people: PersonView[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const [active, setActive] = useState(0);
  const [toast, setToast] = useState("");
  const rail = useRef<HTMLDivElement>(null);
  const person = open !== null ? people[open] : null;

  // 창이 열려 있는 동안 뒤 화면은 스크롤되지 않게 하고, ESC로 닫는다
  useEffect(() => {
    if (open === null) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      removeEventListener("keydown", onKey);
    };
  }, [open]);

  // 가운데에서 멀수록 살짝 돌아가고 작아지고 옅어진다(옆으로 돌려 보는 느낌)
  function tilt() {
    const el = rail.current;
    if (!el) return;
    const mid = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    let bestD = Infinity;
    Array.from(el.children).forEach((child, i) => {
      const c = child as HTMLElement;
      const center = c.offsetLeft + c.offsetWidth / 2;
      const d = (center - mid) / c.offsetWidth;
      if (Math.abs(d) < bestD) {
        bestD = Math.abs(d);
        best = i;
      }
      const a = Math.min(Math.abs(d), 1);
      c.style.transform = `perspective(1100px) rotateY(${Math.max(-1, Math.min(1, d)) * -34}deg) scale(${1 - a * 0.09})`;
      c.style.opacity = String(1 - a * 0.5);
    });
    setActive(best);
  }
  useEffect(() => {
    if (open !== null) requestAnimationFrame(tilt);
  }, [open]);

  async function share(p: PersonView) {
    const url = window.location.origin;
    const body = [
      `${p.name} · ${p.field_and_era}`,
      p.why_similar,
      ...p.scenes.map((s) => `\n■ ${s.title}\n${s.scene}${s.strength ? `\n강점: ${s.strength}` : ""}${s.cost ? `\n문제점: ${s.cost}` : ""}`),
      p.source_hint ? `\n출처: ${p.source_hint}` : "",
      "\n— 코어 찾기",
    ].join("\n");
    try {
      if (navigator.share) {
        await navigator.share({ title: `${p.name}의 장면`, text: body, url });
        return;
      }
      await navigator.clipboard.writeText(`${body}\n${url}`);
      setToast("복사했어요");
      setTimeout(() => setToast(""), 1800);
    } catch {
      // 공유 창을 닫은 경우 등은 조용히 넘어간다
    }
  }

  if (!people.length) return null;
  const cardCount = person ? person.scenes.length + 2 : 0;

  return (
    <>
      <div className={styles.strip}>
        {people.map((p, i) => (
          <button
            key={p.name}
            className={styles.mini}
            onClick={() => {
              setActive(0);
              setOpen(i);
            }}
          >
            <span className={styles.mono}>{p.name.slice(0, 1)}</span>
            <p className={styles.miniName}>{p.name}</p>
            <p className={styles.miniField}>{p.field_and_era}</p>
            <p className={styles.miniWhy}>{p.why_similar}</p>
            <span className={styles.miniMore}>장면 {p.scenes.length}개 보기 →</span>
          </button>
        ))}
      </div>

      {person && (
        <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={`${person.name} 카드`}>
          <button className={styles.backdrop} aria-label="닫기" onClick={() => setOpen(null)} />
          <div className={styles.stage}>
            <button className={styles.close} aria-label="닫기" onClick={() => setOpen(null)}>
              ×
            </button>
            <div className={styles.carousel} ref={rail} onScroll={tilt}>
              <div className={`${styles.card} ${styles.cardDark}`}>
                <p className={styles.cardKicker}>닮은 방식의 사람</p>
                <span className={styles.mono} style={{ background: "#fff", color: "#0d0c14" }}>
                  {person.name.slice(0, 1)}
                </span>
                <h3 className={styles.cardTitle} style={{ marginTop: 18 }}>
                  {person.name}
                </h3>
                <p className={styles.cardKicker} style={{ margin: "6px 0 0" }}>
                  {person.field_and_era}
                </p>
                <p className={styles.cardText}>{person.why_similar}</p>
                <p className={styles.cardKicker} style={{ marginTop: "auto", paddingTop: 20 }}>
                  옆으로 넘겨 장면을 보세요 →
                </p>
              </div>
              {person.scenes.map((s, i) => (
                <div className={styles.card} key={i}>
                  <p className={styles.cardKicker}>
                    장면 {i + 1} / {person.scenes.length}
                  </p>
                  <h3 className={styles.cardTitle}>{s.title}</h3>
                  <p className={styles.cardText}>{s.scene}</p>
                  <div className={styles.tagRow}>
                    {s.strength && (
                      <div className={styles.tag}>
                        <b>강점</b>
                        {s.strength}
                      </div>
                    )}
                    {s.cost && (
                      <div className={`${styles.tag} ${styles.tagCost}`}>
                        <b>문제점</b>
                        {s.cost}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div className={`${styles.card} ${styles.cardDark}`}>
                <p className={styles.cardKicker}>출처</p>
                <p className={styles.cardText} style={{ marginTop: 0 }}>
                  {person.source_hint || "출처를 확인 중이에요."}
                </p>
                {person.at_your_scale && (
                  <>
                    <p className={styles.cardKicker} style={{ marginTop: 26 }}>
                      나의 이야기와 이어 보면
                    </p>
                    <p className={styles.cardText} style={{ marginTop: 0 }}>
                      {person.at_your_scale}
                    </p>
                  </>
                )}
              </div>
            </div>
            <div className={styles.dots} aria-hidden="true">
              {Array.from({ length: cardCount }).map((_, i) => (
                <i key={i} className={i === active ? styles.on : ""} />
              ))}
            </div>
            <div style={{ position: "relative" }}>
              <button className={styles.shareBtn} onClick={() => share(person)}>
                공유하기
              </button>
              {toast && <div className={styles.toast}>{toast}</div>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
