"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./LandingFrame.module.css";

// 랜딩 후반부: 관점 전환("우리는 새로운 질문을 합니다") → 코어·가치관·대상 → 공식 → 시작.
// 스크롤 진행도에 따라 요소가 나타났다 사라진다. 나타나는 시점은 요소의 data-w="시작,끝[,사라짐 시작,사라짐 끝]"(0~1),
// data-floor는 사라진 뒤 남길 옅기다.
// 분위기: 검은 밤하늘(은하수 사진을 어둡게 깔아 둠) → 공식 장면에서 아래부터 밝아지며 흰 배경으로.

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ease = (n: number) => {
  const t = clamp(n);
  return t * t * (3 - 2 * t);
};
const inAt = (p: number, a: number, b: number) => ease((p - a) / (b - a));
const mix = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);

// 세 원(코어·가치관·대상). 배치는 삼각형이고, 서로 겹치는 자리가 "세 가지가 만날 때"다.
const CIRCLES = [
  { key: "core", label: "코어", cx: 160, cy: 196, data: "0.03,0.13", from: [0, 90] },
  { key: "values", label: "가치관", cx: 110, cy: 112, data: "0.2,0.32", from: [-80, -40] },
  { key: "object", label: "대상", cx: 210, cy: 112, data: "0.58,0.7", from: [80, -40] },
] as const;

// 배경이 검을 때(frame)와 흴 때(formula)의 원 색
const PALETTE = {
  frame: {
    core: { fill: "rgba(216,189,133,.16)", stroke: "#d8bd85" },
    values: { fill: "rgba(255,255,255,.05)", stroke: "rgba(255,255,255,.75)" },
    object: { fill: "rgba(216,189,133,.08)", stroke: "rgba(216,189,133,.85)" },
  },
  formula: {
    core: { fill: "rgba(184,150,90,.20)", stroke: "#b8965a" },
    values: { fill: "rgba(30,27,46,.07)", stroke: "#1e1b2e" },
    object: { fill: "rgba(184,150,90,.10)", stroke: "#b8965a" },
  },
} as const;

// "코어는 혼자 작동하지 않습니다" 장면: 밤하늘 사진(1400×935) 속 실제 밝은 별 세 개에 이름표를 달고, 문장이 나올 때마다 선으로 잇는다.
// 사진 위치와 같은 방식(slice)으로 맞춰서 화면 비율이 달라도 선이 별에 붙어 있다.
const ANCHOR = {
  core: { xy: [552, 734], label: "코어", dx: 0, dy: -28, at: [0.03, 0.08] },
  values: { xy: [712, 776], label: "가치관", dx: 0, dy: 46, at: [0.16, 0.24] },
  object: { xy: [842, 706], label: "대상", dx: 0, dy: -28, at: [0.46, 0.54] },
} as const;
// 굵은 선(코어→가치관→대상)과 옅은 선(주변 별을 이은 별자리 꼬리)
const LINES: { a: [number, number]; b: [number, number]; at: [number, number]; dim?: boolean }[] = [
  { a: [552, 734], b: [712, 776], at: [0.16, 0.26] },
  { a: [712, 776], b: [842, 706], at: [0.5, 0.58] },
  { a: [552, 734], b: [526, 792], at: [0.06, 0.11], dim: true },
  { a: [712, 776], b: [748, 848], at: [0.24, 0.3], dim: true },
  { a: [842, 706], b: [880, 706], at: [0.52, 0.58], dim: true },
  { a: [880, 706], b: [916, 738], at: [0.54, 0.6], dim: true },
];
const MINOR: { xy: [number, number]; at: number }[] = [
  { xy: [526, 792], at: 0.09 },
  { xy: [748, 848], at: 0.28 },
  { xy: [880, 706], at: 0.54 },
  { xy: [916, 738], at: 0.56 },
];

