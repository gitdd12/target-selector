// O*NET 31.0 데이터(data/onet31)를 읽어 직업 점수 계산에 쓰는 형태로 묶는다.
// 업무 문장 하나가 여러 직업에 복사돼 있을 수 있어서(예: 대학 교수 34개 직업), 판정은 문장 단위로 하고
// 직업으로 바꿀 때 그 문장을 가진 모든 직업에 반영한다(docs/직업추천_재설계 1-2).
import fs from "node:fs";
import path from "node:path";

export interface OnetTask {
  soc: string;
  text: string;
  im: number; // 중요도(1~5). 평가가 없는 업무는 0으로 친다
}

export interface Onet {
  // 문장 → 그 문장을 가진 업무들(직업마다 하나)
  byText: Map<string, OnetTask[]>;
  // 직업 → 그 직업의 업무 문장들(중복 없이)
  textsBySoc: Map<string, string[]>;
  // 직업 → 전체 업무 중요도 합(직업 점수의 분모)
  imTotal: Map<string, number>;
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
  const tasks = read("tasks.json") as { soc: string; text: string; im: number | null }[];
  const byText = new Map<string, OnetTask[]>();
  const textsBySoc = new Map<string, string[]>();
  const imTotal = new Map<string, number>();
  for (const t of tasks) {
    const task = { soc: t.soc, text: t.text, im: t.im ?? 0 };
    (byText.get(t.text) ?? byText.set(t.text, []).get(t.text)!).push(task);
    const list = textsBySoc.get(t.soc) ?? textsBySoc.set(t.soc, []).get(t.soc)!;
    if (!list.includes(t.text)) list.push(t.text);
    imTotal.set(t.soc, (imTotal.get(t.soc) ?? 0) + task.im);
  }
  const ex = read("excluded_occupations.json") as Record<string, unknown>;
  const excluded = new Set<string>();
  for (const [k, v] of Object.entries(ex)) if (!k.startsWith("_") && v && typeof v === "object") Object.keys(v).forEach((c) => excluded.add(c));
  cache = { byText, textsBySoc, imTotal, excluded, ko: read("occupations_ko.json") };
  return cache;
}
