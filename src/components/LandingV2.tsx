import Link from "next/link";
import LandingV2Beat from "./LandingV2Beat";
import LandingV2Claim from "./LandingV2Claim";
import LandingV2Era from "./LandingV2Era";
import LandingV2Formula from "./LandingV2Formula";
import LandingV2Motion from "./LandingV2Motion";
import styles from "./LandingV2.module.css";

// 새 랜딩(/v2). 카피와 근거는 docs/랜딩_기획_2_구조와카피.md.
// 2~4, 6~7, 9번 섹션의 문구는 원래 랜딩(LandingStory, LandingFrame)의 원문 그대로다.
// 2번(LandingV2Era)은 원래 랜딩의 스크롤 연동 연출도 그대로 가져왔다.

// 5번 예시: 서로 다른 영역(영상 편집 ↔ 배관)이지만 같은 코어("흐름이 이어지도록 순서와 연결을 맞춘다")가
// 쓰인다는 걸 극적으로 보여주려는 예시.
const BRANCHES = [
  { object: "배관을 다루면", job: "배관공", task: "도면에 따라 배관 부품과 이음쇠를 순서대로 연결해, 물이나 가스가 끊기지 않고 흐르게 한다" },
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
    text: "직업마다 당신의 코어와 겹치는 업무를 적고, 해당 직업에서 당신의 코어가 차지하는 비중을 알려드립니다.",
    alt: "결과지의 직업 목록. 직업마다 이름 옆에 코어 비중 %가 붙고, 그 아래에 내 코어와 겹치는 업무가 한 줄로 적혀 있다.",
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
            floor: 0.3,
            className: styles.beatLead,
            node: "특별히 잘하는 일이나 오래 꿈꿔온 일을 쫓지 않습니다.",
          },
          {
            key: "no2",
            w: [0.27, 0.37, 0.5, 0.58],
            floor: 0.3,
            right: true,
            className: styles.beatLead,
            node: "현재 유망한 직업이나 분야를 무작정 고르지 않습니다.",
          },
          {
            key: "core",
            w: [0.56, 0.68],
            className: styles.beatCore,
            node: (
              <>
                삶 속에서 드러나는 당신의 행동 패턴을 보고, 우리는 이걸 <b className={styles.beatMark}>코어</b>라고 부릅니다.
              </>
            ),
          },
        ]}
      />

      <section className={styles.section} aria-label="코어는 여러 직업에서 나타납니다">
        <h2 className={styles.h2} data-reveal>
          발견한 코어는
          <br />
          여러 직업에서 나타납니다.
        </h2>
        <p className={styles.lead} data-reveal>
          <b className={styles.leadEmph}>직업은 단순히 행동의 묶음일뿐입니다.</b> 전혀 달라 보이는 두 개의 직업이더라도 내 코어는 두 직업과 일치할 수 있습니다.
        </p>
        <div className={styles.tree} data-reveal>
          <div className={styles.core}>
            <span className={styles.coreLabel}>코어</span>
            <p className={styles.coreText}>흐름이 이어지도록 순서와 연결을 맞춘다</p>
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
        <p className={styles.source}>직무 정보: O*NET 31.0, 미국 노동부 직업 데이터</p>
      </section>

      <section className={styles.section} aria-label="결과지 미리보기">
        <h2 className={styles.h2}>결과지</h2>
        <ol className={styles.shots}>
          {SHOTS.map((s, i) => (
            <li key={s.src} className={styles.shot} data-reveal>
              <div className={styles.shotCopy}>
                <div className={styles.shotHead}>
                  <span className={styles.shotNo}>{i + 1}</span>
                  <h3 className={styles.shotTitle}>{s.title}</h3>
                </div>
                <p className={styles.shotText}>{s.text}</p>
              </div>
              <div className={styles.frame}>
                {/* eslint-disable-next-line @next/next/no-img-element -- 정적 캡처 이미지라 최적화가 필요 없다 */}
                <img src={s.src} width={s.w / 2} height={s.h / 2} alt={s.alt} className={styles.img} />
              </div>
            </li>
          ))}
        </ol>
      </section>

      <LandingV2Claim />

      <LandingV2Formula />

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
