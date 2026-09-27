"use client";

import { useEffect, useRef } from "react";
import { useVhPx } from "./useVhPx";
import styles from "./LandingV2Formula.module.css";

// 원래 랜딩(LandingFrame)의 "가치관 × 코어 × 대상" 공식 씬을 그대로 옮겨 온 것.
// 세 원(코어·가치관·대상)이 삼각형으로 모이고, 검정 배경이 아래에서부터 걷히며 흰 배경이 드러난다.

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ease = (n: number) => {
  const t = clamp(n);
  return t * t * (3 - 2 * t);
};
const inAt = (p: number, a: number, b: number) => ease((p - a) / (b - a));
const mix = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);

const CIRCLES = [
  { key: "core", cx: 160, cy: 196, from: [0, 90] },
  { key: "values", cx: 110, cy: 112, from: [-80, -40] },
  { key: "object", cx: 210, cy: 112, from: [80, -40] },
] as const;

const PALETTE = {
  core: { fill: "rgba(184,150,90,.20)", stroke: "#b8965a" },
  values: { fill: "rgba(30,27,46,.07)", stroke: "#1e1b2e" },
  object: { fill: "rgba(184,150,90,.10)", stroke: "#b8965a" },
} as const;

export default function LandingV2Formula() {
  useVhPx();
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLElement>(null);
  const vennRef = useRef<SVGSVGElement>(null);
  const circleRefs = useRef<(SVGGElement | null)[]>([]);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const timesRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const curtainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    const stage = stageRef.current;
    if (!track || !stage) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = track.getBoundingClientRect();
      const vh = window.innerHeight;
      const pf = clamp(-rect.top / Math.max(1, rect.height - vh));
      stage.style.setProperty("--in", String(inAt(vh * 0.4 - rect.top, 0, vh * 0.4)));
      // 이전 씬(줄 세우기)이 흰 배경으로 끝나므로, 이 씬 시작의 검정을 순간적으로 끊지 않고 짧게 걷어낸다
      curtainRef.current?.style.setProperty("--enter", String(1 - inAt(pf, 0, 0.06)));
      stage.style.setProperty("--k", String(1 - inAt(pf, 0, 0.34)));
      const t = inAt(pf, 0.07, 0.62);
      wordRefs.current.forEach((w, i) => {
        if (!w) return;
        const from = [
          [-24, 0],
          [0, -16],
          [24, 0],
        ][i];
        w.style.setProperty("--o", String(inAt(pf, 0.06 + i * 0.055, 0.22 + i * 0.055)));
        w.style.setProperty("--dx", `${from[0] * (1 - t)}vw`);
        w.style.setProperty("--dy", `${from[1] * (1 - t)}svh`);
      });
      circleRefs.current.forEach((g, i) => {
        if (!g) return;
        const c = CIRCLES[i];
        g.style.setProperty("--o", String(inAt(pf, 0, 0.22)));
        g.style.setProperty("--dx", `${c.from[0] * 1.6 * (1 - t)}px`);
        g.style.setProperty("--dy", `${c.from[1] * 1.6 * (1 - t)}px`);
      });
      timesRefs.current.forEach((el) => el && el.style.setProperty("--o", String(inAt(pf, 0.56, 0.7))));
      const flip = inAt(pf, 0.095, 0.106);
      stage.style.setProperty("--word", `rgb(${mix(247, 30, flip)},${mix(245, 27, flip)},${mix(240, 46, flip)})`);
      stage.style.setProperty("--wordsub", `rgb(${mix(207, 60, flip)},${mix(203, 58, flip)},${mix(196, 85, flip)})`);
      const fade = 1 - inAt(pf, 0.9, 1);
      wrapRef.current?.style.setProperty("--fade", String(fade));
      vennRef.current?.style.setProperty("--fade", String(fade));
      if (subRef.current) {
        const enter = inAt(pf, 0.7, 0.84);
        subRef.current.style.setProperty("--o", String(enter));
        subRef.current.style.setProperty("--y", `${(1 - enter) * 18}px`);
      }
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
    <div ref={trackRef} className={styles.track} style={{ height: `calc(var(--vh-px, 100vh) * 2.4)` }}>
      <section ref={stageRef} className={styles.stage} aria-label="가치관 × 코어 × 대상">
        <svg ref={vennRef} className={styles.vennBg} viewBox="0 0 320 300" aria-hidden="true">
          {CIRCLES.map((c, i) => (
            <g
              key={c.key}
              ref={(el) => {
                circleRefs.current[i] = el;
              }}
              className={styles.circle}
            >
              <circle cx={c.cx} cy={c.cy} r={84} fill={PALETTE[c.key].fill} stroke={PALETTE[c.key].stroke} strokeWidth={1.2} />
            </g>
          ))}
        </svg>
        <div className={styles.dawn} aria-hidden="true" />
        <div ref={curtainRef} className={styles.enterCurtain} aria-hidden="true" />
        <div ref={wrapRef} className={styles.formulaWrap}>
          <div className={styles.formulaRow} aria-label="가치관 곱하기 코어 곱하기 대상">
            <span
              ref={(el) => {
                wordRefs.current[0] = el;
              }}
              className={styles.word}
            >
              가치관
            </span>
            <span
              ref={(el) => {
                timesRefs.current[0] = el;
              }}
              className={styles.times}
              aria-hidden="true"
            >
              ×
            </span>
            <span
              ref={(el) => {
                wordRefs.current[1] = el;
              }}
              className={styles.word}
            >
              코어
            </span>
            <span
              ref={(el) => {
                timesRefs.current[1] = el;
              }}
              className={styles.times}
              aria-hidden="true"
            >
              ×
            </span>
            <span
              ref={(el) => {
                wordRefs.current[2] = el;
              }}
              className={styles.word}
            >
              대상
            </span>
          </div>
          <p ref={subRef} className={styles.formulaSub}>
            <span>세 가지가 만날 때, 어떻게 살아가야</span>
            <span>할지에 대한 방향이 정해집니다.</span>
          </p>
        </div>
      </section>
    </div>
  );
}
