// 직업 목록 만들기(본질 유사도 방식, docs/직업매칭_본질기반_재설계_2026-09-30.md).
// 확정 코어마다: matchCoreToEssences(코어×직업 916개 본질 유사도) → 대상(사전 태깅)으로 A/B 분류 → 목록.
// 옛 방식(업무 문장 판정 → 직업 점수 → 근거 재확인 → 번역)은 완전히 대체됐다 — 더 이상 쓰지 않는다.
import { getEssence, essenceDesc, matchCoreToEssences } from "./coreEssenceMatch";
import { JOBS } from "./config";
import type { Behavior, CoreJobs, JobEntry, JobWork, Session } from "./types";

// ── 대상별 1등 ────────────────────────────────────────────────
/** match 내림차순으로 정렬된 목록에서, 대상마다 처음(=가장 높은 match) 것만 남긴다. */
function topPerObject<T extends { object: string }>(list: T[]): T[] {
  const seen = new Set<string>();
  return list.filter((o) => (seen.has(o.object) ? false : (seen.add(o.object), true)));
}

function confirmedOf(s: Session, ci: number): Set<string> {
  return new Set(s.final?.cores[ci]?.objects.confirmed ?? []);
}

interface Scored {
  soc: string;
  name: string;
  match: number;
  object: string;
  valuesFit?: "안맞음" | "잘맞음";
  valuesNote?: string;
}

/** w.matches(일치도 순으로 이미 정렬됨)에 사전 태깅된 대상을 붙이고 문턱으로 거른다. */
function scoredOf(w: JobWork["cores"][number]): Scored[] {
  return (w.matches ?? [])
    .filter((m) => m.match >= JOBS.minMatch)
    .map((m) => ({ ...m, object: getEssence(m.soc)?.object ?? "" }))
    .filter((m) => m.object);
}

// ── 단계 1: 코어×본질 매칭 ─────────────────────────────────────
async function matchStage(s: Session) {
  const cores = s.final?.cores ?? [];
  const work = s.jobWork!;
  for (let ci = 0; ci < cores.length; ci++) {
    const w = work.cores[ci];
    if (w.matches) continue;
    const b: Behavior = cores[ci].behavior;
    const out = await matchCoreToEssences(b, s);
    w.matches = out.map((m) => ({
      soc: m.soc,
      name: m.name,
      match: m.match,
      ...(m.valuesEffect ? { valuesFit: m.valuesEffect, valuesNote: m.valuesNote } : {}),
    }));
  }
  work.stage = "lists";
}

// ── 단계 2: A/B 목록 + 탐색 대상 ─────────────────────────────────
function listsStage(s: Session) {
  const cores = s.final?.cores ?? [];
  const work = s.jobWork!;
  const size = cores.length > 1 ? JOBS.listTwo : JOBS.listOne;
  const perCore = cores.map((_, ci) => scoredOf(work.cores[ci]));

  // 코어가 둘 이상이면 같은 직업이 여러 코어에 걸릴 수 있다 — 점수가 가장 높은 코어 쪽에만 남긴다.
  if (cores.length > 1) {
    const best = new Map<string, { ci: number; score: number; count: number }>();
    perCore.forEach((list, ci) => {
      for (const o of list) {
        const cur = best.get(o.soc);
        if (!cur) best.set(o.soc, { ci, score: o.match, count: 1 });
        else best.set(o.soc, { ...(o.match > cur.score ? { ci, score: o.match } : cur), count: cur.count + 1 });
      }
    });
    perCore.forEach((list, ci) => {
      for (let i = list.length - 1; i >= 0; i--) if (best.get(list[i].soc)!.ci !== ci) list.splice(i, 1);
    });
    work.both = [...best.entries()].filter(([, v]) => v.count > 1).map(([soc]) => soc);
  }

  const result: CoreJobs[] = [];
  perCore.forEach((list, ci) => {
    const confirmed = confirmedOf(s, ci);
    // 확인된 대상이 여러 개면 대상마다 1등을 먼저 넣는다(점수만으로 자르면 한 대상이 나머지를 다 밀어낼 수 있다).
    const confirmedPool = list.filter((o) => confirmed.has(o.object));
    const confirmedTops = topPerObject(confirmedPool);
    const confirmedTopSet = new Set(confirmedTops.map((o) => o.soc));
    const confirmedList = [...confirmedTops, ...confirmedPool.filter((o) => !confirmedTopSet.has(o.soc))];
    const otherPool = list.filter((o) => !confirmed.has(o.object));
    const tops = topPerObject(otherPool);
    const topSet = new Set(tops.map((o) => o.soc));
    const otherList = [...tops, ...otherPool.filter((o) => !topSet.has(o.soc))];

    const toEntry = (o: Scored): JobEntry => ({
      soc: o.soc,
      name: o.name,
      desc: essenceDesc(o.soc),
      match: o.match,
      object: o.object,
      ...(work.both?.includes(o.soc) ? { both: true } : {}),
      ...(o.valuesFit ? { valuesFit: o.valuesFit, valuesNote: o.valuesNote } : {}),
    });
    const confirmedJobs = confirmedList.slice(0, size).map(toEntry);
    const otherJobs = otherList.slice(0, size).map(toEntry);
    const exploreObjects = tops.map((o) => ({ object: o.object, soc: o.soc, name: o.name, match: o.match }));
    result.push({ core: ci, confirmed: confirmedJobs, other: otherJobs, exploreObjects });
  });
  s.jobLists = result;
  work.stage = "done";
}

/** 직업 목록 단계를 한 걸음 진행한다. 끝나면 true. */
export async function jobsStep(s: Session): Promise<boolean> {
  const cores = s.final?.cores ?? [];
  if (cores.length === 0) return true;
  s.jobWork ??= { stage: "match", cores: cores.map(() => ({})) };
  const work = s.jobWork;
  if (work.stage === "match") await matchStage(s);
  if (work.stage === "lists") listsStage(s);
  return work.stage === "done";
}

/** 결과지 작성 단계에 넘길 해 볼 일 대상 후보(코어마다, 일치도 문턱 이상 — scoredOf에서 이미 걸러짐). */
export function exploreCandidates(s: Session) {
  return (s.jobLists ?? []).map((c) => ({ core: c.core, objects: c.exploreObjects }));
}

/** 검토 화면용 요약. */
export function jobWorkSummary(w: JobWork | undefined): string {
  if (!w) return "";
  return `단계: ${w.stage} · ${w.cores.map((c, i) => `코어 ${i + 1}: 매칭 ${c.matches?.length ?? 0}개`).join(" / ")}`;
}
