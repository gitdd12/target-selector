// 직업 목록 만들기(결과지 작성 기준 "직업 목록 만들기", 설계 docs/직업추천_재설계_2026-09-25.md).
// 확정 코어마다: 검색 문장(AI) → 임베딩 검색 → 업무 판정(AI) → 직업 점수 → 후보 직업 확장 → 목록 → 근거 재확인(AI) → 근거 번역(AI).
// 판정할 문장이 많아(사람당 약 1,300~2,300문장) 한 번의 서버 호출 시간 안에 다 못 끝낼 수 있다.
// 그래서 중간 상태(s.jobWork)를 세션에 저장하고, 호출될 때마다 시간 예산 안에서 이어서 진행한다.
import { createHash } from "node:crypto";
import { z } from "zod";
import { JOBS } from "./config";
import { embedQueries, searchTasks, taskIndex } from "./embed";
import { behaviorBlock, judgeTaskSystem, judgeTaskUser, querySystem, queryUser, translateSystem, translateUser } from "./jobPrompts";
import { cached, callJson } from "./llm";
import { onet } from "./onet31";
import { getStore } from "./store";
import {
  NO_OBJECT,
  SEARCH_OBJECTS,
  type Behavior,
  type CoreJobs,
  type JobEntry,
  type JobWork,
  type Session,
  type TaskJudgment,
} from "./types";

const ALL_OBJECTS = [...SEARCH_OBJECTS, NO_OBJECT] as [string, ...string[]];
const STRENGTHS = [0.3, 0.5, 0.7, 1];
// 한 번의 서버 호출에서 새 판정 묶음을 시작하는 마지막 시점(서버 제한 300초 안에서 여유를 둔다)
const STEP_BUDGET_MS = 170_000;

const QueriesSchema = z.object({
  items: z.array(
    z.object({ object: z.enum(ALL_OBJECTS), applicable: z.boolean(), daily: z.string(), onet: z.string() }),
  ),
});
const JudgeSchema = z.object({
  items: z.array(
    z.object({
      n: z.number().int().describe("업무 문장 번호"),
      quote: z.string().describe("행동에 해당하는 구절(원문 그대로)"),
      strength: z.number().describe("0.3 / 0.5 / 0.7 / 1 중 하나"),
      share: z.number().describe("몫(0보다 크고 1 이하)"),
      object: z.enum(ALL_OBJECTS),
    }),
  ),
});
const TranslateSchema = z.object({ items: z.array(z.object({ id: z.number().int(), ko: z.string() })) });

// ── 작은 도구 ─────────────────────────────────────────────────
let textIndex: Map<string, number> | null = null;
function indexOfText(text: string): number | undefined {
  if (!textIndex) textIndex = new Map(taskIndex().texts.map((t, i) => [t, i]));
  return textIndex.get(text);
}
const textOf = (i: number) => taskIndex().texts[i];
const norm = (x: string) => x.toLowerCase().replace(/\s+/g, " ").trim();
const value = (j: TaskJudgment) => j.s * j.f;

async function pool<T>(items: T[], limit: number, fn: (x: T) => Promise<void>) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) await fn(items[next++]);
    }),
  );
}

// ── 판정 ─────────────────────────────────────────────────────
/** 업무 문장 묶음 하나를 판정한다. 형식이 어긋난 항목은 그 문장만 한 번 다시 판정하고, 그래도 어긋나면 0점으로 둔다. */
async function judgeBatch(s: Session, b: Behavior, idxs: number[], retry = true): Promise<Map<number, TaskJudgment>> {
  const texts = idxs.map(textOf);
  const out = await callJson("jobs", JudgeSchema, [cached(judgeTaskSystem()), cached(behaviorBlock(b))], judgeTaskUser(texts), s);
  const result = new Map<number, TaskJudgment>();
  const bad: number[] = [];
  for (const it of out.items) {
    const k = it.n - 1;
    if (k < 0 || k >= idxs.length || result.has(idxs[k])) continue;
    const text = texts[k];
    const strength = STRENGTHS.find((v) => Math.abs(v - it.strength) < 0.01);
    const okShare = it.share > 0 && it.share <= 1.0001;
    const okQuote = it.quote.trim().length > 0 && norm(text).includes(norm(it.quote));
    if (!strength || !okShare || !okQuote) {
      bad.push(idxs[k]);
      continue;
    }
    result.set(idxs[k], { s: strength, f: Math.min(1, Math.round(it.share * 100) / 100), o: it.object, q: it.quote.trim() });
  }
  if (bad.length && retry) {
    const again = await judgeBatch(s, b, bad, false);
    for (const [k, v] of again) result.set(k, v);
  }
  return result;
}

