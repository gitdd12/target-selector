"use client";

import { useEffect, useRef } from "react";
import { useVhPx } from "./useVhPx";
import styles from "./LandingV2Pressure.module.css";

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ease = (n: number) => {
  const t = clamp(n);
  return t * t * (3 - 2 * t);
};
const inAt = (p: number, a: number, b: number) => ease((p - a) / (b - a));
const outAt = (p: number, a: number, b: number) => 1 - inAt(p, a, b);

// 문구·위치·기울기·글자 크기는 원래 랜딩(LandingStory)의 pressure 장면 값 그대로.
// 원래는 어두운 배경 위 흰 글자였지만, 여기서는 브랜드 기준(흰 바탕 + 잉크색)에 맞춰 색만 바꿨다.
const LINES: { text: string; top: string; left?: string; right?: string; rot: number; size: string; weight?: number }[] = [
  { text: "좋아하는 일을 찾아야 돼", top: "9%", left: "5%", rot: -4, size: "clamp(20px,5.4vw,32px)" },
  { text: "잘하는 일을 찾아야지", top: "21%", right: "4%", rot: 3, size: "clamp(23px,6.2vw,36px)" },
  { text: "돈 많이 벌어야 돼", top: "34%", left: "18%", rot: -2, size: "clamp(24px,6.8vw,38px)", weight: 700 },
  { text: "특별히 좋아하는 일 없는데..", top: "47%", right: "9%", rot: 2.5, size: "clamp(19px,4.9vw,28px)" },
  { text: "이 분야로 가야 취업 잘 된대", top: "60%", left: "5%", rot: -3.5, size: "clamp(20px,5.4vw,31px)" },
  { text: "내가 남들보다 잘하는게 뭐지..?", top: "74%", right: "5%", rot: 4, size: "clamp(20px,5.2vw,32px)" },
];
const STARTS = [0.04, 0.18, 0.32, 0.46, 0.6, 0.74];

/**
 * 씬 3 "진로를 둘러싼 말들": 화면이 고정된 채 흔한 생각들이 이곳저곳에서 하나씩 떠올랐다 사라진다.
 * 원래 랜딩과 같은 방식(스크롤 진행도로 각 문장의 등장·퇴장을 계산)이며, 화면 높이는 useVhPx로 통일한다.
 */
export default function LandingV2Pressure() {
  useVhPx();
  const trackRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLParagraphElement | null)[]>([]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = track.getBoundingClientRect();
      const p = clamp(-rect.top / Math.max(1, rect.height - window.innerHeight));
      lineRefs.current.forEach((el, i) => {
        if (!el) return;
        const start = STARTS[i];
        const enter = inAt(p, start, start + 0.12);
        const exit = i === LINES.length - 1 ? 1 : outAt(p, start + 0.22, start + 0.3);
        el.style.setProperty("--opacity", String(enter * exit));
        el.style.setProperty("--entry", String(1 - enter));
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
    <div ref={trackRef} className={styles.track}>
      <section className={styles.stage} aria-label="진로를 둘러싼 말들">
        {LINES.map((l, i) => (
          <p
            key={l.text}
            ref={(el) => {
              lineRefs.current[i] = el;
            }}
            className={styles.line}
            style={{ top: l.top, left: l.left, right: l.right, fontSize: l.size, fontWeight: l.weight, "--rot": `${l.rot}deg` } as React.CSSProperties}
          >
            {l.text}
          </p>
        ))}
      </section>
    </div>
  );
}
