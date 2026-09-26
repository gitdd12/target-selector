import { JOB_TEXT } from "@/lib/frame";
import { splitBold } from "@/lib/result";
import type { CoreJobs, JobEntry } from "@/lib/types";
import styles from "./ResultView.module.css";

// 코어 칸 안의 직업 목록. 직업 한 줄 = 이름 + 한 줄 설명 + 일치도. 누르면 근거 업무(번역, 행동에 해당하는 구절은 굵게)가 펼쳐진다.
// 펼치기는 브라우저 기본 기능(details)으로 해서 화면 코드 없이 동작한다.
function Job({ j }: { j: JobEntry }) {
  return (
    <details className={styles.jobRow}>
      <summary>
        <span className={styles.jobMain}>
          <b>{j.name}</b>
          <span>{j.desc}</span>
          {j.both && <em className={styles.jobBoth}>{JOB_TEXT.both}</em>}
        </span>
        <span className={styles.jobMatch} aria-label={`${JOB_TEXT.match} ${j.match}`}>
          <small>{JOB_TEXT.match}</small>
          {j.match}
        </span>
      </summary>
      <div className={styles.jobEvidence}>
        <h4>{JOB_TEXT.evidence}</h4>
        <ul>
          {j.evidence.map((e) => (
            <li key={e.text}>
              {e.ko
                ? splitBold(e.ko).map((part, i) => (part.bold ? <strong key={i}>{part.text}</strong> : <span key={i}>{part.text}</span>))
                : e.text}
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}

export default function JobLists({ jobs, first }: { jobs: CoreJobs; first: boolean }) {
  const groups: [string, JobEntry[]][] = [
    [JOB_TEXT.confirmed, jobs.confirmed],
    [JOB_TEXT.other, jobs.other],
  ];
  return (
    <div className={styles.jobLists}>
      {first && <p className={styles.jobNote}>{JOB_TEXT.objectNote}</p>}
      {groups.map(([title, list]) => (
        <div className={styles.jobGroup} key={title}>
          <h3>{title}</h3>
          {list.length > 0 ? list.map((j) => <Job j={j} key={j.soc} />) : <p className={styles.jobEmpty}>{JOB_TEXT.empty}</p>}
        </div>
      ))}
    </div>
  );
}