/** 대기 중인 문장을 시간 예산 안에서 판정한다. 다 끝나면 true. */
async function drainPending(s: Session, b: Behavior, w: JobWork["cores"][number], deadline: number): Promise<boolean> {
  while (w.pending.length > 0) {
    if (Date.now() > deadline) return false;
    const round = w.pending.slice(0, JOBS.judgeBatch * JOBS.concurrency);
    const batches: number[][] = [];
    for (let i = 0; i < round.length; i += JOBS.judgeBatch) batches.push(round.slice(i, i + JOBS.judgeBatch));
    const results: Map<number, TaskJudgment>[] = [];
    await pool(batches, JOBS.concurrency, async (batch) => {
      results.push(await judgeBatch(s, b, batch));
    });
    const done = new Set(round);
    for (const r of results) for (const [k, v] of r) w.judged[k] = v;
    for (const k of round) if (!(k in w.judged)) w.zero.push(k);
    w.pending = w.pending.filter((k) => !done.has(k));
  }
  return true;
}

// ── 점수 ─────────────────────────────────────────────────────
interface OccScore {
  soc: string;
  score: number;
  object: string; // 점수에 가장 많이 기여한 대상
}

/** 직업 점수 = Σ(중요도 × 판정 점수) ÷ 그 직업 전체 업무의 중요도 합. onlyObjects를 주면 그 대상의 업무만 센다(A 목록). */
function occScores(w: JobWork["cores"][number], onlyObjects?: Set<string>): OccScore[] {
  const { byText, imTotal, excluded } = onet();
  const sum = new Map<string, number>();
  const byObj = new Map<string, Map<string, number>>();
  for (const [k, j] of Object.entries(w.judged)) {
    if (onlyObjects && !onlyObjects.has(j.o)) continue;
    for (const t of byText.get(textOf(Number(k))) ?? []) {
      if (excluded.has(t.soc)) continue;
      const c = t.im * value(j);
      if (c <= 0) continue;
      sum.set(t.soc, (sum.get(t.soc) ?? 0) + c);
      const m = byObj.get(t.soc) ?? byObj.set(t.soc, new Map()).get(t.soc)!;
      m.set(j.o, (m.get(j.o) ?? 0) + c);
    }
  }
  return [...sum.entries()]
    .map(([soc, v]) => {
      const objs = [...byObj.get(soc)!.entries()].sort((a, b) => b[1] - a[1]);
      return { soc, score: v / (imTotal.get(soc) || 1), object: objs[0][0] };
    })
    .sort((a, b) => b.score - a.score);
}

const matchOf = (score: number) => Math.min(100, Math.round((score / JOBS.matchBase) * 100));

/** 대상마다 1등 직업(점수순). */
function topPerObject(list: OccScore[]): OccScore[] {
  const seen = new Set<string>();
  return list.filter((o) => (seen.has(o.object) ? false : (seen.add(o.object), true)));
}

/** 확장: A·B 상위 N개 + 대상별 1등 직업의 업무 전부 중 아직 판정 안 한 것을 대기열에 넣는다. */
function expand(w: JobWork["cores"][number], confirmed: Set<string>) {
  const B = occScores(w);
  const A = occScores(w, confirmed);
  const socs = new Set([...A.slice(0, JOBS.expandTop), ...B.slice(0, JOBS.expandTop), ...topPerObject(B)].map((o) => o.soc));
  const seen = new Set([...Object.keys(w.judged).map(Number), ...w.zero, ...w.pending]);
  for (const soc of socs) {
    for (const text of onet().textsBySoc.get(soc) ?? []) {
      const i = indexOfText(text);
      if (i !== undefined && !seen.has(i)) {
        seen.add(i);
        w.pending.push(i);
      }
    }
  }
  w.expanded = true;
}

/** 근거 재확인 전 후보 순서. A: 점수순(확인된 대상이 여러 개면 대상마다 1개씩 먼저). B−A: 대상마다 1등을 점수순, 그다음 나머지 점수순. */
function candidateOrder(w: JobWork["cores"][number], confirmed: Set<string>) {
  const A = occScores(w, confirmed);
  const firsts = [...confirmed].map((o) => A.find((x) => x.object === o)).filter((x): x is OccScore => Boolean(x));
  const firstSet = new Set(firsts.map((x) => x.soc));
  const confirmedList = [...firsts.sort((a, b) => b.score - a.score), ...A.filter((x) => !firstSet.has(x.soc))];
  const otherPool = occScores(w).filter((x) => !confirmed.has(x.object));
  const tops = topPerObject(otherPool);
  const topSet = new Set(tops.map((x) => x.soc));
  const otherList = [...tops, ...otherPool.filter((x) => !topSet.has(x.soc))];
  return { confirmed: confirmedList.map((x) => x.soc), other: otherList.map((x) => x.soc) };
}

