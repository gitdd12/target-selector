import { JOB_TEXT } from "@/lib/frame";
import { overlapLine } from "@/lib/result";
import type { CoreJobs, JobEntry } from "@/lib/types";
import styles from "./ResultView.module.css";

// 코어 칸 안의 직업 목록(결과지 v0.28). 직업 한 줄 = 이름 + 일치도 %(이름 바로 옆) / 한 줄 설명 / 내 코어와 겹치는 업무.
// 겹치는 업무는 그 직업의 실제 업무(O*NET)에서 판정 AI가 짚은 구절을 번역한 것이라 AI가 새로 쓴 문장이 아니다.
// 일치도는 초록 배경의 진하기로 네 단계를 보여준다(80 이상 / 60 이상 / 40 이상 / 그 아래). 20 미만은 보여주지 않는다.
const tierOf = (m: number) => (m >= 80 ? 4 : m >= 60 ? 3 : m >= 40 ? 2 : 1);

function Job({ j }: { j: JobEntry }) {
  const overlap = overlapLine(j.evidence[0]);
  return (
    <div className={styles.jobRow}>
      <div className={styles.jobHead}>
        <b>{j.name}</b>
        <span className={styles.jobMatch} data-tier={tierOf(j.match)}>
          {JOB_TEXT.match} {j.match}%
        </span>
        {j.both && <em className={styles.jobBoth}>{JOB_TEXT.both}</em>}
      </div>
      {j.desc && <p className={styles.jobDesc}>{j.desc}</p>}
      {overlap && (
        <p className={styles.jobOverlap}>
          <span>{JOB_TEXT.overlap}</span> {overlap}
        </p>
      )}
    </div>
  );
}

export default function JobLists({ jobs, first }: { jobs: CoreJobs; first: boolean }) {
  // 예전 세션(v0.28 전, 옛 일치도 식)은 20 미만 직업도 저장돼 있어서 화면에서도 거른다.
  // 새 세션은 만들 때 이미 JOBS.minMatch로 걸러지므로, 옛 숫자 기준(20)으로만 거른다.
  const keep = (l: JobEntry[]) => l.filter((j) => j.match >= 20);
  const groups: [string, JobEntry[]][] = [
    [JOB_TEXT.confirmed, keep(jobs.confirmed)],
    [JOB_TEXT.other, keep(jobs.other)],
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
