"use client";

import { useEffect, useRef } from "react";
import styles from "./LandingStory.module.css";

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ease = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };
const inAt = (p: number, a: number, b: number) => ease((p - a) / (b - a));
const outAt = (p: number, a: number, b: number) => 1 - inAt(p, a, b);
const windowAt = (p: number, a: number, b: number, c: number, d: number) => inAt(p, a, b) * outAt(p, c, d);

export default function LandingStory() {
  const openingRef = useRef<HTMLElement>(null);
  const historyRef = useRef<HTMLElement>(null);
  const pressureRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const opening = openingRef.current;
    const history = historyRef.current;
    const pressure = pressureRef.current;
    if (!opening || !history || !pressure) return;
    // 큰 사진은 미리 불러와 풀어 둔다(처음 보이는 순간에 멈칫하지 않게)
    for (const src of ["/landing-story/horse-1880s.jpg", "/landing-story/factory-19c.jpg", "/landing-story/modern-work-new.jpg"]) {
      const img = new Image();
      img.src = src;
      img.decode?.().catch(() => {});
    }
    const lines = [...pressure.querySelectorAll<HTMLElement>(`.${styles.pressureLine}`)];
    const progress = (scene: HTMLElement) => clamp(-scene.getBoundingClientRect().top / Math.max(1, scene.offsetHeight - innerHeight));
    let frame = 0;

    const update = () => {
      frame = 0;
      const o = progress(opening), p = progress(pressure);
      // 압박 장면이 올라오기 시작한 뒤 화면 0.8개 분량 지난 시점에 이 장면의 진행도가 1이 된다(뒤쪽 화면 1.2개 분량은 진행도에 넣지 않음)
      const h = clamp(-history.getBoundingClientRect().top / Math.max(1, history.offsetHeight - 1.2 * innerHeight));
      const pressureEntry = clamp((innerHeight - pressure.getBoundingClientRect().top) / innerHeight);
      opening.style.setProperty("--dark", String(inAt(o, .1, .9)));
      opening.style.setProperty("--stage-opacity", String(outAt(o, .9, 1)));
      opening.style.setProperty("--opening-opacity", String(outAt(o, .06, .62)));
      opening.style.setProperty("--opening-y", `${-26 * o}px`);
      history.style.setProperty("--horse", String(inAt(h, .03, .1) * outAt(h, .23, .36)));
      history.style.setProperty("--factory", String(windowAt(h, .23, .36, .38, .56)));
      history.style.setProperty("--modern", String(inAt(h, .46, .64)));
      const reveals: [string, number][] = [
        ["line1", inAt(h, .06, .14) * outAt(h, .4, .52)],
        ["line2", windowAt(h, .13, .24, .42, .54)],
        ["line3", windowAt(h, .52, .66, .78, .88)],
      ];
      reveals.forEach(([name, value]) => {
        history.style.setProperty(`--${name}`, String(value));
        history.style.setProperty(`--${name}-y`, `${(1 - value) * 20}px`);
      });
      history.style.setProperty("--hdark", String(inAt(h, .7, .97)));
      history.style.setProperty("--photo-y", `${(h - .5) * 100}px`);
      // 끝에서는 검정이 걷혀서 아래 장면이 그 자리에서 보이기 시작한다
      pressure.style.setProperty("--solid", String(Math.min(clamp(p * 30), 1 - inAt(p, .93, 1))));
      const starts = [.03, .14, .26, .38, .50, .62];
      // 아래로 내려가면서 문구들이 모두 흐려지며 사라진다
      const gone = outAt(p, .84, .955);
      lines.forEach((line, i) => {
        const enter = i === 0
          ? Math.max(inAt(pressureEntry, .6, .85), inAt(p, .02, .15))
          : inAt(p, starts[i], starts[i] + .1);
        const dim = i === lines.length - 1 ? 1 : outAt(p, starts[i] + .13, starts[i] + .2);
        line.style.setProperty("--opacity", String(enter * (.24 + .76 * dim) * gone));
        line.style.setProperty("--entry", String(1 - enter));
      });
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", schedule);
    return () => {
      removeEventListener("scroll", schedule);
      removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return <div className={styles.root}>
    <section ref={openingRef} className={styles.opening} aria-label="첫 장면">
      <div className={styles.openingStage}>
        <div className={styles.openingCopy}>
          <div className={styles.openingTitle}>
            <h1>Who am I?</h1>
            <p className={styles.openingSub}>어떻게 살아야 하는가</p>
          </div>
        </div>
        <div className={styles.openingBottom} aria-hidden="true"><span>Core Finder</span><span>Scroll to discover ↓</span></div>
        <div className={styles.curtain} aria-hidden="true" />
      </div>
    </section>
    <section ref={historyRef} className={styles.history} aria-label="직업명에서 한 걸음 들어가기">
      <div className={styles.historyStage}>
        <div className={styles.historyVisuals} aria-hidden="true">
          <div className={`${styles.photo} ${styles.photoHorse}`} />
          <div className={`${styles.photo} ${styles.photoFactory}`} />
          <div className={`${styles.photo} ${styles.photoModern}`} />
          <div className={styles.historyShade} />
          <div className={styles.historyDark} />
        </div>
        <div className={styles.historyCopy}>
          <h2>직업의 이름은<br />시대와 함께 바뀝니다.</h2>
          <p className={styles.historyLead}>단순한 직업명만으로 내가 앞으로 어떻게 살아가야 할지 알 수 없습니다.</p>
        </div>
        <p className={styles.historyTurn}>그런데 막상 진로를 정하려 하면, 우리는 다시 유망한 직업과 분야의 이름부터 찾게 됩니다.</p>
      </div>
    </section>
    <section ref={pressureRef} className={styles.pressure} aria-label="진로를 둘러싼 말들">
      <div className={styles.pressureStage}>
        <p className={styles.pressureLine}>좋아하는 일을 찾아야 돼</p>
        <p className={styles.pressureLine}>잘하는 일을 찾아야지</p>
        <p className={styles.pressureLine}>돈 많이 벌어야 돼</p>
        <p className={styles.pressureLine}>특별히 좋아하는 일 없는데..</p>
        <p className={styles.pressureLine}>이 분야로 가야 취업 잘 된대</p>
        <p className={styles.pressureLine}>내가 남들보다 잘하는게 뭐지..?</p>
      </div>
    </section>
  </div>;
}
