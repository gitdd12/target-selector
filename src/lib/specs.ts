import fs from "node:fs";
import path from "node:path";
import { isExpWindow, type WindowKind } from "./types";

// 스펙 문서(질문흐름, 결과지_작성_기준)는 specs 폴더의 원문 그대로 두고,
// 실행 중에 제목 단위로 잘라서 역할별 프롬프트로 조립한다.
// 스펙이 바뀌면 specs 폴더의 파일만 새 버전으로 바꾸면 된다(파일명에 vX.X 포함).

const SPEC_DIR = path.join(process.cwd(), "specs");

// 다른 참가자의 실명이 프롬프트에 들어가면 결과지에 새어 나올 수 있어서 익명 처리한다.
const anonymize = (s: string) => s.replace(/영훈|박종경/g, "한 참가자");

interface Spec {
  version: string;
  preamble: string;
  sections: { heading: string; body: string }[];
}

// 파일명 속 버전(v0.9, v0.10 …)을 숫자로 비교해서 가장 높은 버전을 고른다(글자 순서로 비교하면 v0.9 > v0.10이 된다).
const versionKey = (f: string) => (/v(\d+)\.(\d+)/.exec(f)?.slice(1).map(Number) ?? [0, 0]) as [number, number];

function findSpecFile(prefix: string): string {
  const files = fs
    .readdirSync(SPEC_DIR)
    .filter((f) => f.startsWith(prefix) && f.endsWith(".md"))
    .sort((a, b) => {
      const [a1, a2] = versionKey(a);
      const [b1, b2] = versionKey(b);
      return a1 - b1 || a2 - b2;
    });
  if (files.length === 0) throw new Error(`스펙 파일을 찾을 수 없음: ${prefix}*.md`);
  return path.join(SPEC_DIR, files[files.length - 1]);
}

function parseSpec(file: string): Spec {
  const text = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  const version = /현재 버전 (v[\d.]+)/.exec(text)?.[1] ?? "unknown";
  const parts = text.split(/^(?=### )/m);
  const preamble = parts[0];
  const sections = parts.slice(1).map((p) => {
    const nl = p.indexOf("\n");
    return { heading: p.slice(4, nl).trim(), body: p };
  });
  return { version, preamble, sections };
}

let cache: { q: Spec; r: Spec } | null = null;
function load() {
  if (!cache) {
    cache = {
      q: parseSpec(findSpecFile("질문흐름_")),
      r: parseSpec(findSpecFile("결과지_작성_기준_")),
    };
  }
  return cache;
}

// 제목이 조금 바뀌어도 앞부분이 같으면 찾는다. 못 찾으면 조용히 빠뜨리지 않고 바로 에러를 낸다.
function section(spec: Spec, prefix: string): string {
  const s = spec.sections.find((x) => x.heading.startsWith(prefix));
  if (!s) throw new Error(`스펙에서 "${prefix}" 섹션을 찾을 수 없음 (${spec.version})`);
  return s.body.trim();
}

export function specVersions() {
  const { q, r } = load();
  return { interview: q.version, result: r.version };
}

const join = (...parts: string[]) => anonymize(parts.join("\n\n---\n\n"));

// ── 역할별 조립 ──────────────────────────────────────────────

// 인터뷰어에게는 스펙을 붙이지 않는다(질문흐름 v0.34). 인터뷰어 지시문은 prompts.ts에 있고, 그 이유는 스펙 "받아야 할 정보와 묻는 원칙"에 있다.

/** 기록 정리자. 경험 창은 기록 필드 + 확정 판단 기준, 가치관 창은 기록 필드 + 가치관 섹션. */
export function recorderSpec(kind: WindowKind): string {
  const { q } = load();
  const fields = section(q, "기록 필드");
  if (isExpWindow(kind)) {
    return join(
      fields,
      section(q, "표현을 곧이곧대로 받지 않는 원칙"),
      section(q, "코어와 혼동하기 쉬운 것"),
      section(q, "행동 설명을 쓰는 법"),
      section(q, "경험 사이의 반복과 확정 조건"),
    );
  }
  return join(fields, section(q, "가치관·성향을 파악하는 질문"));
}

/** 코어 판정자(4개 창이 모두 끝난 뒤). */
export function judgeSpec(): string {
  const { q, r } = load();
  return join(
    section(q, "기록 필드"),
    section(q, "코어와 혼동하기 쉬운 것"),
    section(q, "행동 설명을 쓰는 법"),
    section(q, "경험 사이의 반복과 확정 조건"),
    section(q, "결과 확인과 종료"),
    section(r, "결과지가 반드시 지켜야 할 구조"),
  );
}

/**
 * 형식 예시(스펙의 실제 적용 사례)에서 결과지 본문에 나오면 안 되는 줄(예전 방식의 직업 줄)을 걷어낸다.
 * 스펙 원문은 그대로 두고, 프롬프트에 넣을 때만 정리한다(AI가 따라 쓰지 않도록).
 */
function cleanExample(body: string): string {
  return body
    .split("\n")
    .filter((l) => !/^\s*어울리는 방향/.test(l))
    .join("\n");
}

/** 결과지 작성자. 형식 예시는 스펙 안의 실제 적용 사례(익명 처리)를 쓴다. */
export function writerSpec(): string {
  const { r } = load();
  return join(
    section(r, "결과지가 반드시 지켜야 할 구조"),
    section(r, "결과지의 틀"),
    section(r, "RAISEC과의 관계"),
    "※ 아래는 형식 예시다. 문장 구조와 흐름만 참고하고, 내용·표현·직업명은 절대 복사하지 않는다. 이 사용자의 실제 기록에서만 쓴다.\n\n" +
      cleanExample(section(r, "실제 적용 사례 — 영훈")),
  );
}

/** 유명인 사례 초안(AI). 결과지 이름 문구 규칙과 유명인 사례 규칙을 함께 준다. */
export function celebSpec(): string {
  const { r } = load();
  return join(section(r, "유명인 사례"), section(r, "결과지 전달 방식"));
}

/** 직업 목록(검색 문장 만들기·업무 판정·근거 번역). */
export function jobsSpec(): string {
  const { r } = load();
  return join(section(r, "직업 목록 만들기"));
}
