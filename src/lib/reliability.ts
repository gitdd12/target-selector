import type { Session } from "./types";

// 신뢰도 기준(스펙 "확정의 실제 조건"의 무게 신호 네 가지): 두 개 이상 충족하면 확정이고, 그 개수로 등급을 나눈다.
//   2개 = 중, 3개 = 상, 4개 = 최상
// 신호 문구는 참가자에게 그대로 보인다.
export const SIGNAL_LABEL = {
  extra_effort: "요구된 것보다 더 들인 수고",
  repeated: "다른 때에도 같은 방식으로 되풀이함",
  fulfillment_on_action: "과정이나 결과물 자체에서 얻은 만족",
  self_chosen: "방법·순서·범위를 스스로 정함",
} as const;
export type SignalKey = keyof typeof SIGNAL_LABEL;

export type Reliability = NonNullable<Session["reliability"]>[number];

export function gradeOf(n: number): Reliability["grade"] {
  return n >= 4 ? "최상" : n === 3 ? "상" : "중";
}

// 근거 문장: 기록에 적힌 근거에서 참가자가 실제로 한 말(따옴표 안)만 짧게 뽑는다. 없으면 빈 문자열.
export function evidenceQuote(evidence: string | undefined): string {
  if (!evidence) return "";
  const m = /["'\u201C\u2018]([^"'\u201D\u2019]{6,80})["'\u201D\u2019]/.exec(evidence);
  if (!m) return "";
  const q = m[1].replace(/^네,\s*/, "").replace(/\.\.\.$/, "").trim();
  return q.length > 46 ? q.slice(0, 44).replace(/\s+\S*$/, "").trim() + "…" : q;
}

// 코어 판정의 근거 경험(basis_experiences)에서 충족된 무게 신호를 모아 코어별 신뢰도를 만든다.
// 근거 경험이 여러 개면 각 경험에서 충족된 신호를 합쳐서 센다.
export function computeReliability(s: Session): Reliability[] {
  const finals = s.final?.cores ?? [];
  // 결과지 코어는 코어 판정과 같은 순서로 쓴다(예전 세션은 코어 이름 태그로 맞춘다).
  return (s.report?.cores ?? []).map((rc, i) => {
    const tag = (rc as { core?: string }).core;
    const f = tag ? finals.find((x) => (x as { core?: string }).core === tag) : finals[i];
    const found = new Map<SignalKey, string>();
    for (const n of f?.basis_experiences ?? []) {
      const rec = n === 1 ? s.records.exp1 : n === 2 ? s.records.exp2 : n === 3 ? s.records.exp3 : undefined;
      for (const k of Object.keys(SIGNAL_LABEL) as SignalKey[]) {
        if (found.has(k)) continue;
        if (k === "self_chosen") {
          if (rec?.self_chosen_evidence?.result === "확인됨") found.set(k, evidenceQuote(rec.self_chosen_evidence.reasoning));
          continue;
        }
        const sig = rec?.weight_signals?.[k];
        if (sig?.present) found.set(k, evidenceQuote(sig.evidence));
      }
    }
    const keys = [...found.keys()];
    return { grade: gradeOf(keys.length), met: keys.map((k) => SIGNAL_LABEL[k]), quotes: keys.map((k) => found.get(k) ?? "") };
  });
}
