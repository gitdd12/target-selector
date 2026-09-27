import Link from "next/link";
import LandingV2Beat from "./LandingV2Beat";
import LandingV2Era from "./LandingV2Era";
import LandingV2Motion from "./LandingV2Motion";
import LandingV2Pressure from "./LandingV2Pressure";
import styles from "./LandingV2.module.css";

// 새 랜딩(/v2). 카피와 근거는 docs/랜딩_기획_2_구조와카피.md.
// 2~4, 6~7, 9번 섹션의 문구는 원래 랜딩(LandingStory, LandingFrame)의 원문 그대로다.
// 2번(LandingV2Era)과 3번(LandingV2Pressure)은 원래 랜딩의 스크롤 연동 연출도 그대로 가져왔다.

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
      <section className={styles.hero} aria-label="첫 화면">
        <div className={styles.heroMain}>
          <h1 className={styles.heroTitle}>Who am I</h1>
          <p className={styles.heroSub}>일상의 경험에서 당신의 진로까지.</p>
        </div>
        <p className={styles.heroScroll}>Scroll ↓</p>
      </section>

      <LandingV2Era />

      <LandingV2Pressure />

      <LandingV2Beat
        ariaLabel="이제는 새로운 방식으로 봐야 합니다"
        theme="dark"
        grain
        fadeBottomToWhite
        title={
          <>
            이제는 새로운 방식으로
            <br />
            봐야 합니다.
          </>
        }
        titleClassName={styles.beatBig}
        lines={[
          {
            key: "no1",
            w: [0.12, 0.22, 0.3, 0.38],
            className: styles.beatLead,
            node: "특별히 잘하는 일이나 오래 꿈꿔온 일을 쫓지 않습니다.",
          },
          {
            key: "no2",
            w: [0.27, 0.37, 0.5, 0.58],
            right: true,
            className: styles.beatLead,
            node: "현재 유망한 직업이나 분야를 무작정 고르지 않습니다.",
          },
          {
            key: "yes",
            w: [0.44, 0.54, 0.66, 0.74],
            className: styles.beatLead,
            node: (
              <>
                대신 사소한 일상의 경험에서, <b>무엇을 했는지</b> 묻습니다.
              </>
            ),
          },
          {
            key: "define",
            w: [0.66, 0.82],
            right: true,
            className: styles.beatDefine,
            node: (
              <>
                그 장면들에 드러나는 당신만의 행동 방식을 우리는 <b className={styles.beatMark}>코어</b>라고 부릅니다.
              </>
            ),
          },
        ]}
      />

      <LandingV2Beat
        ariaLabel="코어와 가치관, 대상, 그리고 공식"
        theme="light"
        trackVh={2.7}
        title={
          <>
            코어는 혼자
            <br />
            작동하지 않습니다.
          </>
        }
        titleClassName={styles.beatBig}
        lines={[
          {
            key: "values",
            w: [0.1, 0.18, 0.32, 0.4],
            className: styles.beatLead,
            node: (
              <>
                무엇이 중요하고 무엇이 답답한지가 <b className={styles.mark}>가치관</b>에 드러납니다.
              </>
            ),
          },
          {
            key: "object",
            w: [0.26, 0.34, 0.48, 0.56],
            className: styles.beatLead,
            node: (
              <>
                그 가치관 속에서 당신의 코어로 다루는 것을 <b className={styles.mark}>대상</b>이라고 합니다.
              </>
            ),
          },
          {
            key: "formula",
            w: [0.52, 0.64],
            className: styles.beatFormula,
            node: (
              <>
                가치관 <span className={styles.beatTimes}>×</span> 코어 <span className={styles.beatTimes}>×</span> 대상
              </>
            ),
          },
        ]}
      />

      <section className={styles.section} aria-label="코어는 여러 직업에서 나타날 수 있습니다">
        <p className={styles.eyebrow}>예시</p>
        <h2 className={styles.h2} data-reveal>
          발견한 코어는
          <br />
          여러 직업에서 나타날 수 있습니다.
        </h2>
        <p className={styles.lead} data-reveal>
          직업은 단순한 행동의 묶음입니다. 전혀 달라 보이는 두 개의 직업이더라도 내 코어와 그 직무가 일치할 수 있습니다.
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
        <p className={styles.source}>업무 문장: O*NET 31.0, 미국 노동부 직업 데이터</p>
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