// ── 한 단계씩 진행 ────────────────────────────────────────────
function confirmedOf(s: Session, ci: number): Set<string> {
  return new Set(s.final?.cores[ci]?.objects.confirmed ?? []);
}

async function searchStage(s: Session) {
  const cores = s.final?.cores ?? [];
  const work = s.jobWork!;
  for (let ci = 0; ci < cores.length; ci++) {
    const w = work.cores[ci];
    if (w.queries) continue;
    const b = cores[ci].behavior;
    const q = await callJson("jobs", QueriesSchema, [cached(querySystem())], queryUser(b), s);
    const queries: { object: string; text: string }[] = [];
    for (const it of q.items) {
      if (!it.applicable) continue;
      for (const t of [it.daily, it.onet]) if (t.trim()) queries.push({ object: it.object, text: t.trim() });
    }
    // "대상 없음" 문장을 빠뜨렸으면 영어 행동 설명으로 대신한다(19개에 없는 대상을 잡는 안전망)
    if (!queries.some((x) => x.object === NO_OBJECT)) queries.push({ object: NO_OBJECT, text: b.en });
    const vecs = await embedQueries(queries.map((x) => x.text));
    const found = new Set<number>();
    for (const v of vecs) for (const r of searchTasks(v)) found.add(indexOfText(r.text)!);
    w.queries = queries;
    w.pending = [...found];
  }
  work.stage = "judge";
}

/** 판정(검색 후보 → 확장 → 확장분)까지. 시간 예산을 넘기면 멈추고 다음 호출에서 이어 한다. */
async function judgeStage(s: Session, deadline: number) {
  const cores = s.final?.cores ?? [];
  const work = s.jobWork!;
  for (let ci = 0; ci < cores.length; ci++) {
    const w = work.cores[ci];
    const b = cores[ci].behavior;
    if (!(await drainPending(s, b, w, deadline))) return;
    if (!w.expanded) {
      expand(w, confirmedOf(s, ci));
      if (!(await drainPending(s, b, w, deadline))) return;
    }
  }
  work.stage = "lists";
}

/** 후보 순서를 정하고, 코어가 둘 이상이면 같은 직업을 점수가 높은 코어 쪽에만 남긴다. */
function listsStage(s: Session) {
  const cores = s.final?.cores ?? [];
  const work = s.jobWork!;
  const orders = cores.map((_, ci) => candidateOrder(work.cores[ci], confirmedOf(s, ci)));
  if (cores.length > 1) {
    const best = new Map<string, { ci: number; score: number; count: number }>();
    cores.forEach((_, ci) => {
      const scores = new Map(occScores(work.cores[ci]).map((o) => [o.soc, o.score]));
      for (const soc of new Set([...orders[ci].confirmed, ...orders[ci].other])) {
        const sc = scores.get(soc) ?? 0;
        const cur = best.get(soc);
        if (!cur) best.set(soc, { ci, score: sc, count: 1 });
        else best.set(soc, { ...(sc > cur.score ? { ci, score: sc } : cur), count: cur.count + 1 });
      }
    });
    orders.forEach((o, ci) => {
      o.confirmed = o.confirmed.filter((soc) => best.get(soc)!.ci === ci);
      o.other = o.other.filter((soc) => best.get(soc)!.ci === ci);
    });
    work.both = [...best.entries()].filter(([, v]) => v.count > 1).map(([soc]) => soc);
  }
  orders.forEach((o, ci) => (work.cores[ci].lists = o));
  work.stage = "evidence";
}

interface Pick {
  soc: string;
  tries: number[]; // 재확인할 근거 문장(순서대로)
  passed: number[];
  next: number;
}

/** 근거 문장 후보: 판정 0.5 이상, 목록에 맞는 대상의 업무 먼저, 그다음 중요도 × 판정 점수 순. */
function evidenceCandidates(w: JobWork["cores"][number], soc: string, confirmed: Set<string>, inA: boolean): number[] {
  const { byText } = onet();
  const rows: { i: number; fit: number; c: number }[] = [];
  for (const text of onet().textsBySoc.get(soc) ?? []) {
    const i = indexOfText(text);
    if (i === undefined) continue;
    const j = w.judged[i];
    if (!j || value(j) < JOBS.citeMin) continue;
    if (inA && !confirmed.has(j.o)) continue;
    const im = byText.get(text)?.find((t) => t.soc === soc)?.im ?? 0;
    rows.push({ i, fit: inA || !confirmed.has(j.o) ? 1 : 0, c: im * value(j) });
  }
  return rows.sort((a, b) => b.fit - a.fit || b.c - a.c).slice(0, JOBS.evidenceTries).map((r) => r.i);
}

