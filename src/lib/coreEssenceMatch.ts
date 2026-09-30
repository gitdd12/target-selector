// 코어×직업 "본질 유사도" 매칭(재설계, docs/직업매칭_본질기반_재설계_2026-09-30.md 참고).
// 업무 문장 커버리지 대신, 코어(행동 방식, HOW)를 직업의 본질(1~3문장, data/onet31/occupation_essence.json)과
// 직접 비교해 유사도를 판정한다. 아직 "코어" 축만 다룬다 — 대상·가치관 반영은 다음 단계.
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { callJson, cached } from "./llm";
import type { Behavior, Session } from "./types";

export interface OccupationEssence {
  soc: string;
  name: string;
  essences: { text: string; grounded_in: string[] }[];
  confidence: "high" | "medium" | "low";
}

export interface CoreEssenceMatch {
  soc: string;
  name: string;
  match: number; // 0~95
  reasoning: string;
}

const BATCH_SIZE = 40;
const CONCURRENCY = 4;

let essenceData: OccupationEssence[] | null = null;
function loadEssences(): OccupationEssence[] {
  if (!essenceData) {
    const p = path.join(process.cwd(), "data", "onet31", "occupation_essence.json");
    essenceData = JSON.parse(fs.readFileSync(p, "utf8")) as OccupationEssence[];
  }
  return essenceData;
}

const MatchSchema = z.object({
  items: z.array(
    z.object({
      n: z.number().int().describe("판정할 직업 번호"),
      match: z.number().int().min(0).max(95).describe("코어와 이 직업 본질의 유사도(0~95, 100은 과장이라 안 씀)"),
      reasoning: z.string().describe("왜 이 점수인지 한 문장"),
    }),
  ),
});

const MATCH_RULES = `당신은 "코어 찾기"의 코어-직업 유사도 판정 담당입니다. 참가자의 코어(행동 방식, HOW)를 받아, 주어진 직업들의 본질과 얼마나 닮았는지 판정합니다.

## 판정 기준
- 코어는 도메인에 무관한 접근 방식(HOW)이고, 직업의 본질은 그 직업이 왜 그 직업인지를 이루는 핵심 일(WHAT, 때로는 그 일을 하는 방식)입니다. 같은 코어라도 그 방식이 본질적으로 통하는 일과 안 통하는 일이 갈립니다.
- "이 코어를 가진 사람이 이 직업의 본질적인 일을 할 때, 얼마나 자연스럽게 그 방식대로 하게 되는가"를 기준으로 판정합니다. 직업의 부수적 업무(행정, 소통, 관리 등 본질에 안 들어간 것)는 고려하지 않습니다 — 주어진 본질 문장만 봅니다.
- 직업에 본질 문장이 여러 개면 그중 가장 잘 맞는 것을 기준으로 판정합니다(다 더하거나 평균 내지 않습니다).
- match는 정수 0~95(100은 "완벽히 맞는다"로 읽혀 과장이므로 쓰지 않습니다). 전혀 안 맞으면 0에 가깝게, 방식 자체가 동어반복 수준으로 겹치면 95에 가깝게.
- reasoning은 한 문장으로, 왜 그 점수인지(또는 왜 안 맞는지) 씁니다. 점수를 후하게도 박하게도 주지 말고 기준대로만 줍니다.

## 출력
- 주어진 모든 직업에 대해 판정합니다(건너뛰지 않습니다).`;

function behaviorBlock(b: Behavior): string {
  return `## 이 사람의 코어(행동 방식)\n- 동작: ${b.action}\n- 다루는 것의 모양: ${b.shape}\n- 영어로: ${b.en}`;
}

function batchUser(b: Behavior, occs: OccupationEssence[]): string {
  const list = occs
    .map((o, i) => `${i + 1}. [${o.name}] 본질: ${o.essences.map((e) => e.text).join(" / ")}`)
    .join("\n");
  return `${behaviorBlock(b)}\n\n## 판정할 직업들\n${list}\n\n각 직업에 match(0~95)와 reasoning을 매기세요.`;
}

async function pool<T>(items: T[], limit: number, fn: (x: T) => Promise<void>) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) await fn(items[next++]);
    }),
  );
}

/** 코어 하나를 직업 916개 전체의 본질과 비교해 유사도 순으로 정렬한 목록을 돌려준다. */
export async function matchCoreToEssences(behavior: Behavior, s?: Session): Promise<CoreEssenceMatch[]> {
  const all = loadEssences();
  const batches: OccupationEssence[][] = [];
  for (let i = 0; i < all.length; i += BATCH_SIZE) batches.push(all.slice(i, i + BATCH_SIZE));

  const results: CoreEssenceMatch[] = [];
  await pool(batches, CONCURRENCY, async (batch) => {
    const out = await callJson("jobs", MatchSchema, [cached(MATCH_RULES)], batchUser(behavior, batch), s);
    for (const it of out.items) {
      const occ = batch[it.n - 1];
      if (!occ) continue;
      results.push({ soc: occ.soc, name: occ.name, match: it.match, reasoning: it.reasoning });
    }
  });

  return results.sort((a, b) => b.match - a.match);
}
