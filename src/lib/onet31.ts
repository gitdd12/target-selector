// O*NET 31.0 데이터(data/onet31)를 읽어 직업 점수 계산에 쓰는 형태로 묶는다.
// 업무 문장 하나가 여러 직업에 복사돼 있을 수 있어서(예: 대학 교수 34개 직업), 판정은 문장 단위로 하고
// 직업으로 바꿀 때 그 문장을 가진 모든 직업에 반영한다(docs/직업추천_재설계 1-2).
import fs from "node:fs";
import path from "node:path";

export interface OnetTask {
  soc: string;
  text: string;
  // 업무 무게(결과지 v0.28): 중요도 × 수행 비율 × 빈도. 직무 분석에서 업무의 결정성(criticality)을 매기는 방식을 따른다.
  // 중요도만 쓰면 대부분 3.5~4.7점이라 핵심 업무와 곁다리 업무가 거의 같은 무게가 된다(2026-09-27).
  // 평가가 없는 업무는 0으로 친다.
  w: number;
}

/** 업무 무게 = 중요도(O*NET 0~100 방식, (점수−1)÷4) × 수행 비율(종사자 중 이 업무를 하는 비율) × 빈도(7단계 응답 평균을 0~1로). */
export function taskWeight(t: { im: number | null; rt: number | null; ft: number[] | null }): number {
  if (t.im == null || t.rt == null || !t.ft) return 0;
  const n = t.ft.reduce((a, b) => a + b, 0);
  if (!n) return 0;
  const freq = (t.ft.reduce((a, p, i) => a + p * (i + 1), 0) / n - 1) / 6;
  return ((t.im - 1) / 4) * (t.rt / 100) * freq;
}

export interface Onet {
  // 문장 → 그 문장을 가진 업무들(직업마다 하나)
  byText: Map<string, OnetTask[]>;
  // 직업 → 그 직업의 업무 문장들(중복 없이)
  textsBySoc: Map<string, string[]>;
  // 직업 → 전체 업무 무게 합(직업 점수의 분모)
  wTotal: Map<string, number>;
  // 추천에서 빼는 직업(종교·장례 8개)
  excluded: Set<string>;
  // 한국어 이름·한 줄 설명
  ko: Record<string, { name: string; desc: string }>;
}

let cache: Onet | null = null;

export function onet(): Onet {
  if (cache) return cache;
  const dir = path.join(process.cwd(), "data", "onet31");
  const read = (f: string) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  const tasks = read("tasks.json") as { soc: string; text: string; im: number | null; rt: number | null; ft: number[] | null }[];
  const byText = new Map<string, OnetTask[]>();
  const textsBySoc = new Map<string, string[]>();
  const wTotal = new Map<string, number>();
  for (const t of tasks) {
    const task = { soc: t.soc, text: t.text, w: taskWeight(t) };
    (byText.get(t.text) ?? byText.set(t.text, []).get(t.text)!).push(task);
    const list = textsBySoc.get(t.soc) ?? textsBySoc.set(t.soc, []).get(t.soc)!;
    if (!list.includes(t.text)) list.push(t.text);
    wTotal.set(t.soc, (wTotal.get(t.soc) ?? 0) + task.w);
  }
  const ex = read("excluded_occupations.json") as Record<string, unknown>;
  const excluded = new Set<string>();
  for (const [k, v] of Object.entries(ex)) if (!k.startsWith("_") && v && typeof v === "object") Object.keys(v).forEach((c) => excluded.add(c));
  cache = { byText, textsBySoc, wTotal, excluded, ko: read("occupations_ko.json") };
  return cache;
}