function Constellation() {
  return (
    <svg className={styles.starmap} viewBox="0 0 1400 935" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {LINES.map((l, i) => (
        <path
          key={i}
          className={`${styles.seg} ${l.dim ? styles.segDim : ""}`}
          pathLength={1}
          d={`M${l.a[0]} ${l.a[1]} L${l.b[0]} ${l.b[1]}`}
          data-draw={l.at.join(",")}
        />
      ))}
      {MINOR.map((m, i) => (
        <circle key={`g${i}`} className={styles.glow} cx={m.xy[0]} cy={m.xy[1]} r={9} data-draw={`${m.at},${m.at + 0.04}`} />
      ))}
      {MINOR.map((m, i) => (
        <circle key={i} className={styles.dot} cx={m.xy[0]} cy={m.xy[1]} r={3.2} data-draw={`${m.at},${m.at + 0.04}`} />
      ))}
      {(Object.keys(ANCHOR) as (keyof typeof ANCHOR)[]).map((k) => {
        const a = ANCHOR[k];
        return (
          <g key={k}>
            <circle className={styles.halo} cx={a.xy[0]} cy={a.xy[1]} r={15} data-draw={`${a.at[0]},${a.at[1]}`} />
            <circle className={styles.glow} cx={a.xy[0]} cy={a.xy[1]} r={13} data-draw={`${a.at[0]},${a.at[1]}`} />
            <circle className={styles.dot} cx={a.xy[0]} cy={a.xy[1]} r={5.5} data-draw={`${a.at[0]},${a.at[1]}`} />
            <text className={styles.tag} x={a.xy[0] + a.dx} y={a.xy[1] + a.dy} data-w={`${a.at[0] + 0.02},${a.at[1] + 0.06}`}>
              {a.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Venn({ mode }: { mode: "frame" | "formula" }) {
  return (
    <svg className={mode === "frame" ? styles.venn : styles.vennBg} viewBox="0 0 320 300" aria-hidden="true">
      {CIRCLES.map((c) => (
        <g key={c.key} className={styles.circle} {...(mode === "frame" ? { "data-w": c.data } : { "data-circle": c.key })}>
          <circle cx={c.cx} cy={c.cy} r={84} fill={PALETTE[mode][c.key].fill} stroke={PALETTE[mode][c.key].stroke} strokeWidth={1.2} />
          {mode === "frame" && (
            <text
              className={styles.vlabel}
              x={c.key === "values" ? c.cx - 16 : c.key === "object" ? c.cx + 16 : c.cx}
              y={c.cy + (c.key === "core" ? 30 : -2)}
            >
              {c.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

export default function LandingFrame({ children, footer }: { children?: ReactNode; footer?: ReactNode }) {
  const turnRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLElement>(null);
  const formulaRef = useRef<HTMLElement>(null);
  const claimRef = useRef<HTMLElement>(null);

  useEffect(() => {
    for (const src of ["/landing-story/night-sky.jpg", "/landing-story/night-sky-2.jpg"]) {
      const img = new Image();
      img.src = src;
      img.decode?.().catch(() => {});
    }
    const scenes = [turnRef.current, frameRef.current, formulaRef.current, claimRef.current];
    if (scenes.some((s) => !s)) return;
    const [turn, frame, formula, claim] = scenes as HTMLElement[];
    let raf = 0;

    const reveal = (scene: HTMLElement, p: number) => {
      scene.querySelectorAll<HTMLElement | SVGElement>("[data-w]").forEach((el) => {
        const [a, b, c, d] = el.dataset.w!.split(",").map(Number);
        const enter = inAt(p, a, b);
        const floor = Number(el.dataset.floor ?? 0);
        const out = c === undefined ? 1 : 1 - inAt(p, c, d);
        el.style.setProperty("--o", String(enter * (floor + (1 - floor) * out)));
        el.style.setProperty("--y", `${(1 - enter) * 18}px`);
      });
    };

    const update = () => {
      raf = 0;
      const vh = innerHeight;
      // 화면 위치는 전부 먼저 읽는다. 값을 쓰는 중간에 읽으면 그때마다 화면 배치를 다시 계산해서 스크롤이 걸린다.
      const tr = turn.getBoundingClientRect();
      const fr = frame.getBoundingClientRect();
      const mr = formula.getBoundingClientRect();
      const cr = claim.getBoundingClientRect();
      const th = turn.offsetHeight;
      const fh = frame.offsetHeight;
      const mh = formula.offsetHeight;
      const ch = claim.offsetHeight;
      // 화면에서 멀리 떨어진 장면은 계산하지 않는다
      const near = (r: DOMRect) => r.bottom > -vh && r.top < vh * 2;

      // 1) 검은 하늘에 은하수 사진이 아주 어둡게 박혀 있고, 그 위에 글이 나온다
      if (near(tr)) {
        const raw = -tr.top / Math.max(1, th - vh);
        const pt = clamp(raw);
        // enter가 1이면 이 장면이 맨 위에 자리 잡은 순간. 압박 문구가 사라지는 동안 이미 같은 자리에서 준비된다
        const enter = (vh - tr.top) / vh;
        turn.style.setProperty("--sky-o", String(inAt(enter, 0.93, 1.15) * 0.48));
        // 장면이 끝나갈 때 통째로 흐려지며, 아래에 이미 자리 잡은 다음 장면이 드러난다
        turn.style.setProperty("--out", String(1 - inAt(raw, 0.84, 0.98)));
        reveal(turn, pt);
        const head = turn.querySelector<HTMLElement>("[data-first]");
        if (head) {
          const o = Math.max(Number(head.style.getPropertyValue("--o")), inAt(enter, 0.95, 1.4));
          head.style.setProperty("--o", String(o));
          head.style.setProperty("--y", `${(1 - o) * 12}px`);
          head.style.setProperty("--blur", `${(1 - o) * 14}px`);
        }
      }
      // 2) 코어·가치관·대상: 별이 하나씩 이어진다
      if (near(fr)) {
        const pfr = clamp(-fr.top / Math.max(1, fh - vh));
        const fe = (vh - fr.top) / vh;
        frame.style.setProperty("--sky-in", String(inAt(fe, 0.96, 1.25)));
        reveal(frame, pfr);
        const fhead = frame.querySelector<HTMLElement>("[data-first]");
        if (fhead) {
          const fo = Math.max(Number(fhead.style.getPropertyValue("--o")), inAt(fe, 0.99, 1.3));
          fhead.style.setProperty("--o", String(fo));
          fhead.style.setProperty("--y", `${(1 - fo) * 28}px`);
        }
        frame.querySelectorAll<SVGElement>("[data-draw]").forEach((el) => {
          const [a, b] = el.dataset.draw!.split(",").map(Number);
          el.style.setProperty("--d", String(inAt(pfr, a, b)));
        });
      }
      // 3) 공식: 아래에서부터 밝아지며 흰 배경으로. 세 단어와 세 원이 한 곳으로 모인다
      if (near(mr)) {
        const pf = clamp(-mr.top / Math.max(1, mh - vh));
        formula.style.setProperty("--in", String(inAt(vh * 0.4 - mr.top, 0, vh * 0.4)));
        formula.style.setProperty("--k", String(1 - inAt(pf, 0, 0.34)));
        const t = inAt(pf, 0.07, 0.62);
        formula.querySelectorAll<HTMLElement>("[data-word]").forEach((w, i) => {
          const from = [
            [-24, 0],
            [0, -16],
            [24, 0],
          ][i];
          w.style.setProperty("--o", String(inAt(pf, 0.06 + i * 0.055, 0.22 + i * 0.055)));
          w.style.setProperty("--dx", `${from[0] * (1 - t)}vw`);
          w.style.setProperty("--dy", `${from[1] * (1 - t)}svh`);
        });
        formula.querySelectorAll<SVGElement>("[data-circle]").forEach((g, i) => {
          const c = CIRCLES[i];
          g.style.setProperty("--o", String(inAt(pf, 0.0, 0.22)));
          g.style.setProperty("--dx", `${c.from[0] * 1.6 * (1 - t)}px`);
          g.style.setProperty("--dy", `${c.from[1] * 1.6 * (1 - t)}px`);
        });
        formula.querySelectorAll<HTMLElement>("[data-times]").forEach((el) => el.style.setProperty("--o", String(inAt(pf, 0.56, 0.7))));
        // 배경이 절반쯤 밝아지는 순간에 글자색을 바꿔서 회색 위 회색 글씨가 되지 않게 한다
        const flip = inAt(pf, 0.095, 0.106);
        formula.style.setProperty("--word", `rgb(${mix(247, 30, flip)},${mix(245, 27, flip)},${mix(240, 46, flip)})`);
        formula.style.setProperty("--wordsub", `rgb(${mix(207, 60, flip)},${mix(203, 58, flip)},${mix(196, 85, flip)})`);
        reveal(formula, pf);
        // 장면이 끝날 때 글자와 원이 흐려지며 사라진다. 아래에는 다음 슬라이드가 이미 같은 자리에 깔려 있다
        formula.style.setProperty("--fade", String(1 - inAt(pf, 0.9, 1)));
        // 끝에서는 공식 장면의 흰 바탕을 걷어, 아래에 이미 깔려 있는 다음 슬라이드가 드러나게 한다
        formula.style.setProperty("--bgA", pf >= 1 ? "0" : "1");
      }
      // 4) 이 방향이 취업 시장에서도 통한다는 설득 슬라이드: 같은 줄의 점들 가운데 하나가 줄 밖으로 나온다
      if (near(cr)) {
        const pc = clamp(-cr.top / Math.max(1, ch - vh));
        reveal(claim, pc);
        claim.style.setProperty("--rise", String(inAt(pc, 0.54, 0.66)));
        // 끝에서는 슬라이드 전체가 흐려지며, 아래에 이미 자리 잡은 시작 화면이 드러난다
        claim.style.setProperty("--cout", String(1 - inAt(pc, 0.82, 0.9)));
        claim.style.setProperty("--out", String(1 - inAt(pc, 0.9, 0.97)));
        claim.querySelectorAll<HTMLElement>("[data-dot]").forEach((d, i) => d.style.setProperty("--o", String(inAt(pc, 0.17 + i * 0.01, 0.25 + i * 0.01))));
      }
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", schedule);
    return () => {
      removeEventListener("scroll", schedule);
      removeEventListener("resize", schedule);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className={styles.root}>
      <section ref={turnRef} className={`${styles.scene} ${styles.turn}`} aria-label="이제는 새로운 방식으로 봐야 합니다">
        <div className={styles.stage}>
          <div className={styles.sky} aria-hidden="true">
            <div className={styles.skyShade} />
          </div>
          <div className={styles.col}>
            <h2 className={`${styles.big} ${styles.reveal}`} data-w="0.02,0.1" data-first>
              이제는 새로운 방식으로
              <br />
              봐야 합니다.
            </h2>
            <p className={`${styles.lead} ${styles.reveal}`} data-w="0.12,0.22,0.3,0.38" data-floor="0.3">
              특별히 잘하는 일이나 오래 꿈꿔온 일을 쫓지 않습니다.
            </p>
            <p className={`${styles.lead} ${styles.right} ${styles.reveal}`} data-w="0.27,0.37,0.5,0.58" data-floor="0.3">
              현재 유망한 직업이나 분야를 무작정 고르지 않습니다.
            </p>
            <p className={`${styles.lead} ${styles.reveal}`} data-w="0.44,0.54,0.66,0.74" data-floor="0.3">
              대신 사소한 일상의 경험에서, <b>무엇을 했는지</b> 묻습니다.
            </p>
            <p className={`${styles.lead} ${styles.right} ${styles.reveal}`} data-w="0.66,0.82">
              그 장면들에 드러나는 당신만의 행동 방식을 우리는 <span className={styles.markBig}>코어</span>라고 부릅니다.
            </p>
          </div>
        </div>
      </section>

      <section ref={frameRef} className={`${styles.scene} ${styles.frame}`} aria-label="코어와 가치관, 대상">
        <div className={styles.stage}>
          <div className={`${styles.sky} ${styles.skyB}`} aria-hidden="true">
            <div className={styles.skyShade} />
          </div>
          <div className={styles.col}>
            <h2 className={`${styles.big} ${styles.reveal}`} data-w="0.02,0.1" data-first>
              코어는 혼자
              <br />
              작동하지 않습니다.
            </h2>
            <p className={`${styles.lead} ${styles.reveal}`} data-w="0.14,0.26,0.44,0.52" data-floor="0.3">
              무엇이 중요하고 무엇이 답답한지가 <span className={styles.mark}>가치관</span>에 드러납니다.
            </p>
            <p className={`${styles.lead} ${styles.reveal}`} data-w="0.44,0.56">
              그 가치관 속에서 당신의 코어로 다루는 것을 <span className={styles.mark}>대상</span>이라고 합니다.
            </p>
          </div>
          <Constellation />
        </div>
      </section>

      <section ref={formulaRef} className={`${styles.scene} ${styles.formula}`} aria-label="가치관 × 코어 × 대상">
        <div className={styles.stage}>
          <Venn mode="formula" />
          <div className={styles.dawn} aria-hidden="true" />
          <div className={styles.formulaWrap}>
            <div className={styles.formulaRow} aria-label="가치관 곱하기 코어 곱하기 대상">
              <span className={styles.word} data-word>
                가치관
              </span>
              <span className={styles.times} data-times aria-hidden="true">
                ×
              </span>
              <span className={styles.word} data-word>
                코어
              </span>
              <span className={styles.times} data-times aria-hidden="true">
                ×
              </span>
              <span className={styles.word} data-word>
                대상
              </span>
            </div>
            <p className={styles.formulaSub} data-w="0.7,0.84">
              <span>세 가지가 만날 때, 어떻게 살아가야</span>
              <span>할지에 대한 방향이 정해집니다.</span>
            </p>
          </div>
        </div>
      </section>

      <section ref={claimRef} className={`${styles.scene} ${styles.claim}`} aria-label="나를 아는 사람의 방향">
        <div className={styles.stage}>
          <div className={styles.claimCol}>
            <p className={`${styles.claimBig} ${styles.reveal}`} data-w="0.04,0.11,0.33,0.4" data-floor="0.5">
              남들이 하는 직업, 유망하다는 분야에 더 이상 나를 맞추지 마세요.
            </p>
            <div className={styles.dots} aria-hidden="true">
              {Array.from({ length: 9 }, (_, i) => (
                <span key={i} className={`${styles.dot2} ${i === 4 ? styles.me : ""}`} data-dot>
                  {i === 4 && <em>나</em>}
                </span>
              ))}
            </div>
            <p className={`${styles.claimMid} ${styles.reveal}`} data-w="0.24,0.32,0.5,0.57" data-floor="0.5">
              무턱대고 그 줄에 나를 세우면, 그중 한 명이 될 뿐입니다.
            </p>
            <p className={`${styles.claimEnd} ${styles.reveal}`} data-w="0.55,0.66">
              <span>나를 제대로 알고 방향을 정한 사람만이,</span>
              <span>
                <b>진짜 경쟁력</b>을 갖습니다.
              </span>
            </p>
          </div>
        </div>
      </section>

      <section className={styles.cta} id="start" aria-label="시작">
        <div className={styles.ctaStage}>
          <div className={styles.ctaMain}>
            <h2 className={styles.ctaTitle}>당신이 누구인지 찾으세요.</h2>
            <p className={styles.ctaSub}>그 시작은 일상의 작은 경험입니다.</p>
            <div className={styles.extra}>{children}</div>
          </div>
          <div className={styles.footSlot}>{footer}</div>
        </div>
      </section>
    </div>
  );
}
