import Link from "next/link";
import LandingV2Motion from "./LandingV2Motion";
import styles from "./LandingV2.module.css";

// 새 랜딩(/v2). 카피와 근거는 docs/랜딩_기획_2_구조와카피.md.
// 2~4, 6~7, 9번 섹션의 문구는 원래 랜딩(LandingStory, LandingFrame)의 원문 그대로다.

// 첫 화면 그림: 직업 하나를 실제 업무 문장으로 풀어 보인다(O*NET 31.0, 영상 편집자 27-4032.00의 핵심 업무).
// 굵게 한 줄은 5번 예시에서 다시 나오는 업무다.
const BUNDLE = [
  { t: "촬영본을 장면별로 먼저 훑어본다" },
  { t: "원본 영상을 정리해 하나로 잇는다", key: true },
  { t: "장면마다 가장 좋은 컷을 골라 이야기로 엮는다" },
  { t: "이어 붙인 영상을 다시 보며 고칠 곳을 찾는다" },
];

// 2번: 시대별 사진(원래 랜딩에서 쓰던 흑백 사진)
const ERAS = [
  { src: "/landing-story/horse-1880s.jpg", label: "1880년대", alt: "말이 끄는 전차와 마부" },
  { src: "/landing-story/factory-19c.jpg", label: "19세기 말", alt: "선반 기계가 늘어선 공장" },
  { src: "/landing-story/modern-work-new.jpg", label: "지금", alt: "노트북 자판 위의 손" },
];

// 3번: 진로를 둘러싼 말들(원문)
const PRESSURE = [
  "좋아하는 일을 찾아야 돼",
  "잘하는 일을 찾아야지",
  "돈 많이 벌어야 돼",
  "특별히 좋아하는 일 없는데..",
  "이 분야로 가야 취업 잘 된대",
  "내가 남들보다 잘하는게 뭐지..?",
];

// 5번 예시: 샘플 세션을 지금 공식으로 다시 돌렸을 때 실제로 나온 두 직업과 근거 업무.
const BRANCHES = [
  { object: "글을 다루면", job: "테크니컬 라이터", task: "다른 작가나 내부 직원이 준비한 자료를 편집하거나, 형식을 통일하거나, 고친다" },
  { object: "영상을 다루면", job: "영상 편집자", task: "촬영한 원본 영상을 정리해 하나로 매끄럽게 잇는다" },
];

// 8번: 실제 결과지 화면(/dev/result에 샘플 세션을 넣어 그린 것)을 잘라 쓴다. 결과지 화면이 바뀌면 같이 다시 찍는다.
const SHOTS = [
  {
    src: "/landing/result-summary.png",
    w: 780,
    h: 840,
    title: "세 가지를 한눈에",
    text: "맨 위에 당신의 가치관, 코어, 대상을 한 줄씩 정리합니다.",
    alt: "결과지 맨 위. 가치관 '애매함 없이 분명하게 가는 일', 코어 '앞뒤가 막힘없이 이어질 때까지 조각의 순서를 맞춰요', 고른 대상 '글, 문서'.",
  },
  {
    src: "/landing/result-core.png",
    w: 780,
    h: 806,
    title: "당신이 한 말이 근거가 됩니다",
    text: "근거가 두 가지 이상일 때만 코어로 적고, 신뢰도와 함께 당신이 한 말을 그대로 보여 드립니다.",
    alt: "결과지의 코어 칸. 신뢰도 상, 그리고 스스로 보탠 부분·만족·되풀이 세 근거마다 인터뷰에서 한 말이 인용되어 있다.",
  },
  {
    src: "/landing/result-jobs.png",
    w: 780,
    h: 768,
    title: "직업은 실제 업무로 보여 드립니다",
    text: "직업마다 당신의 코어와 겹치는 업무를 한 줄로 적고, 일치도를 함께 보여 드립니다.",
    alt: "결과지의 직업 목록. 테크니컬 라이터 일치도 59%, 시인·작사가·창작 작가 일치도 51%, 각 직업 아래에 내 코어와 겹치는 업무 한 줄.",
  },
];

