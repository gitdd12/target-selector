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
      reasoning: z.string().describe("왜 이 점수인지 한 문장(근거로 쓴 본질 문장 구절 포함)"),
    }),
  ),
});

// 밴드·절차는 ~63건 교차검증(수동 10코어 + 서브에이전트 2세트 24건씩)으로 도출.
// docs/직업매칭_본질기반_재설계_2026-09-30.md §16-17 참고.
const MATCH_RULES = `당신은 "코어 찾기"의 코어-직업 유사도 판정 담당입니다. 참가자의 코어(행동 방식, HOW)를 받아, 주어진 직업들의 본질과 얼마나 닮았는지 판정합니다.

## 핵심 원칙
- 코어는 도메인에 무관한 접근 방식(HOW)이고, 직업의 본질은 그 직업이 왜 그 직업인지를 이루는 핵심 일(WHAT)입니다. "이 코어를 가진 사람이 이 직업의 본질적인 일을 할 때, 얼마나 자연스럽게 그 방식대로 하게 되는가"가 기준입니다.
- 본질 문장에 실제로 적힌 동사만 근거로 삼습니다. 그 직업의 대중적 이미지·통념(예: "건축가는 손으로 짓는다", "셰프는 요리한다")에 기대지 마세요 — 주어진 문장이 설계·조율·관리를 말하면 그게 본질이고, 손으로 짓는 이미지는 무시합니다.
- 직업의 부수적 업무(행정, 소통 등 본질 문장에 안 들어간 것)는 고려하지 않습니다.

## 판정 절차
1. 코어의 메커니즘(HOW)을 한 구절로 추출한다.
2. 본질 문장이 여러 개면, 이 직업이 "하나의 흐름(진단→수리처럼 한 사람이 순서대로 다 함)"인지 "사실상 독립적인 두 하위 역할(통역/번역처럼 다른 사람이 한쪽만 할 수도 있음)"을 한 SOC로 묶은 것인지 구분한다.
   - 한 흐름이면: 가장 잘 맞는 문장 하나를 기준으로 삼는다(평균 내지 않음).
   - 독립된 두 역할이면: 최선 매칭에 올라타지 말고 두 역할의 점수를 평균한 중간값을 쓴다(한쪽에만 맞는데 전체를 고점으로 주면 과장).
3. 반상관(anti-correlation) 확인: 본질 문장이 코어와 **같은 축에서 명시적으로 반대 방향**을 요구하는가(예: 본질은 "신속히"인데 코어는 "모든 위험을 다 점검하기 전엔 움직이지 않는다" — 속도축에서 정반대)? 그렇다면 피상적 겹침이 있어도 중간이 아니라 낮은 쪽(20~35)으로 깎는다. 단순 무관보다 나을 게 없거나 더 낮을 수 있다.
4. 입장/태도 충돌 확인: 기법(예: 협상·조율)은 겹치는데 그 기법을 쓰는 지향이 코어와 반대인가(중립 조정 vs 한쪽을 대리하는 변론처럼)? 그렇다면 75점대가 아니라 45~65 구간으로 본다.
5. 방향성 확인: 같은 인지 동작(패턴 찾기, 신호 감지 등)이지만 시간/목적의 방향이 반대인가(미래 예측 vs 과거 재구성)? 그렇다면 45~65 구간으로 본다.
6. 수단 확인: 코어가 이 본질을 이루는 유일한 경로인가, 아니면 다른 접근으로도 똑같이 본질을 만족시킬 수 있는 "여러 경로 중 하나"일 뿐인가? 후자라면 다른 충돌이 없어도 65점을 넘기지 않는다.
7. 위 충돌이 전혀 없고 본질 문장이 코어를 거의 동어반복적으로 재진술하면 90~95, 코어가 본질의 주 메커니즘이되 부차 요소나 한 단계 더 나간 산출물이 섞여 있으면 70~88을 준다. 흔적이 거의 없으면 5~15, 약하게만 있으면 20~35.

## 밴드 요약
- 90~95: 본질 문장에서 직업 고유명사를 빼면 코어 설명과 거의 같다(동어반복).
- 70~88: 코어가 본질의 핵심 메커니즘 그 자체(단, 부차 요소·한 단계 더 나간 산출물 정도만 벗어남). 입장 충돌·반상관·방향 불일치 없음.
- 45~65: 3~6단계 중 하나 이상 해당(입장 충돌, 본질 내부 분열, 방향 불일치, "여러 경로 중 하나"). 충돌 요소가 부차적이면 65쪽, 더 중심적이면 45쪽.
- 20~35: 흔적이 약하거나, 반상관으로 깎인 경우.
- 5~15: 완전 무관.

## 출력
- 주어진 모든 직업에 대해 판정합니다(건너뛰지 않습니다). reasoning에는 근거로 쓴 본질 문장의 핵심 구절을 짧게 인용합니다.`;

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
