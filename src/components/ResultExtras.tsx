import { CANDIDATE_TEXT, EXPLORE_COMMON_WHY, EXPLORE_GROUPS, FIXED_ACTIONS, OBSERVE } from "@/lib/frame";
import { candidateSeen, shownCandidates } from "@/lib/explore";
import { legacyCommonWhy } from "@/lib/result";
import { SITUATION_SHORT, type Report, type Session } from "@/lib/types";
import styles from "./ResultView.module.css";

type Item = Report["explore"]["items"][number];

// 코어 후보 칸(결과지 작성 기준 v0.28): 제목 "코어 후보", 행동 문장, 장면 한 줄, 확인한 것.
// 어떤 기준이 부족한지는 보여주지 않는다(참가자가 기준에 맞춰 행동하게 되므로).
export function CandidateSection({ session }: { session: Session }) {
  const r = session.report;
  const list = r?.candidates ?? [];
  if (!list.length) return null;
  const judged = shownCandidates(session.final);
  return (
    <section className={styles.block}>
      <p className={styles.kicker}>{CANDIDATE_TEXT.title}</p>
      <p className={styles.candNote}>{CANDIDATE_TEXT.note}</p>
      <ul className={styles.candList}>
        {list.map((c, i) => {
          const seen = judged[i] ? candidateSeen(judged[i]) : [];
          return (
            <li key={c.behavior}>
              <b>{c.behavior}</b>
              <p>{c.scene}</p>
              {seen.length > 0 && (
                <small>
                  {CANDIDATE_TEXT.seen} : {seen.join(", ")}
                </small>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ItemList({ items }: { items: Item[] }) {
  return (
    <ol className={styles.doList}>
      {items.map((it) => (
        <li key={it.title}>
          {it.object && <span className={styles.doObject}>{it.object}</span>}
          <b>{it.title}</b>
          <p>{it.do}</p>
          {it.why && (
            <p className={styles.doWhy}>
              <em>이유 :</em> {it.why}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}

// 직접 해 보기. 진로 탐색 중이면 해 볼 일을 "코어 확인"과 "대상 탐색" 두 묶음으로, 묶음마다 고정된 이유를 붙인다.
// 묶음 구분이 없던 예전 세션(v0.28 전)은 공통 이유 하나로 보여준다.
export function ExploreSection({ session }: { session: Session }) {
  const r = session.report;
  if (!r) return null;
  const items = (r.explore?.items ?? []) as Item[];
  const grouped = items.some((it) => it.kind);
  return (
    <section className={styles.doSection}>
      <h2 className={styles.jobsTitle}>직접 해 보기</h2>
      {session.situation && <p className={styles.stateLine}>‘{SITUATION_SHORT[session.situation]}’으로 선택하셔서 아래와 같이 준비했어요.</p>}
      {session.situation === "exploring" ? (
        items.length ? (
          grouped ? (
            <>
              <p className={styles.pickNote}>마음에 드는 하나만 해도 돼요.</p>
              {(["확인", "탐색"] as const).map((k) => {
                const group = items.filter((it) => it.kind === k);
                if (!group.length) return null;
                return (
                  <div key={k} className={styles.doGroup}>
                    <h3 className={styles.doGroupTitle}>{EXPLORE_GROUPS[k].title}</h3>
                    <div className={styles.commonWhy}>
                      <b>이유 : </b>
                      {EXPLORE_GROUPS[k].why}
                    </div>
                    <ItemList items={group} />
                  </div>
                );
              })}
            </>
          ) : (
            <>
              <div className={styles.commonWhy}>
                <b>공통 이유 : </b>
                {legacyCommonWhy(r) || EXPLORE_COMMON_WHY}
              </div>
              <p className={styles.pickNote}>마음에 드는 하나만 해도 돼요.</p>
              <ItemList items={items} />
            </>
          )
        ) : null
      ) : session.situation ? (
        <div className={styles.doBox}>
          <p className={styles.doText}>{FIXED_ACTIONS[session.situation].todo}</p>
          <p className={styles.doWhy}>
            <em>이유 :</em> {FIXED_ACTIONS[session.situation].why}
          </p>
        </div>
      ) : null}

      <div className={styles.observeBox}>
        <p className={styles.observeLead}>{OBSERVE.lead}</p>
        <ol className={styles.observeList}>
          {OBSERVE.items.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ol>
        <p className={styles.observeClosing}>{OBSERVE.closing}</p>
      </div>
    </section>
  );
}
