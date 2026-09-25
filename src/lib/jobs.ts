import fs from "node:fs";
import path from "node:path";
import { CORES, type Core, type JobCandidate } from "./types";

// 직업 추천 1~3단계(결정론적 코드): 백분위 환산 → 상위 필터 → gap 계산.
// 4~5단계(의미 판단·최종 선정)는 여기서 하지 않고 반드시 LLM이 한다(prompts/pipeline 참고).

interface Occ {
  code: string;
  title: string;
  scores: Record<Core, number>;
}

let occCache: Occ[] | null = null;
let mappingCache: string | null = null;

// 따옴표 안의 쉼표를 처리하는 한 줄 CSV 분해
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else q = !q;
    } else if (c === "," && !q) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out;
}

function loadOccs(): Occ[] {
  if (occCache) return occCache;
  const text = fs
    .readFileSync(path.join(process.cwd(), "data", "occ_core_scores_hybrid_v2.csv"), "utf8")
    .replace(/^﻿/, "");
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const header = splitCsvLine(lines[0]);
  const col = (name: string) => {
    const i = header.indexOf(name);
    if (i < 0) throw new Error(`occ CSV에 "${name}" 열이 없음`);
    return i;
  };
  const codeI = col("O*NET-SOC Code");
  const titleI = col("Title");
  const coreI = Object.fromEntries(CORES.map((c) => [c, col(c)])) as Record<Core, number>;
  occCache = lines.slice(1).map((l) => {
    const f = splitCsvLine(l);
    return {
      code: f[codeI],
      title: f[titleI],
      scores: Object.fromEntries(CORES.map((c) => [c, parseFloat(f[coreI[c]])])) as Record<Core, number>,
    };
  });
  return occCache;
}

/** GWA→코어 매핑 표(LLM에게 의미 판단용 참고자료로 준다). "찾기*"·"불명확" 행은 이번 계산에 안 쓰므로 뺀다. */
export function mappingTable(): string {
  if (mappingCache) return mappingCache;
  const text = fs.readFileSync(path.join(process.cwd(), "data", "hybrid_mapping_v2.csv"), "utf8");
  mappingCache = text
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.includes(",찾기*,") && !l.includes(",불명확,"))
    .join("\n");
  return mappingCache;
}

// 백분위: 전체 직업 중 이 점수 이하인 직업의 비율(동점은 평균 순위) × 100
function percentileMap(occs: Occ[], core: Core): number[] {
  const vals = occs.map((o) => o.scores[core]);
  const sorted = [...vals].sort((a, b) => a - b);
  const n = vals.length;
  return vals.map((v) => {
    let lo = 0;
    let hi = n;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (sorted[m] < v) lo = m + 1;
      else hi = m;
    }
    const below = lo;
    let up = lo;
    while (up < n && sorted[up] === v) up++;
    return ((below + (up - below) / 2) / n) * 100;
  });
}

const TARGET_MIN = 10; // 후보 하한. 이보다 적으면 기준을 낮춘다
const TARGET_MAX = 12; // 이보다 많으면 gap 순으로 자른다
const MAX_SENIOR = 3; // 관리자·감독자·임원급 후보는 이만큼까지만
const SENIOR_TITLE = /\b(Managers?|Supervisors?|Directors?|Executives?|Chiefs?|Administrators?|Presidents?)\b/;

/**
 * confirmed: 확정 코어(주 코어가 앞). 주 코어는 상위 기준을 유지하고 나머지는 더 느슨하게 본다.
 * 후보가 10개 안팎이 되도록 기준을 90퍼센타일에서 시작해 단계적으로 낮춘다(주 코어 하한 75).
 */
export function shortlist(confirmed: Core[]): JobCandidate[] {
  if (confirmed.length === 0) return [];
  const occs = loadOccs();
  const pct = Object.fromEntries(CORES.map((c) => [c, percentileMap(occs, c)])) as Record<Core, number[]>;
  const others = CORES.filter((c) => !confirmed.includes(c));

  const all: JobCandidate[] = occs.map((o, i) => {
    const percentiles = Object.fromEntries(CORES.map((c) => [c, pct[c][i]])) as Record<Core, number>;
    const confAvg = confirmed.reduce((s, c) => s + percentiles[c], 0) / confirmed.length;
    const otherAvg = others.length ? others.reduce((s, c) => s + percentiles[c], 0) / others.length : 0;
    return { code: o.code, title: o.title, percentiles, gap: confAvg - otherAvg };
  });

  let picked: JobCandidate[] = [];
  for (let primaryMin = 90; primaryMin >= 75; primaryMin -= 2.5) {
    const secondaryMin = primaryMin - 15; // 나머지 확정 코어는 더 느슨하게
    picked = all.filter((j) =>
      confirmed.every((c, idx) => j.percentiles[c] >= (idx === 0 ? primaryMin : secondaryMin)),
    );
    if (picked.length >= TARGET_MIN) break;
  }
  // 그래도 부족하면 확정 코어 평균 백분위가 높은 순으로 채운다
  if (picked.length < TARGET_MIN) {
    picked = [...all]
      .sort(
        (a, b) =>
          confirmed.reduce((s, c) => s + b.percentiles[c], 0) - confirmed.reduce((s, c) => s + a.percentiles[c], 0),
      )
      .slice(0, TARGET_MIN);
  }
  // gap이 큰 것(확정 코어만 유독 튀는 직업)을 우선, 낮은 것("고스펙이면 다 높은" 직업)은 후순위
  picked.sort((a, b) => b.gap - a.gap);
  // 관리자·감독자·임원급은 후보에 적당히만 남긴다(경력 없이 시작하기 어려운 자리가 결과지를 채우지 않게). 모자라면 다음 순위의 다른 직업으로 채운다.
  const out: JobCandidate[] = [];
  let senior = 0;
  for (const j of picked) {
    if (SENIOR_TITLE.test(j.title)) {
      if (senior >= MAX_SENIOR) continue;
      senior += 1;
    }
    out.push(j);
  }
  if (out.length < TARGET_MIN) {
    const have = new Set(out.map((j) => j.code));
    const rest = all
      .filter((j) => !have.has(j.code) && !SENIOR_TITLE.test(j.title))
      .sort((a, b) => confirmed.reduce((s, c) => s + b.percentiles[c], 0) - confirmed.reduce((s, c) => s + a.percentiles[c], 0));
    out.push(...rest.slice(0, TARGET_MIN - out.length));
  }
  return out.slice(0, TARGET_MAX);
}
