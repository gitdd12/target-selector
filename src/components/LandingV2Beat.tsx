"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useVhPx } from "./useVhPx";
import styles from "./LandingV2Beat.module.css";

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ease = (n: number) => {
  const t = clamp(n);
  return t * t * (3 - 2 * t);
};
const inAt = (p: number, a: number, b: number) => ease((p - a) / (b - a));

export interface BeatLine {
  key: string;
  node: ReactNode;
  className: string;
  /** [등장 시작, 등장 끝] 또는 [등장 시작, 등장 끝, 흐려지기 시작, 흐려지기 끝](0~1, 이 씬 안에서의 스크롤 진행도). */
  w: [number, number] | [number, number, number, number];
  /** 흐려진 뒤 남길 옅기(0~1). 다음 줄이 나온 뒤에도 완전히 사라지지 않고 회색으로 남는다. */
  floor?: number;
  right?: boolean;
}

/**
 * "한 걸음씩 짚어 읽는" 장면 하나(원래 랜딩의 LandingFrame turn/frame 장면과 같은 방식).
 * 화면이 고정된 채, 줄이 하나씩 나타나고(좌우 번갈아) 다음 줄이 나오면 방금 읽은 줄은 옅은 회색으로 남는다.
 * 마지막 줄만 끝까지 선명하게 남는다(w에 흐려지는 구간을 주지 않으면 됨).
 */
export default function LandingV2Beat({
  ariaLabel,
  title,
  titleClassName,
  lines,
  theme,
  trackVh = 2.4,
  grain,
  fadeBottomToWhite,
}: {
  ariaLabel: string;
  title: ReactNode;
  titleClassName: string;
  lines: BeatLine[];
  theme: "dark" | "light";
  trackVh?: number;
  grain?: boolean;
  fadeBottomToWhite?: boolean;
}) {
  useVhPx();
  const trackRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const lineRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = track.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = clamp(-rect.top / Math.max(1, rect.height - vh));
      // 화면에 다가오는 정도(0~1): 씬이 아직 완전히 고정되기 전부터 제목이 조금씩 드러나기 시작한다
      const approach = clamp((vh - rect.top) / vh);
      if (titleRef.current) {
        const o = Math.max(inAt(p, 0.02, 0.1), inAt(approach, 0.95, 1.3));
        titleRef.current.style.setProperty("--o", String(o));
        titleRef.current.style.setProperty("--y", `${(1 - o) * 14}px`);
        titleRef.current.style.setProperty("--blur", `${(1 - o) * 12}px`);
      }
      if (fadeBottomToWhite) track.style.setProperty("--exit", String(inAt(p, 0.88, 1)));
      lineRefs.current.forEach((el, i) => {
        if (!el) return;
        const w = lines[i].w;
        const enter = inAt(p, w[0], w[1]);
        const floor = lines[i].floor ?? 0;
        const out = w.length === 4 ? 1 - inAt(p, w[2], w[3]) : 1;
        const o = enter * (floor + (1 - floor) * out);
        el.style.setProperty("--o", String(o));
        el.style.setProperty("--y", `${(1 - enter) * 18}px`);
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
  }, [lines, fadeBottomToWhite]);

  return (
    <div
      ref={trackRef}
      className={styles.track}
      style={{ height: `calc(var(--vh-px, 100vh) * ${trackVh})` }}
      data-theme={theme}
    >
      <section className={styles.stage} aria-label={ariaLabel} data-theme={theme}>
        {grain && <div className={styles.grain} aria-hidden="true" />}
        {fadeBottomToWhite && <div className={styles.exitCurtain} aria-hidden="true" />}
        <div className={styles.col}>
          <h2 ref={titleRef} className={`${styles.reveal} ${titleClassName}`}>
            {title}
          </h2>
          {lines.map((l, i) => (
            <p
              key={l.key}
              ref={(el) => {
                lineRefs.current[i] = el;
              }}
              className={`${styles.reveal} ${l.className} ${l.right ? styles.right : ""}`}
            >
              {l.node}
            </p>
          ))}
        </div>
      </section>
    </div>
  );
}
