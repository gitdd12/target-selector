"use client";

import { useEffect, useRef } from "react";
import { useVhPx } from "./useVhPx";
import styles from "./LandingV2Claim.module.css";

// 원래 랜딩(LandingFrame)의 "줄 세우기" 씬을 옮겨 온 것.
// 같은 줄에 놓인 점 아홉 개 중 가운데 "나"만 스크롤에 따라 줄 밖으로 올라온다.
// 마지막 줄은 원래 랜딩의 "나를 제대로 알고..." 문장 대신, 공식 씬의 원 세 개 + 가치관×코어×대상을
// 작게 가져와 이 씬을 맺는다(공식 씬은 바로 아래에서 다시 크게 펼쳐진다).

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ease = (n: number) => {
  const t = clamp(n);
  return t * t * (3 - 2 * t);
};
const inAt = (p: number, a: number, b: number) => ease((p - a) / (b - a));

function reveal(el: HTMLElement | null, w: [number, number] | [number, number, number, number], floor: number, p: number) {
  if (!el) return;
  const enter = inAt(p, w[0], w[1]);
  const out = w.length === 4 ? 1 - inAt(p, w[2], w[3]) : 1;
  const o = enter * (floor + (1 - floor) * out);
  el.style.setProperty("--o", String(o));
  el.style.setProperty("--y", `${(1 - enter) * 18}px`);
}

export default function LandingV2Claim() {
  useVhPx();
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLElement>(null);
  const bigRef = useRef<HTMLParagraphElement>(null);
  const midRef = useRef<HTMLParagraphElement>(null);
  const formulaRef = useRef<HTMLDivElement>(null);
  const dotRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = track.getBoundingClientRect();
      const vh = window.innerHeight;
      const pc = clamp(-rect.top / Math.max(1, rect.height - vh));
      reveal(bigRef.current, [0.04, 0.11, 0.33, 0.4], 0.5, pc);
      reveal(midRef.current, [0.24, 0.32, 0.5, 0.57], 0.5, pc);
      reveal(formulaRef.current, [0.55, 0.66], 0, pc);
      stageRef.current?.style.setProperty("--rise", String(inAt(pc, 0.54, 0.66)));
      dotRefs.current.forEach((d, i) => {
        d?.style.setProperty("--o", String(inAt(pc, 0.17 + i * 0.01, 0.25 + i * 0.01)));
      });
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
    <div ref={trackRef} className={styles.track} style={{ height: `calc(var(--vh-px, 100vh) * 2.75)` }}>
      <section ref={stageRef} className={styles.stage} aria-label="나를 아는 사람의 방향">
        <div className={styles.claimCol}>
          <p ref={bigRef} className={styles.claimBig}>
            남들이 하는 직업, 유망하다는 분야에 더 이상 나를 맞추지 마세요
          </p>
          <div className={styles.dots} aria-hidden="true">
            {Array.from({ length: 9 }, (_, i) => (
              <span
                key={i}
                ref={(el) => {
                  dotRefs.current[i] = el;
                }}
                className={`${styles.dot2} ${i === 4 ? styles.me : ""}`}
              >
                {i === 4 && <em>나</em>}
              </span>
            ))}
          </div>
          <p ref={midRef} className={styles.claimMid}>
            무턱대고 그 줄에 나를 세우면, 그중 한 명이 될 뿐입니다.
          </p>
          <div ref={formulaRef} className={styles.claimFormula}>
            <div className={styles.claimVennWrap}>
              <svg className={styles.claimVenn} viewBox="0 0 320 300" aria-hidden="true">
                <circle className={styles.claimVennCircle} cx="160" cy="196" r="84" />
                <circle className={styles.claimVennCircle} cx="110" cy="112" r="84" />
                <circle className={styles.claimVennCircle} cx="210" cy="112" r="84" />
              </svg>
              <p className={styles.claimFormulaRow}>
                가치관 <span className={styles.claimTimes}>×</span> 코어 <span className={styles.claimTimes}>×</span> 대상
              </p>
            </div>
            <p className={styles.claimFormulaCaption}>세 가지가 만날 때, 삶의 방향이 정해집니다.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
