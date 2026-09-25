import { approvedPeople, coreBehavior, getObject, getScenes, getValues, objectNoteParts, toLines } from "./result";
import { ENDING, FIXED_ACTIONS, OBSERVE } from "./frame";
import { SITUATION_SHORT, type Session } from "./types";

// 이메일 본문에 붙여넣기 좋은 결과지 글(참가자에게 갈 내용만). 링크가 있으면 맨 위에 둔다.
export function reportToText(s: Session, link?: string): string {
  const r = s.report;
  if (!r) return "";
  const v = getValues(r);
  const o = getObject(r);
  const parts: string[] = [];
  if (link) parts.push(`결과지는 여기에서 볼 수 있어요\n${link}`);
  if (r.hold_note) parts.push(r.hold_note);
  if (r.cores.length > 0) {
    parts.push(`가치관 × 코어 × 대상\n${[v.short || v.summary, r.cores.map(coreBehavior).join(" / "), s.targets?.survivors.map((t) => t.name).join(", ") || o.label].filter(Boolean).join(" × ")}`);
  }
  r.cores.forEach((c, i) => {
    const rel = s.reliability?.[i];
    parts.push(
      `■ 코어: ${coreBehavior(c)}${rel ? `\n신뢰도 ${rel.grade} (${rel.met.map((m, qi) => m + (rel.quotes?.[qi] ? ` — “${rel.quotes[qi]}”` : "")).join(", ")})` : ""}`,
      `[경험]\n${toLines(c.restatement).map((x) => `- ${x}`).join("\n")}`,
      `[파악한 코어]\n${c.pattern}`,
      ...(c.bridge
        ? [
            `[직무와 연결하면]\n- 쓰일 수 있는 일: ${c.bridge.usable}\n- 아직 모르는 것: ${c.bridge.unknown}`,
          ]
        : []),
      ...(c.cost_note ? [`[이 방식이 힘들어질 때]\n${c.cost_note}`] : []),
    );
  });
  const vparts: [string, string][] = [
    ["중요하게 여기는 것", v.important],
    ["못 견디는 것", [v.hard, v.stuck].filter(Boolean).join(" ")],
    ["코어와 만나면 살아나는 곳", v.alive],
  ];
  if (v.summary || vparts.some(([, t]) => t)) {
    parts.push(`[가치관]\n${[v.summary, ...vparts.filter(([, t]) => t).map(([l, t]) => `- ${l}: ${t}`)].filter(Boolean).join("\n")}`);
  }
  if (r.cores.length > 0) {
    const n = objectNoteParts(s);
    const boxes = [n.picked, n.observed].filter((x): x is NonNullable<typeof x> => Boolean(x)).map((x) => `${x.label}: ${x.value}\n${x.note}`);
    parts.push(`[대상] ${n.title}\n${boxes.join("\n\n")}\n${n.outro}`);
  }
  if (s.jobPick?.picks.length) {
    parts.push(
      `[어울리는 직업] (직업 정보는 미국 노동부(USDOL/ETA)의 O*NET 데이터베이스를 바탕으로 했어요.)\n${s.jobPick.picks
        .map((j) => `- ${j.title_ko}${j.tasks?.length ? `\n  · 실제 하는 일: ${j.tasks.join(" / ")}` : ""}\n  · 연결되는 부분: ${j.why}${j.unknown ? `\n  · 아직 확인 안 된 부분: ${j.unknown}` : ""}${j.scene_question ? `\n  · 떠올려 볼 장면: ${j.scene_question}` : ""}`)
        .join("\n")}`,
    );
    const nq = s.jobPick.next_question;
    if (nq?.choices.length) parts.push(`[질문] ${nq.question}\n${nq.choices.map((c) => `- ${c.when} → ${c.meaning}`).join("\n")}`);
  }
  for (const c of approvedPeople(s)) {
    parts.push(
      `[닮은 사람] ${c.name} · ${c.field_and_era}\n${c.why_similar ?? ""}\n` +
        getScenes(c)
          .map((sc) => `- ${sc.title}: ${sc.scene}${sc.strength ? ` (강점: ${sc.strength})` : ""}${sc.cost ? ` (문제점: ${sc.cost})` : ""}`)
          .join("\n") +
        (c.source_hint ? `\n출처: ${c.source_hint}` : ""),
    );
  }
  if (r.cores.length > 0 && s.situation) {
    const fixed = s.situation === "working" || s.situation === "applying" ? FIXED_ACTIONS[s.situation] : null;
    const body = fixed
      ? `${fixed.todo}\n이유 : ${fixed.why}`
      : `${r.explore?.common_why ? `공통 이유 : ${r.explore.common_why}\n` : ""}마음에 드는 하나만 해도 돼요.\n${(r.explore?.items ?? []).map((it, i) => `${i + 1}. ${it.title}\n   ${it.do}\n   이유 : ${it.why}`).join("\n")}`;
    parts.push(`[직접 해 보기] ‘${SITUATION_SHORT[s.situation]}’으로 선택하셔서 아래와 같이 준비했어요.\n${body}`);
  }
  if (r.cores.length > 0) parts.push(`[기록해 보기]\n${OBSERVE.lead}\n${OBSERVE.items.map((x) => `- ${x}`).join("\n")}\n${OBSERVE.closing}`);
  if (r.cores.length > 0) parts.push(`${ENDING.lines.join("\n")}\n${ENDING.strong}\n${ENDING.last.join(" ")}`);
  if (s.jobPick?.picks.length) parts.push(
      "직업 정보에는 미국 노동부 고용훈련청(USDOL/ETA)의 O*NET 데이터베이스가 쓰였고, CC BY 4.0 라이선스(https://creativecommons.org/licenses/by/4.0/)로 사용했어요. 코어 찾기가 한국어로 옮기고 골랐으며, 미국 노동부가 이 내용을 승인하거나 검증하거나 시험한 것이 아니에요.\nThis page includes information from the O*NET Database by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA). Used under the CC BY 4.0 license. 코어 찾기 has modified all or some of this information. USDOL/ETA has not approved, endorsed, or tested these modifications. O*NET® is a trademark of USDOL/ETA.",
    );
  return parts.join("\n\n");
}

// 비용 추정(달러). 단가는 Opus 5 기준 가격표(입력 $5, 출력 $25 / 100만 토큰, 캐시 쓰기 1시간형 2배, 캐시 읽기 0.1배)이며 콘솔의 실제 청구와 다를 수 있다.
export function estimateCost(u: Session["usage"] | undefined): number {
  if (!u) return 0;
  return (u.input * 5 + u.cacheWrite * 10 + u.cacheRead * 0.5 + u.output * 25) / 1_000_000;
}
