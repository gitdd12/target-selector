"use client";

import { useEffect, useRef } from "react";
import { useVhPx } from "./useVhPx";
import styles from "./LandingV2Era.module.css";

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ease = (n: number) => {
  const t = clamp(n);
  return t * t * (3 - 2 * t);
};
const inAt = (p: number, a: number, b: number) => ease((p - a) / (b - a));
const outAt = (p: number, a: number, b: number) => 1 - inAt(p, a, b);
const windowAt = (p: number, a: number, b: number, c: number, d: number) => inAt(p, a, b) * outAt(p, c, d);

const PHOTOS = ["/landing-story/horse-1880s.jpg", "/landing-story/factory-19c.jpg", "/landing-story/modern-work-new.jpg"];

/**
 * 씬 2 "직업의 이름은 시대와 함께 바뀝니다": 스크롤에 따라 사진 세 장(1880년대 → 공장 → 지금)이
 * 화면에 고정된 채 교차되며 바뀐다. 원래 랜딩(LandingStory)의 history 장면과 같은 방식이되,
 * 화면 높이는 vh 단위가 아니라 useVhPx로 통일해 화면 크기·기기가 달라도 진행도가 어긋나지 않는다.
 */
export default function LandingV2Era() {
  useVhPx();
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    for (const src of PHOTOS) {
      const img = new Image();
      img.src = src;
    }
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = track.getBoundingClientRect();
      const p = clamp(-rect.top / Math.max(1, rect.height - window.innerHeight));
      track.style.setProperty("--horse", String(inAt(p, 0.04, 0.14) * outAt(p, 0.3, 0.44)));
      track.style.setProperty("--factory", String(windowAt(p, 0.3, 0.44, 0.48, 0.66)));
      track.style.setProperty("--modern", String(inAt(p, 0.56, 0.74)));
      track.style.setProperty("--photo-y", `${(p - 0.5) * 90}px`);
      // 앞: 흰 커튼이 걷히며 검정으로 이어진다(첫 화면과 이어지는 자리). 뒤: 사진이 다시 순수 검정으로 덮인다(다음 씬과 이어지는 자리).
      track.style.setProperty("--enter", String(outAt(p, 0, 0.1)));
      track.style.setProperty("--exit", String(inAt(p, 0.9, 1)));
      const reveals: [string, number][] = [
        ["line1", inAt(p, 0.06, 0.16) * outAt(p, 0.5, 0.62)],
        ["line2", windowAt(p, 0.15, 0.27, 0.52, 0.64)],
        ["line3", windowAt(p, 0.6, 0.74, 0.86, 0.96)],
      ];
      for (const [name, v] of reveals) {
        track.style.setProperty(`--${name}`, String(v));
        track.style.setProperty(`--${name}-y`, `${(1 - v) * 18}px`);
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
    <div ref={trackRef} className={styles.track}>
      <section className={styles.stage} aria-label="직업의 이름은 시대와 함께 바뀝니다">
        <div className={styles.visuals} aria-hidden="true">
          <div className={`${styles.photo} ${styles.horse}`} />
          <div className={`${styles.photo} ${styles.factory}`} />
          <div className={`${styles.photo} ${styles.modern}`} />
          <div className={styles.shade} />
        </div>
        <div className={styles.enterCurtain} aria-hidden="true" />
        <div className={styles.exitCurtain} aria-hidden="true" />
        <div className={styles.copy}>
          <h2 className={styles.title}>
            직업의 이름은
            <br />
            시대와 함께 바뀝니다.
          </h2>
          <p className={styles.lead}>단순한 직업명만으로 내가 앞으로 어떻게 살아가야 할지 알 수 없습니다.</p>
        </div>
        <p className={styles.turn}>그런데 막상 진로를 정하려 하면, 우리는 다시 유망한 직업과 분야의 이름부터 찾게 됩니다.</p>
      </section>
    </div>
  );
}