export default function LandingV2() {
  return (
    <div className={styles.root} data-landing-v2>
      <header className={styles.bar}>
        <span className={styles.logo}>코어 찾기</span>
        <span className={styles.beta}>베타</span>
      </header>

      <section className={styles.hero} aria-label="첫 화면">
        <div className={styles.heroCopy}>
          <h1 className={styles.heroTitle}>
            직업은
            <br />
            행동의 묶음입니다.
          </h1>
          <p className={styles.heroSub}>
            같은 일을 해도 사람마다 하는 방식이 다릅니다.
            <br />
            일상에서 되풀이되는 당신의 방식, 코어를 인터뷰로 찾고 그 방식이 쓰이는 직업을 보여 드립니다.
          </p>
          <Link href="/#start" className={styles.button}>
            코어 찾기 시작
          </Link>
        </div>
        <figure className={styles.bundle} aria-label="영상 편집자의 업무 예시">
          <figcaption className={styles.bundleName}>
            예를 들어, <strong>영상 편집자</strong>는 이런 행동들의 묶음입니다
          </figcaption>
          <ul className={styles.bundleList}>
            {BUNDLE.map((b) => (
              <li key={b.t} className={b.key ? styles.bundleKey : undefined}>
                {b.t}
              </li>
            ))}
          </ul>
          <p className={styles.source}>업무 문장: O*NET 31.0</p>
        </figure>
      </section>

      <section className={styles.section} aria-label="직업의 이름은 시대와 함께 바뀝니다">
        <h2 className={styles.h2} data-reveal>
          직업의 이름은
          <br />
          시대와 함께 바뀝니다.
        </h2>
        <ul className={styles.eras} data-reveal>
          {ERAS.map((e) => (
            <li key={e.src}>
              {/* eslint-disable-next-line @next/next/no-img-element -- 원래 랜딩의 정적 사진 */}
              <img src={e.src} alt={e.alt} loading="lazy" className={styles.eraImg} />
              <span className={styles.eraLabel}>{e.label}</span>
            </li>
          ))}
        </ul>
        <p className={styles.lead} data-reveal>
          단순한 직업명만으로 내가 앞으로 어떻게 살아가야 할지 알 수 없습니다.
        </p>
        <p className={styles.turnLine} data-reveal>
          그런데 막상 진로를 정하려 하면, 우리는 다시 유망한 직업과 분야의 이름부터 찾게 됩니다.
        </p>
      </section>

      <section className={styles.pressure} aria-label="진로를 둘러싼 말들">
        <ul className={styles.pressureList}>
          {PRESSURE.map((t) => (
            <li key={t} data-reveal>
              {t}
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section} aria-label="이제는 새로운 방식으로 봐야 합니다">
        <h2 className={styles.h2} data-reveal>
          이제는 새로운 방식으로
          <br />
          봐야 합니다.
        </h2>
        <div className={styles.turnList}>
          <p className={styles.no} data-reveal>
            특별히 잘하는 일이나 오래 꿈꿔온 일을 쫓지 않습니다.
          </p>
          <p className={styles.no} data-reveal>
            현재 유망한 직업이나 분야를 무작정 고르지 않습니다.
          </p>
          <p className={styles.yes} data-reveal>
            대신 사소한 일상의 경험에서, <b>무엇을 했는지</b> 묻습니다.
          </p>
          <p className={styles.define} data-reveal>
            그 장면들에 드러나는 당신만의 행동 방식을 우리는 <b className={styles.mark}>코어</b>라고 부릅니다.
          </p>
        </div>
      </section>

      <section className={styles.section} aria-label="코어 하나, 다른 직업">
        <p className={styles.eyebrow}>예시</p>
        <h2 className={styles.h2}>
          같은 코어가
          <br />
          다른 직업에서도 쓰입니다.
        </h2>
        <p className={styles.lead}>
          예를 들어, 친구 자소서를 봐 줄 때
          <br />
          내용은 그대로 두고 문단 순서와 문장 연결만 바꿨다면,
        </p>
        <div className={styles.tree} data-reveal>
          <div className={styles.core}>
            <span className={styles.coreLabel}>코어</span>
            <p className={styles.coreText}>내용은 새로 쓰지 않고, 흐름이 이어지도록 순서와 연결을 맞춘다</p>
          </div>
          <ul className={styles.branches}>
            {BRANCHES.map((b) => (
              <li key={b.job} className={styles.branch}>
                <span className={styles.branchObject}>{b.object}</span>
                <strong className={styles.branchJob}>{b.job}</strong>
                <q className={styles.branchTask}>{b.task}</q>
              </li>
            ))}
          </ul>
        </div>
        <p className={styles.close} data-reveal>직업의 이름은 달라도, 그 한가운데에서는 같은 행동이 쓰입니다.</p>
        <p className={styles.source}>업무 문장: O*NET 31.0, 미국 노동부 직업 데이터</p>
      </section>

      <section className={styles.section} aria-label="코어와 가치관, 대상">
        <h2 className={styles.h2} data-reveal>
          코어는 혼자
          <br />
          작동하지 않습니다.
        </h2>
        <p className={styles.lead} data-reveal>
          무엇이 중요하고 무엇이 답답한지가 <b className={styles.mark}>가치관</b>에 드러납니다.
        </p>
        <p className={styles.lead} data-reveal>
          그 가치관 속에서 당신의 코어로 다루는 것을 <b className={styles.mark}>대상</b>이라고 합니다.
        </p>
      </section>

      <section className={styles.formula} aria-label="가치관 × 코어 × 대상">
        <div className={styles.formulaRow} data-reveal>
          <span className={styles.slot}>가치관</span>
          <span className={styles.times} aria-hidden="true">×</span>
          <span className={`${styles.slot} ${styles.slotDark}`}>코어</span>
          <span className={styles.times} aria-hidden="true">×</span>
          <span className={styles.slot}>대상</span>
        </div>
        <p className={styles.formulaSub} data-reveal>
          세 가지가 만날 때, 어떻게 살아가야 할지에 대한 방향이 정해집니다.
        </p>
      </section>

      <section className={styles.section} aria-label="결과지 미리보기">
        <p className={styles.eyebrow}>결과지</p>
        <h2 className={styles.h2}>
          결과지는
          <br />
          이렇게 나옵니다.
        </h2>
        <ol className={styles.shots}>
          {SHOTS.map((s, i) => (
            <li key={s.src} className={styles.shot} data-reveal>
              <div className={styles.shotCopy}>
                <span className={styles.shotNo}>{i + 1}</span>
                <h3 className={styles.shotTitle}>{s.title}</h3>
                <p className={styles.shotText}>{s.text}</p>
              </div>
              <div className={styles.frame}>
                {/* eslint-disable-next-line @next/next/no-img-element -- 정적 캡처 이미지라 최적화가 필요 없다 */}
                <img src={s.src} width={s.w / 2} height={s.h / 2} alt={s.alt} className={styles.img} />
              </div>
            </li>
          ))}
        </ol>
        <p className={styles.note}>결과지는 인터뷰가 끝난 뒤 3일 안에 이메일로 보내 드립니다.</p>
      </section>

      <section className={styles.claim} aria-label="나를 아는 사람의 방향" data-rise>
        <div className={styles.claimInner}>
          <p className={styles.claimBig}>남들이 하는 직업, 유망하다는 분야에 더 이상 나를 맞추지 마세요.</p>
          <div className={styles.dots} aria-hidden="true">
            {Array.from({ length: 9 }, (_, i) => (
              <span key={i} className={`${styles.dot} ${i === 4 ? styles.me : ""}`}>
                {i === 4 && <em>나</em>}
              </span>
            ))}
          </div>
          <p className={styles.claimMid}>무턱대고 그 줄에 나를 세우면, 그중 한 명이 될 뿐입니다.</p>
          <p className={styles.claimEnd}>
            나를 제대로 알고 방향을 정한 사람만이,
            <br />
            <b>진짜 경쟁력</b>을 갖습니다.
          </p>
        </div>
      </section>

      <section className={styles.cta} aria-label="시작">
        <h2 className={styles.h2}>당신의 코어를 찾으세요.</h2>
        <p className={styles.lead}>그 시작은 일상의 작은 경험입니다.</p>
        <Link href="/#start" className={styles.button}>
          시작하기
        </Link>
        <p className={styles.legal}>
          직업·업무 정보는 미국 노동부 O*NET 31.0(CC BY 4.0)을 바탕으로 합니다. 미국 노동부가 이 서비스를 승인한 것은 아닙니다.
        </p>
      </section>
      <LandingV2Motion />
    </div>
  );
}
