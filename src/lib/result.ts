import type { CelebDraft, LegacyReport, LegacyReportCore, Report, Session } from "./types";

// 예전에 저장된 세션(가치관·대상이 한 덩어리 글이던 형식)도 새 결과지 화면에서 읽을 수 있도록 맞춰 준다.
type Legacy = { values_and_tendencies?: string; objects_note?: string };

export function getValues(r: Report): Report["values"] {
  if (r.values) return r.values;
  const old = (r as unknown as Legacy).values_and_tendencies ?? "";
  return { short: "", summary: "", important: "", hard: "", alive: old, stuck: "" };
}

// 예전 결과지(v0.26까지)의 "대상" 칸. 새 결과지에는 없다(대상 안내는 직업 목록 맨 위 한 줄로 옮겼다).
export function getObject(r: Report): { label: string; note: string } | null {
  const l = r as unknown as LegacyReport & Legacy;
  if (l.object) return l.object;
  if (l.objects_note) return { label: "", note: l.objects_note };
  return null;
}

// 예전 결과지 코어에만 있던 칸(내부 태그, 직무와 연결하면)
export const legacyCore = (c: Report["cores"][number]) => c as Report["cores"][number] & LegacyReportCore;

// 예전 결과지의 직접 해 보기 공통 이유(새 결과지는 고정 문구)
export const legacyCommonWhy = (r: Report) => (r.explore as LegacyReport["explore"])?.common_why ?? "";

/** 번역문 속 [[ ]] 표시를 굵은 부분으로 나눈다. 표시가 정확히 한 쌍이 아니면 표시만 지우고 굵게 없이 쓴다. */
export function splitBold(text: string): { text: string; bold: boolean }[] {
  const m = /^([^[\]]*)\[\[([^[\]]+)\]\]([^[\]]*)$/.exec(text);
  if (!m) return [{ text: text.replace(/\[\[|\]\]/g, ""), bold: false }];
  return [
    { text: m[1], bold: false },
    { text: m[2], bold: true },
    { text: m[3], bold: false },
  ].filter((p) => p.text);
}

// 코어 행동 문장. 예전 세션에는 behavior가 없고 이름 문구(pattern_phrase)만 있어서 그것으로 대신한다.
export function coreBehavior(c: Report["cores"][number]): string {
  return c.behavior || (c as unknown as { pattern_phrase?: string }).pattern_phrase || "";
}

// 경험처럼 줄바꿈으로 나뉜 글을 줄 목록으로. 줄바꿈이 없으면 한 덩어리 그대로.
export function toLines(text: string): string[] {
  return text.split(/\n+/).map((x) => x.trim()).filter(Boolean);
}

type Candidate = CelebDraft["candidates"][number];
type OldCandidate = { documented_scene?: string; strength?: string; cost?: string };

export function getScenes(c: Candidate): Candidate["scenes"] {
  if (c.scenes?.length) return c.scenes;
  const o = c as unknown as OldCandidate;
  return o.documented_scene ? [{ title: "장면", scene: o.documented_scene, strength: o.strength ?? "", cost: o.cost ?? "" }] : [];
}

// 참가자에게 보여줄 인물 사례: 운영자가 승인한 것만
export function approvedPeople(s: Session): Candidate[] {
  const list = s.celebDraft?.candidates ?? [];
  return (s.approvedCelebs ?? []).map((i) => list[i]).filter((c): c is Candidate => Boolean(c));
}

// 예전 결과지(v0.26까지)의 "대상" 칸 문구. 새 결과지에는 대상 칸이 없어 예전 세션을 보여줄 때만 쓴다.
export function objectNoteParts(s: Session) {
  const picked = s.targets?.survivors.map((t) => t.name) ?? [];
  const label = s.report ? (getObject(s.report)?.label ?? "") : "";
  return {
    title: "대상은 지금 확정하지 않아요.",
    picked: picked.length
      ? { label: "처음에 고르신 대상", value: picked.join(" / "), note: "15개 중에서 빠르게 고른 것이라, 흥미를 짐작해 본 정도예요." }
      : null,
    observed: label
      ? { label: "두 경험에서 드러난 대상", value: label, note: "실제로 하신 일에서 나왔지만, 경험이 두 개뿐이에요." }
      : null,
    outro: "대상은 환경과 여건에 따라 계속 바뀌어요. 그래서 이 결과지는 코어와 가치관을 중심으로 보여드려요.",
  };
}

// 공식 칸에 보여줄 대상 이름을 "본 이름"과 괄호 설명으로 나눈다. 예: "재료 (음식, 나무)" → ["재료", "(음식, 나무)"]
export function splitTarget(name: string): [string, string] {
  const m = /^(.*?)\s*(\(.*\))$/.exec(name);
  return m ? [m[1], m[2]] : [name, ""];
}
