"use client";

import { useEffect, useRef } from "react";
import { useVhPx } from "./useVhPx";
import styles from "./LandingV2Formula.module.css";

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ease = (n: number) => {
  const t = clamp(n);
  return t * t * (3 - 2 * t);
};
const inAt = (p: number, a: number, b: number) => ease((p - a) / (b - a));

// 세 원(코어·가치관·대상)이 각자 자리에서 날아와 겹친다. 배치는 삼각형이고,
// 서로 겹치는 자리가 "세 가지가 만날 때"다. 원래 랜딩(LandingFrame Venn)과 같은 자리, 같은 방식이되
// 금색 대신 브랜드 흑백 톤을 쓴다.
const CIRCLES = [
  { key: "core", cx: 160, cy: 196, from: [0, 90], fill: "rgba(13,12,20,.10)", stroke: "rgba(13,12,20,.6)", label: "코어" },
  { key: "values", cx: 110, cy: 112, from: [-90, -46], fill: "rgba(13,12,20,.05)", stroke: "rgba(13,12,20,.32)", label: "가치관" },
  { key: "object", cx: 210, cy: 112, from: [90, -46], fill: "rgba(13,12,20,.05)", stroke: "rgba(13,12,20,.32)", label: "대상" },
] as const;
const WORDS = ["가치관", "코어", "대상"] as const;
const WORD_FROM = [
  [-26, 0],
  [0, -18],
  [26, 0],
] as const;

/** 씬 7 "가치관 × 코어 × 대상": 원래 랜딩처럼 세 원이 날아와 겹치는 동안 글자도 함께 자리를 잡는다. */
export default function LandingV2Formula() {
  useVhPx();
  const trackRef = useRef<HTMLDivElement>(null);
  const circleRefs = useRef<(SVGGElement | null)[]>([]);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const timesRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const subRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = track.getBoundingClientRect();
      const p = clamp(-rect.top / Math.max(1, rect.height - window.innerHeight));
      const settle = inAt(p, 0.08, 0.6); // 0=흩어짐, 1=제자리
      circleRefs.current.forEach((g, i) => {
        if (!g) return;
        const o = inAt(p, 0, 0.24);
        const [fx, fy] = CIRCLES[i].from;
        g.style.setProperty("--o", String(o));
        g.style.setProperty("--dx", `${fx * (1 - settle)}px`);
        g.style.setProperty("--dy", `${fy * (1 - settle)}px`);
      });
      wordRefs.current.forEach((w, i) => {
        if (!w) return;
        w.style.setProperty("--o", String(inAt(p, 0.08 + i * 0.06, 0.24 + i * 0.06)));
        w.style.setProperty("--dx", `${WORD_FROM[i][0] * (1 - settle)}vw`);
        w.style.setProperty("--dy", `${WORD_FROM[i][1] * (1 - settle)}svh`);
      });
      for (const el of timesRefs.current) el?.style.setProperty("--o", String(inAt(p, 0.56, 0.7)));
      subRef.current?.style.setProperty("--o", String(inAt(p, 0.62, 0.78)));
      subRef.current?.style.setProperty("--y", `${(1 - inAt(p, 0.62, 0.78)) * 16}px`);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", schedule);
    return () => {
      removeEventListener("scroll", schedule);
      removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={trackRef} className={styles.track}>
      <section className={styles.stage} aria-label="가치관 × 코어 × 대상">
        <svg className={styles.venn} viewBox="0 0 320 300" aria-hidden="true">
          {CIRCLES.map((c, i) => (
            <g
              key={c.key}
              ref={(el) => {
                circleRefs.current[i] = el;
              }}
              className={styles.circle}
            >
              <circle cx={c.cx} cy={c.cy} r={84} fill={c.fill} stroke={c.stroke} strokeWidth={1.2} />
            </g>
          ))}
        </svg>
        <div className={styles.wrap}>
          <div className={styles.row} aria-label="가치관 곱하기 코어 곱하기 대상">
            {WORDS.map((w, i) => (
              <span key={w} className={styles.wordGroup}>
                <span
                  ref={(el) => {
                    wordRefs.current[i] = el;
                  }}
                  className={`${styles.word} ${w === "코어" ? styles.wordDark : ""}`}
                >
                  {w}
                </span>
                {i < 2 && (
                  <span
                    ref={(el) => {
                      timesRefs.current[i] = el;
                    }}
                    className={styles.times}
                    aria-hidden="true"
                  >
                    ×
                  </span>
                )}
              </span>
            ))}
          </div>
          <p ref={subRef} className={styles.sub}>
            세 가지가 만날 때, 어떻게 살아가야 할지에 대한 방향이 정해집니다.
          </p>
        </div>
      </section>
    </div>
  );
}