/** 근거 재확인: 인용할 근거만 한 번 더 판정해 두 판정이 모두 0.5 이상이면 통과. 통과 근거가 없는 직업은 빼고 다음 순위를 올린다. */
async function evidenceStage(s: Session) {
  const cores = s.final?.cores ?? [];
  const work = s.jobWork!;
  const size = cores.length > 1 ? JOBS.listTwo : JOBS.listOne;
  const recheck = (work.recheck ??= {});
  const result: CoreJobs[] = [];

  for (let ci = 0; ci < cores.length; ci++) {
    const w = work.cores[ci];
    const confirmed = confirmedOf(s, ci);
    const b = cores[ci].behavior;
    const scoreB = new Map(occScores(w).map((o) => [o.soc, o]));
    const scoreA = new Map(occScores(w, confirmed).map((o) => [o.soc, o]));
    const lists = { confirmed: [] as Pick[], other: [] as Pick[] };
    const queues = { confirmed: [...w.lists!.confirmed], other: [...w.lists!.other] };
    const used = new Set<string>();

    // 목록마다 필요한 수가 찰 때까지: 후보를 채우고 → 재확인할 근거를 모아 한 번에 판정 → 통과/탈락 처리
    for (let round = 0; round < 12; round++) {
      const active: { list: "confirmed" | "other"; p: Pick }[] = [];
      for (const list of ["confirmed", "other"] as const) {
        const inA = list === "confirmed";
        const done = lists[list].filter((p) => p.passed.length > 0).length;
        let open = lists[list].filter((p) => p.passed.length === 0 && p.next < p.tries.length);
        while (done + open.length < size && queues[list].length) {
          const soc = queues[list].shift()!;
          if (used.has(soc)) continue;
          const tries = evidenceCandidates(w, soc, confirmed, inA);
          if (!tries.length) continue; // 인용할 근거(0.5 이상)가 없으면 올리지 않는다
          used.add(soc);
          const p = { soc, tries, passed: [], next: 0 };
          lists[list].push(p);
          open = [...open, p];
        }
        for (const p of open) active.push({ list, p });
      }
      if (!active.length) break;
      // 직업마다 다음 근거 두 개씩(보여줄 근거 수만큼) 재확인
      const need = new Set<number>();
      for (const { p } of active) for (const i of p.tries.slice(p.next, p.next + JOBS.evidenceShown)) if (!(i in recheck)) need.add(i);
      const idxs = [...need];
      const batches: number[][] = [];
      for (let i = 0; i < idxs.length; i += JOBS.judgeBatch) batches.push(idxs.slice(i, i + JOBS.judgeBatch));
      await pool(batches, JOBS.concurrency, async (batch) => {
        const r = await judgeBatch(s, b, batch);
        for (const i of batch) recheck[i] = (r.get(i) ? value(r.get(i)!) : 0) >= JOBS.citeMin;
      });
      for (const { p } of active) {
        const tried = p.tries.slice(p.next, p.next + JOBS.evidenceShown);
        p.passed.push(...tried.filter((i) => recheck[i]));
        p.next += tried.length;
      }
      // 근거를 다 써도 통과 못 한 직업은 뺀다
      for (const list of ["confirmed", "other"] as const) lists[list] = lists[list].filter((p) => p.passed.length > 0 || p.next < p.tries.length);
    }

    const entry = (p: Pick, inA: boolean): JobEntry => {
      const sc = (inA ? scoreA : scoreB).get(p.soc)!;
      const ko = onet().ko[p.soc];
      return {
        soc: p.soc,
        name: ko?.name ?? p.soc,
        desc: ko?.desc ?? "",
        score: Math.round(sc.score * 10000) / 10000,
        match: matchOf(sc.score),
        object: sc.object,
        ...(work.both?.includes(p.soc) ? { both: true } : {}),
        evidence: p.passed.slice(0, JOBS.evidenceShown).map((i) => ({ text: textOf(i), quote: w.judged[i].q })),
      };
    };
    const finalize = (ps: Pick[], inA: boolean) =>
      ps
        .filter((p) => p.passed.length > 0)
        .map((p) => entry(p, inA))
        .sort((a, b) => b.score - a.score)
        .slice(0, size);
    const confirmedJobs = finalize(lists.confirmed, true);
    const otherJobs = finalize(lists.other, false);
    // 해 볼 일 후보: 화면의 "아직 확인 안 된 대상" 목록에 나온 대상 먼저(그 대상의 목록 속 직업), 그다음 나머지 대상마다 1등 직업(점수 기준).
    // 문턱(일치도 40)은 결과지 작성 단계에 넘길 때 적용한다.
    const shown = otherJobs.filter((j) => j.object !== NO_OBJECT).map((j) => ({ object: j.object, soc: j.soc, name: j.name, match: j.match }));
    const rest = topPerObject(occScores(w).filter((x) => !confirmed.has(x.object) && x.object !== NO_OBJECT)).map((o) => ({
      object: o.object,
      soc: o.soc,
      name: onet().ko[o.soc]?.name ?? o.soc,
      match: matchOf(o.score),
    }));
    const seenObj = new Set<string>();
    const exploreObjects = [...shown, ...rest].filter((o) => (seenObj.has(o.object) ? false : (seenObj.add(o.object), true)));
    result.push({ core: ci, confirmed: confirmedJobs, other: otherJobs, exploreObjects });
  }
  s.jobLists = result;
  work.stage = "translate";
}

