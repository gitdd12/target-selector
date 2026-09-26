// 직접 해 보기의 칸 나누기(결과지 작성 기준 v0.28 "직접 해 보기").
// 해 볼 일은 두 종류다.
//   확인: 아직 코어인지 불확실한 행동(코어 후보, 신뢰도 중인 코어)을 같거나 비슷한 대상에서 한 번 더 해 보기.
//         한 번에 하나만 바꾼다 — 코어가 불확실할 때 대상까지 바꾸면, 안 끌렸을 때 대상 탓인지 코어가 아닌 건지 알 수 없다.
//   탐색: 코어로 확인된 행동(신뢰도 상)을 아직 확인 안 된 대상에서 해 보기. 대상의 1등 직업과 잇는다.
// 칸은 코어 후보 → 중 코어 → 상 코어 순서로 채운다. 상 코어가 있으면 탐색을 최소 1칸 남긴다(진로 탐색이 원래 목적이라서).
import { exploreCandidates } from "./jobfinder";
import { SIGNAL_LABEL, type SignalKey } from "./reliability";
import type { FinalJudgment, Session } from "./types";

export const EXPLORE_SLOTS = 3;
export const MAX_CANDIDATES = 2;

export interface ExploreSlot {
  slot: number;
  kind: "확인" | "탐색";
  ref: string; // "코어 1" / "후보 1"
  behavior: string;
  experience: string; // 이 행동이 나온 대상(사용자 표현)
  object?: string; // 탐색 칸: 해 볼 대상. 없으면 비슷한 대상으로 채운다
  job?: string;
  match?: number;
}

type Candidate = NonNullable<FinalJudgment["candidates"]>[number];

const signalCount = (sig: Record<SignalKey, { present: boolean }> | undefined) =>
  sig ? (Object.keys(SIGNAL_LABEL) as SignalKey[]).filter((k) => sig[k]?.present).length : 0;

/** 결과지에 올릴 코어 후보: 무게 신호가 정확히 하나인 것만, 최대 두 개. */
export function shownCandidates(final: FinalJudgment | undefined): Candidate[] {
  return (final?.candidates ?? []).filter((c) => signalCount(c.signals) === 1).slice(0, MAX_CANDIDATES);
}

/** 코어별 충족 신호 수. 판정이 인정한 신호(signals)가 있으면 그것, 없으면 근거 경험의 기록으로 센다. */
export function coreSignalCount(s: Session, i: number): number {
  const c = s.final?.cores[i];
  if (!c) return 0;
  if (c.signals) return signalCount(c.signals);
  const met = new Set<SignalKey>();
  for (const n of c.basis_experiences) {
    const rec = n === 1 ? s.records.exp1 : n === 2 ? s.records.exp2 : n === 3 ? s.records.exp3 : undefined;
    for (const k of Object.keys(SIGNAL_LABEL) as SignalKey[]) if (rec?.weight_signals?.[k]?.present) met.add(k);
  }
  return met.size;
}

/** 확인한 것(코어 후보 칸에 보이는 한 줄): 충족된 신호의 이름. 부족한 신호는 보여주지 않는다. */
export function candidateSeen(c: Candidate): string[] {
  return (Object.keys(SIGNAL_LABEL) as SignalKey[]).filter((k) => c.signals[k]?.present).map((k) => SIGNAL_LABEL[k]);
}

export function explorePlan(s: Session): ExploreSlot[] {
  const final = s.final;
  if (!final) return [];
  const confirm: Omit<ExploreSlot, "slot">[] = [];
  shownCandidates(final).forEach((c, i) =>
    confirm.push({ kind: "확인", ref: `후보 ${i + 1}`, behavior: c.label, experience: `경험 ${c.experience}` }),
  );
  const strong: number[] = [];
  final.cores.forEach((c, i) => {
    if (coreSignalCount(s, i) >= 3) strong.push(i);
    else confirm.push({ kind: "확인", ref: `코어 ${i + 1}`, behavior: c.behavior.action, experience: c.objects.experience });
  });

  // 탐색 칸 후보: 상 코어 먼저, 그다음 중 코어. 코어를 번갈아 가며 대상이 겹치지 않게 고른다.
  const weak = final.cores.map((_, i) => i).filter((i) => !strong.includes(i));
  const pools = exploreCandidates(s);
  const widen: Omit<ExploreSlot, "slot">[] = [];
  const used = new Set<string>();
  for (const group of [strong, weak]) {
    const lists = group.map((i) => ({ i, objs: [...(pools.find((p) => p.core === i)?.objects ?? [])] }));
    let added = true;
    while (added) {
      added = false;
      for (const l of lists) {
        const o = l.objs.shift();
        if (!o || used.has(o.object)) continue;
        used.add(o.object);
        const c = final.cores[l.i];
        widen.push({ kind: "탐색", ref: `코어 ${l.i + 1}`, behavior: c.behavior.action, experience: c.objects.experience, object: o.object, job: o.name, match: o.match });
        added = true;
      }
    }
  }

  const filler = (i: number): Omit<ExploreSlot, "slot"> => {
    const c = final.cores[i];
    return { kind: "탐색", ref: `코어 ${i + 1}`, behavior: c.behavior.action, experience: c.objects.experience };
  };
  const full = () => picked.length >= EXPLORE_SLOTS;
  // 상 코어가 있으면 확인은 최대 두 칸(탐색 한 칸을 남긴다)
  const picked = confirm.slice(0, Math.min(confirm.length, strong.length ? EXPLORE_SLOTS - 1 : EXPLORE_SLOTS));
  for (const w of widen) if (!full()) picked.push(w);
  // 탐색할 대상이 모자라면 비슷한 대상 칸으로 채운다(작성 단계가 대상을 고른다)
  if (strong.length && !picked.some((p) => p.kind === "탐색")) picked.push(filler(strong[0]));
  for (const c of confirm.slice(picked.filter((p) => p.kind === "확인").length)) if (!full()) picked.push(c);
  const fillFrom = strong.length ? strong : weak;
  for (let k = 0; !full() && fillFrom.length; k++) picked.push(filler(fillFrom[k % fillFrom.length]));
  // 확인 칸을 앞에, 탐색 칸을 뒤에 둔다(화면에서 두 묶음으로 나뉜다).
  return [...picked.filter((p) => p.kind === "확인"), ...picked.filter((p) => p.kind === "탐색")].map((p, n) => ({ ...p, slot: n + 1 }));
}
