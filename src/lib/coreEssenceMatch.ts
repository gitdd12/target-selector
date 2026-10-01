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
- 코어는 "동작"(어떻게 하는가, HOW)과 "다루는 것의 모양"(어떤 형태의 대상·상황에 그 동작을 쓰는가) 두 가지로 이뤄집니다. 이 둘은 참가자의 구체적인 에피소드에서 이미 한 번 추상화된 **본질적 패턴**입니다 — 특정 상황의 세부사항이 아니라 반복되는 방식 자체로 읽으세요.
- "도메인 무관"은 **특정 산업·분야 이름에 안 묶인다**는 뜻일 뿐, **대상의 모양을 안 가린다**는 뜻이 아닙니다. 단, "모양"은 리터럴한 재질·분야(사람이냐 기계냐, 숫자냐 물건이냐)가 아니라 **구조적 패턴**(몇 개의 요소가 어떤 관계로 얽혀 있는가, 상태가 시간에 따라 변하는가, 이미 정해진 틀 안에서 움직이는가 등)으로 비교합니다. 예: "여러 상호의존적 요소를 조율해 전체 효율을 높인다"는 모양은 사람 조직 관리에도 공장 설비 최적화에도 똑같이 적용됩니다(재질은 달라도 구조가 같음). 반대로 재질이 같아 보여도(둘 다 숫자) 구조가 다르면(과거 재구성 vs 미래 예측) 다른 모양입니다. 본질 문장이 다루는 대상이 이 구조와 아예 안 맞으면(예: 코어의 모양이 "여러 개의 물리적 개체"인데 본질은 추상적 수치 분석뿐이면) 동작만 보고 점수를 주면 안 되고, 적용할 길이 없다는 뜻으로 낮게 봅니다.
- 직업의 본질은 그 직업이 왜 그 직업인지를 이루는 핵심 일(WHAT)입니다. **두 문장이 "닮았는지"(의미적 유사도)를 묻는 게 아닙니다** — "이 코어대로 행동하면 이 본질적인 일이 자연스럽게 따라 나오는가"(함의 관계)를 묻습니다. 표면 단어가 거의 안 겹쳐도 함의가 강하면 고득점이고(예: "정의와 관측을 캐묻는다"는 "기존 원리에서 새 원리를 이끌어낸다"와 단어는 안 겹쳐도 함의가 강함), 표면이 닮아도(같은 기법·같은 활동 단어) 함의가 약하면(지향이 반대, 목적이 다름) 저득점입니다. 유사도로 판단하면 틀립니다.
- 본질 문장에 실제로 적힌 동사만 근거로 삼습니다. 그 직업의 대중적 이미지·통념(예: "건축가는 손으로 짓는다", "셰프는 요리한다")에 기대지 마세요 — 주어진 문장이 설계·조율·관리를 말하면 그게 본질이고, 손으로 짓는 이미지는 무시합니다.
- 직업의 부수적 업무(행정, 소통 등 본질 문장에 안 들어간 것)는 고려하지 않습니다.

## 판정 절차
1. 코어의 동작(HOW)과 다루는 것의 모양(구조적 패턴, 리터럴 재질 아님)을 각각 추출한다. 본질 문장이 다루는 대상·상황이 그 구조와 아예 안 맞으면(예: 여러 상호작용 요소 vs 단일 추상 수치, 변화하는 상태 vs 고정된 사물) 동작이 비슷해 보여도 적용할 길이 없다는 뜻이니 5~15로 본다 — 리터럴 재질(사람/기계/숫자)만 다르고 구조가 같으면 이 게이트에 안 걸린다. 이 게이트에 걸린 경우 아래 2~7단계로 더 따질 필요 없다.
2. 본질 문장이 여러 개면, 이 직업이 "하나의 흐름(진단→수리처럼 한 사람이 순서대로 다 함)"인지 "사실상 독립적인 두 하위 역할(통역/번역처럼 다른 사람이 한쪽만 할 수도 있음)"을 한 SOC로 묶은 것인지 구분한다.
   - 한 흐름이면: 가장 잘 맞는 문장 하나를 기준으로 삼는다(평균 내지 않음).
   - 독립된 두 역할이면: 최선 매칭에 올라타지 말고 두 역할의 점수를 평균한 중간값을 쓴다(한쪽에만 맞는데 전체를 고점으로 주면 과장).
