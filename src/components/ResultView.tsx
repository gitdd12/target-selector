import { approvedPeople, coreBehavior, getObject, getScenes, getValues, legacyCommonWhy, legacyCore, objectNoteParts, splitTarget, toLines } from "@/lib/result";
import { ENDING, EXPLORE_COMMON_WHY, FIXED_ACTIONS, OBSERVE } from "@/lib/frame";
import { SITUATION_SHORT, type Session } from "@/lib/types";
import JobLists from "./JobLists";
import PeopleCards, { type PersonView } from "./PeopleCards";
import styles from "./ResultView.module.css";

// 참가자가 받는 결과지 화면. 맨 위에 "내 것으로 채워진 공식"만 두고(틀 설명은 첫 화면에서 이미 했다),
// 그 아래에 코어(코어마다 직업 목록) → 가치관 → 닮은 사람들 → 직접 해 보기 순으로 짧은 카드로 보여준다.
// 코어는 이름이 아니라 행동 문장으로만 보여준다. 예전 세션(대상 칸·어울리는 직업·직무와 연결하면)도 그대로 보여준다.
export default function ResultView({ session, contact, preview = false }: { session: Session; contact?: string; preview?: boolean }) {
  const r = session.report;
  if (!r) return null;
  const values = getValues(r);
  const object = getObject(r);
  const hasCores = r.cores.length > 0;
  const multi = r.cores.length > 1;
  const people: PersonView[] = approvedPeople(session).map((c) => ({
    name: c.name,
    field_and_era: c.field_and_era,
    why_similar: c.why_similar ?? "",
    scenes: getScenes(c),
    at_your_scale: c.at_your_scale ?? "",
    source_hint: c.source_hint,
  }));
  const jobs = session.jobPick?.picks ?? []; // 예전 방식의 직업(v0.26까지)
  const jobLists = session.jobLists ?? [];
  const listFor = (i: number) => jobLists.find((x) => x.core === i);
  const nextQ = session.jobPick?.next_question;
  const targetNames = session.targets?.survivors.map((x) => x.name) ?? [];
  const objNote = objectNoteParts(session);

  const valuesCards: [string, string, string][] = [
    ["중요하게 여기는 것", values.important, styles.toneRead],
    ["못 견디는 것", [values.hard, values.stuck].filter(Boolean).join(" "), styles.toneCaution],
    ["코어와 만나면 살아나는 곳", values.alive, styles.toneWork],
  ];

  return (
    <main className={styles.page}>
      {preview && <div className={styles.previewBar}>미리보기 · 참가자에게는 공개 전까지 보이지 않아요</div>}
      <div className={styles.top}>
        <b>코어 찾기</b>
        <span>결과지</span>
      </div>

      {!hasCores ? (
        <section className={styles.hero}>
          <h1 className={styles.pageTitle}>당신의 결과지</h1>
          <h2 className={styles.formulaTitle}>이번에는 아직 정하지 않았어요</h2>
          <div className={styles.hold}>{r.hold_note}</div>
        </section>
      ) : (
        <>
          <section className={styles.hero}>
            <h1 className={styles.pageTitle}>당신의 결과지</h1>
            <div className={styles.slots}>
              <div className={`${styles.slot} ${styles.slotValues}`}>
                <span className={styles.slotLabel}>가치관</span>
                <span className={styles.slotValue}>{values.short || values.summary || "—"}</span>
              </div>
              <span className={styles.times}>×</span>
              <div className={`${styles.slot} ${styles.slotDark}`}>
                <span className={styles.slotLabel}>코어</span>
                {multi ? (
                  <ul className={styles.slotBullets} data-n={Math.min(r.cores.length, 3)}>
                    {r.cores.map((c, i) => (
                      <li key={i}>{coreBehavior(c)}</li>
                    ))}
                  </ul>
                ) : (
                  <div className={styles.coreSlot} data-n={1}>
                    {r.cores.map((c, i) => (
                      <span className={styles.slotValue} key={i}>
                        {coreBehavior(c)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <span className={styles.times}>×</span>
              <div className={`${styles.slot} ${styles.slotObject}`}>
                <span className={styles.slotLabel}>고른 대상</span>
                {targetNames.length > 0 ? (
                  <ul className={`${styles.targetList} ${targetNames.length > 1 ? styles.bulletSlot : ""}`} data-n={Math.min(targetNames.length, 4)}>
                    {targetNames.map((n) => {
                      const [main, sub] = splitTarget(n);
                      return (
                        <li key={n}>
                          <span>{main}</span>
                          {sub && <small>{sub}</small>}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <span className={styles.slotValue}>{object?.label || "지금은 정하지 않아요"}</span>
                )}
              </div>
            </div>
          </section>

          {!multi &&
            r.cores.map((c, i) => {
            const rel = session.reliability?.[i];
            const rows = (
              <div className={styles.rows}>
                <div className={`${styles.row} ${styles.toneFact}`}>
                  <h3>경험</h3>
                  {toLines(c.restatement).length > 1 ? (
                    <ul className={styles.lines}>
                      {toLines(c.restatement).map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>{c.restatement}</p>
                  )}
                </div>
                <div className={`${styles.row} ${styles.toneRead}`}>
                  <h3>파악한 코어</h3>
                  <p>{c.pattern}</p>
                </div>
                {legacyCore(c).bridge && (
                  <div className={`${styles.row} ${styles.toneWork}`}>
                    <h3>직무와 연결하면</h3>
                    <dl className={styles.dl}>
                      <div>
                        <dt>쓰일 수 있는 일</dt>
                        <dd>{legacyCore(c).bridge!.usable}</dd>
                      </div>
                      <div className={styles.dtUnknown}>
                        <dt>아직 모르는 것</dt>
                        <dd>{legacyCore(c).bridge!.unknown}</dd>
                      </div>
                    </dl>
                  </div>
                )}
                {c.cost_note && (
                  <div className={`${styles.row} ${styles.toneCaution}`}>
                    <h3>이 방식이 힘들어질 때</h3>
                    <p>{c.cost_note}</p>
                  </div>
                )}
              </div>
            );
            const relList =
              rel && rel.met.length > 0 ? (
                <ul className={styles.relList}>
                  {rel.met.map((m, qi) => (
                    <li key={m}>
                      {m}
                      {rel.quotes?.[qi] && <small>{"“" + rel.quotes[qi] + "”"}</small>}
                    </li>
                  ))}
                </ul>
              ) : null;
            const badge = rel && <span className={`${styles.badge} ${rel.grade === "최상" ? styles.badgeGold : rel.grade === "상" ? styles.badgeSilver : styles.badgePlain}`}>신뢰도 {rel.grade}</span>;
            // 코어가 하나면 전부 펼쳐서 보여주고, 여러 개면 제목과 신뢰도만 보이고 나머지는 접어 둔다
            return (
              <section className={styles.block} key={i}>
                <p className={styles.kicker}>코어</p>
                <h2 className={styles.coreLine}>{coreBehavior(c)}</h2>
                {rel && (
                  <div className={styles.rel}>
                    {badge}
                    {relList}
                  </div>
                )}
                {rows}
                {listFor(i) && <JobLists jobs={listFor(i)!} first />}
              </section>
            );
          })}

          {multi && (
            <section className={styles.block}>
              <p className={styles.kicker}>코어</p>
              <ol className={styles.coreList}>
                {r.cores.map((c, i) => {
                  const rel = session.reliability?.[i];
                  return (
                    <li key={i}>
                      <span className={styles.coreNo}>코어 {i + 1}</span>
                      <b>{coreBehavior(c)}</b>
                      {rel && (
                        <span className={`${styles.badge} ${rel.grade === "최상" ? styles.badgeGold : rel.grade === "상" ? styles.badgeSilver : styles.badgePlain}`}>신뢰도 {rel.grade}</span>
                      )}
                      {rel && rel.met.length > 0 && (
                        <ul className={styles.relList}>
                          {rel.met.map((m, qi) => (
                            <li key={m}>
                              {m}
                              {rel.quotes?.[qi] && <small>{"“" + rel.quotes[qi] + "”"}</small>}
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ol>
              <div className={styles.rows}>
                <div className={`${styles.row} ${styles.toneFact}`}>
                  <h3>경험</h3>
                  <ul className={styles.bul}>
                    {r.cores.map((c, i) => (
                      <li key={i}>
                        <b>코어 {i + 1}</b> {toLines(c.restatement).join(" ")}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={`${styles.row} ${styles.toneRead}`}>
                  <h3>파악한 코어</h3>
                  <ul className={styles.bul}>
                    {r.cores.map((c, i) => (
                      <li key={i}>
                        <b>코어 {i + 1}</b> {c.pattern}
                      </li>
                    ))}
                  </ul>
                </div>
                {r.cores.some((c) => legacyCore(c).bridge) && (
                  <div className={`${styles.row} ${styles.toneWork}`}>
                    <h3>직무와 연결하면</h3>
                    <ul className={styles.bul}>
                      {r.cores.map(
                        (c, i) =>
                          legacyCore(c).bridge && (
                            <li key={i}>
                              <b>코어 {i + 1}</b> {legacyCore(c).bridge!.usable} {legacyCore(c).bridge!.unknown}
                            </li>
                          ),
                      )}
                    </ul>
                  </div>
                )}
                {r.cores.some((c) => c.cost_note) && (
                  <div className={`${styles.row} ${styles.toneCaution}`}>
                    <h3>이 방식이 힘들어질 때</h3>
                    <ul className={styles.bul}>
                      {r.cores.map(
                        (c, i) =>
                          c.cost_note && (
                            <li key={i}>
                              <b>코어 {i + 1}</b> {c.cost_note}
                            </li>
                          ),
                      )}
                    </ul>
                  </div>
                )}
              </div>
              {r.cores.map(
                (c, i) =>
                  listFor(i) && (
                    <div className={styles.coreJobs} key={i}>
                      <p className={styles.coreJobsTitle}>
                        <span className={styles.coreNo}>코어 {i + 1}</span> {coreBehavior(c)}
                      </p>
                      <JobLists jobs={listFor(i)!} first={i === 0} />
                    </div>
                  ),
              )}
            </section>
          )}

          {valuesCards.some(([, t]) => t) && (
            <section className={styles.block}>
              <p className={styles.kicker}>가치관</p>
              {values.summary && <h2 className={styles.big}>{values.summary}</h2>}
              <div className={styles.grid}>
                {valuesCards
                  .filter(([, t]) => t)
                  .map(([label, text, tone]) => (
                    <div className={`${styles.row} ${tone}`} key={label}>
                      <h3>{label}</h3>
                      <p>{text}</p>
                    </div>
                  ))}
              </div>
            </section>
          )}

          {object && (
          <section className={styles.block}>
            <p className={styles.kicker}>대상</p>
            <h2 className={styles.big}>{objNote.title}</h2>
            {[objNote.picked, objNote.observed].map(
              (bx) =>
                bx && (
                  <div className={styles.observed} key={bx.label}>
                    <b>{bx.label}</b>
                    <span>{bx.value}</span>
                    <p>{bx.note}</p>
                  </div>
                ),
            )}
            <p className={styles.emptyText}>{objNote.outro}</p>
          </section>
          )}

          {jobs.length > 0 && (
            <section className={styles.jobs}>
              <h2 className={styles.jobsTitle}>어울리는 직업</h2>
              <p className={styles.source}>직업 정보는 미국 노동부(USDOL/ETA)의 O*NET 31.0 데이터베이스를 바탕으로 했어요.</p>
              {jobs.map((j) => (
                <div className={styles.job} key={j.code}>
                  <div className={styles.jobT}>{j.title_ko}</div>
                  <div className={styles.jobEn}>{j.title_en}</div>
                  {j.tasks?.length > 0 && (
                    <div className={styles.tasks}>
                      <h4>실제 하는 일</h4>
                      <ul>
                        {j.tasks.map((t) => (
                          <li key={t}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {j.unknown || j.scene_question ? (
                    <dl className={styles.dl}>
                      <div className={styles.dtWork}>
                        <dt>연결되는 부분</dt>
                        <dd>{j.why}</dd>
                      </div>
                      {j.unknown && (
                        <div className={styles.dtUnknown}>
                          <dt>아직 확인 안 된 부분</dt>
                          <dd>{j.unknown}</dd>
                        </div>
                      )}
                      {j.scene_question && (
                        <div className={styles.dtAsk}>
                          <dt>떠올려 볼 장면</dt>
                          <dd>{j.scene_question}</dd>
                        </div>
                      )}
                    </dl>
                  ) : (
                    <p className={styles.jobWhy}>{j.why}</p>
                  )}
                </div>
              ))}
              {nextQ && nextQ.choices.length > 0 && (
                <div className={styles.ask}>
                  <h3>{nextQ.question}</h3>
                  <ul>
                    {nextQ.choices.map((ch) => (
                      <li key={ch.when}>
                        <b>{ch.when}</b>
                        <span>{ch.meaning}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {people.length > 0 && (
            <section className={styles.people}>
              <h2 className={styles.jobsTitle}>닮은 방식의 사람들</h2>
              <p className={styles.lead}>비슷한 방식으로 일한 사람들의 장면이에요. 카드를 눌러 옆으로 넘겨 보세요.</p>
              <PeopleCards people={people} />
            </section>
          )}

          {(session.situation || true) && (
            <section className={styles.doSection}>
              <h2 className={styles.jobsTitle}>직접 해 보기</h2>
              {session.situation && <p className={styles.stateLine}>‘{SITUATION_SHORT[session.situation]}’으로 선택하셔서 아래와 같이 준비했어요.</p>}
              {session.situation === "exploring" ? (
                r.explore?.items?.length ? (
                  <>
                    <div className={styles.commonWhy}>
                      <b>공통 이유 : </b>
                      {legacyCommonWhy(r) || EXPLORE_COMMON_WHY}
                    </div>
                    <p className={styles.pickNote}>마음에 드는 하나만 해도 돼요.</p>
                    <ol className={styles.doList}>
                      {r.explore.items.map((it) => (
                        <li key={it.title}>
                          {"object" in it && it.object && <span className={styles.doObject}>{it.object}</span>}
                          <b>{it.title}</b>
                          <p>{it.do}</p>
                          <p className={styles.doWhy}>
                            <em>이유 :</em> {it.why}
                          </p>
                        </li>
                      ))}
                    </ol>
                  </>
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
          )}

          <section className={styles.ending}>
            {ENDING.lines.map((x) => (
              <p key={x}>{x}</p>
            ))}
            <p className={styles.endingStrong}>{ENDING.strong}</p>
            <p className={styles.endingStrong}>
              {ENDING.last[0]}
              <br />
              {ENDING.last[1]}
            </p>
          </section>
        </>
      )}

      <div className={styles.foot}>
        결과지에서 맞지 않는 부분이 있으면 알려주세요. 다음에 반영할게요.
        {contact && (
          <>
            <br />
            <a href={`mailto:${contact}`}>{contact}</a>
          </>
        )}
        {(jobs.length > 0 || jobLists.length > 0) && (
          <div className={styles.legal}>
          <p>
            직업 정보에는 미국 노동부 고용훈련청(USDOL/ETA)의 O*NET 31.0 데이터베이스가 쓰였고, CC BY 4.0 라이선스(
            <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
              creativecommons.org/licenses/by/4.0
            </a>
            )로 사용했어요. 코어 찾기가 한국어로 옮기고 골랐으며, 미국 노동부가 이 내용을 승인하거나 검증하거나 시험한 것이 아니에요.
          </p>
          <p>
            This page includes information from the O*NET 31.0 Database by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA). Used under the CC BY 4.0 license. 코어 찾기 has
            modified all or some of this information. USDOL/ETA has not approved, endorsed, or tested these modifications. O*NET® is a trademark of USDOL/ETA.
          </p>
          </div>
        )}
      </div>
    </main>
  );
}
