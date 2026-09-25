import fs from "node:fs";
import path from "node:path";

// 직업별 실제 업무 문장(O*NET Task Ratings에서 중요도 순으로 상위 8개만 뽑아 data/onet_tasks.json 으로 만들어 둠, 영어 원문).
// 직업 카드의 "실제 하는 일"과 "연결되는 부분"이 AI의 기억이 아니라 이 목록에 근거하게 한다.
let cache: Record<string, string[]> | null = null;

export function topTasks(code: string, n = 6): string[] {
  if (!cache) {
    try {
      cache = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "onet_tasks.json"), "utf8"));
    } catch {
      cache = {};
    }
  }
  return (cache?.[code] ?? []).slice(0, n);
}