3. 반상관(anti-correlation) 확인: 본질 문장이 코어와 **같은 축에서 명시적으로 반대 방향**을 요구하는가(예: 본질은 "신속히"인데 코어는 "모든 위험을 다 점검하기 전엔 움직이지 않는다" — 속도축에서 정반대)? 그렇다면 피상적 겹침이 있어도 중간이 아니라 낮은 쪽(20~35)으로 깎는다. 단순 무관보다 나을 게 없거나 더 낮을 수 있다.
4. 입장/태도 충돌 확인: 기법(예: 협상·조율)은 겹치는데 그 기법을 쓰는 지향이 코어와 반대인가(중립 조정 vs 한쪽을 대리하는 변론처럼)? 둘을 구분한다.
   - **본질 문장 안에 코어와 지향이 일치하는 부분과 안 맞는 부분이 섞여 있을 뿐**이면(예: 소송은 경쟁 지향과 맞고 계약서 작성은 안 맞음) "본질 내부 분열"로 보고 45~65 구간.
   - **본질 문장 전체가 코어와 정반대 지향을 요구**하면(예: 코어는 중립 조정인데 본질은 한쪽만 대리하는 변론 그 자체) 기법 자체가 겹쳐도 30~45 구간으로 더 낮게 본다 — 지향이 반대면 기법 겹침은 장식일 뿐이다.
5. 방향성 확인: 같은 인지 동작(패턴 찾기, 신호 감지 등)이지만 시간/목적의 방향이 반대인가(미래 예측 vs 과거 재구성)? 그렇다면 45~65 구간으로 본다.
6. 수단/목적 확인: 코어가 이 본질을 이루는 유일한 경로인가? 두 가지를 구분한다.
   - **같은 목표를 이루는 여러 경로 중 하나일 뿐**이면(예: 이야기식 전달이든 반복훈련식이든 "학생의 이해를 돕는다"는 같은 목표를 이룸) 다른 충돌이 없어도 65점을 넘기지 않는다.
   - **활동 단어만 겹치고 그 활동이 섬기는 목표 자체가 코어가 신경 쓰는 것과 다르면**(예: "가르침"이 있지만 그 목표가 "사람의 성장"이 아니라 "시스템 도입 성공"일 때) 수단-중-하나보다 더 낮게, 20~40 구간으로 본다 — 목표가 다르면 수단의 겹침은 장식일 뿐이다.
7. 위 충돌이 전혀 없고 본질 문장이 코어를 거의 동어반복적으로 재진술하면 90~95, 코어가 본질의 주 메커니즘이되 부차 요소나 한 단계 더 나간 산출물이 섞여 있으면 70~88을 준다. 흔적이 거의 없으면 5~15, 약하게만 있으면 20~35.

## 밴드 요약
- 90~95: 본질 문장에서 직업 고유명사를 빼면 코어 설명과 거의 같다(동어반복).
- 70~88: 코어가 본질의 핵심 메커니즘 그 자체(단, 부차 요소·한 단계 더 나간 산출물 정도만 벗어남). 입장 충돌·반상관·방향 불일치 없음.
- 45~65: 본질 내부 분열(일부만 지향 불일치), 방향 불일치, "여러 경로 중 하나". 충돌 요소가 부차적이면 65쪽, 더 중심적이면 45쪽.
- 30~45: 본질 전체가 코어와 반대 지향을 요구(기법은 겹쳐도 지향이 정반대).
- 20~40: 활동 단어는 겹치지만 그 활동의 목표 자체가 코어와 다름(목적-수단 불일치).
- 20~35: 흔적이 약함, 또는 반상관(같은 축에서 명시적으로 반대 방향 요구)으로 깎인 경우.
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