/** 근거 문장 번역. (문장, 구절) 단위로 한 번 번역해 모든 세션이 같이 쓴다. [[ ]]가 한 쌍이 아니면 굵게 없이 쓴다. */
async function translateStage(s: Session) {
  const store = getStore();
  const all = (s.jobLists ?? []).flatMap((c) => [...c.confirmed, ...c.other]).flatMap((j) => j.evidence);
  const keyOf = (e: { text: string; quote: string }) => "ko1:" + createHash("sha1").update(`${e.text}\u0000${e.quote}`).digest("hex");
  const keys = [...new Set(all.map(keyOf))];
  const have = (await store.getCache(keys)) as Record<string, string>;
  const missing = [...new Map(all.filter((e) => !(keyOf(e) in have)).map((e) => [keyOf(e), e])).values()];
  const fresh: Record<string, string> = {};
  for (let i = 0; i < missing.length; i += 30) {
    const chunk = missing.slice(i, i + 30);
    const out = await callJson(
      "jobs",
      TranslateSchema,
      [cached(translateSystem())],
      translateUser(chunk.map((e, k) => ({ id: k + 1, text: e.text, quote: e.quote }))),
      s,
    );
    for (const it of out.items) {
      const e = chunk[it.id - 1];
      if (e && it.ko.trim()) fresh[keyOf(e)] = it.ko.trim();
    }
  }
  if (Object.keys(fresh).length) await store.putCache(fresh);
  const ko = { ...have, ...fresh };
  for (const e of all) {
    const t = ko[keyOf(e)];
    if (t) e.ko = t;
  }
  s.jobWork!.stage = "done";
}

/** 직업 목록 단계를 한 걸음 진행한다. 끝나면 true. */
export async function jobsStep(s: Session): Promise<boolean> {
  const cores = s.final?.cores ?? [];
  if (cores.length === 0) return true;
  const deadline = Date.now() + STEP_BUDGET_MS;
  s.jobWork ??= { stage: "search", cores: cores.map(() => ({ pending: [], judged: {}, zero: [], expanded: false })) };
  const work = s.jobWork;
  if (work.stage === "search") await searchStage(s);
  if (work.stage === "judge") await judgeStage(s, deadline);
  if (work.stage === "lists") listsStage(s);
  if (work.stage === "evidence") {
    if (Date.now() > deadline) return false;
    await evidenceStage(s);
  }
  if (work.stage === "translate") {
    if (Date.now() > deadline + 60_000) return false;
    await translateStage(s);
  }
  return work.stage === "done";
}

/** 결과지 작성 단계에 넘길 해 볼 일 대상 후보(코어마다, 일치도 문턱 이상). */
export function exploreCandidates(s: Session) {
  return (s.jobLists ?? []).map((c) => ({
    core: c.core,
    objects: c.exploreObjects.filter((o) => o.match >= JOBS.exploreMinMatch),
  }));
}

/** 검토 화면용 요약: 판정 수와 점수가 있는 판정 수. */
export function jobWorkSummary(w: JobWork | undefined): string {
  if (!w) return "";
  return w.cores
    .map((c, i) => `코어 ${i + 1}: 검색 문장 ${c.queries?.length ?? 0}개, 판정 ${Object.keys(c.judged).length + c.zero.length}문장(점수 있음 ${Object.keys(c.judged).length})`)
    .join(" / ");
}

export { matchOf };
