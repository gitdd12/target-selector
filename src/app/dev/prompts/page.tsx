import Link from "next/link";
import {
  celebSystem,
  CLOSING_HINT,
  interviewerSystem,
  judgeSystem,
  OPENING,
  recorderSystem,
  writerSystem,
} from "@/lib/prompts";
import { judgeTaskSystem, querySystem, translateSystem } from "@/lib/jobPrompts";
import { specVersions } from "@/lib/specs";
import { WINDOW_LABEL, WINDOW_ORDER } from "@/lib/types";

// AI에게 실제로 들어가는 지시문(스펙을 역할별로 조립한 결과)을 그대로 보여준다. AI를 부르지 않는다.
export default function PromptsPage() {
  const v = specVersions();
  const roles: { label: string; note: string; text: string }[] = [
    ...WINDOW_ORDER.map((k) => ({
      label: `인터뷰어 — ${WINDOW_LABEL[k]} 창`,
      note: "이 창의 대화를 진행하는 AI에게 가는 지시문",
      text: interviewerSystem(k),
    })),
    { label: "기록 정리 — 경험 창", note: "창이 끝난 뒤 대화를 '기록 필드'로 정리", text: recorderSystem("exp1") },
    { label: "기록 정리 — 가치관 창", note: "가치관 질문 창의 정리", text: recorderSystem("hardship") },
    { label: "코어 판정", note: "4개 창이 끝난 뒤 확정 코어를 정함", text: judgeSystem() },
    { label: "결과지 작성", note: "결과지 초안 작성", text: writerSystem() },
    { label: "유명인 사례 초안", note: "미검증 후보를 제안", text: celebSystem() },
    { label: "직업 목록 — 검색 문장", note: "코어의 행동 설명을 대상 20개에 끼워 넣은 영어 검색 문장(40개)", text: querySystem() },
    { label: "직업 목록 — 업무 판정", note: "검색·확장된 업무 문장마다 강도·몫·대상을 판정(근거 재확인도 같은 판정)", text: judgeTaskSystem() },
    { label: "직업 목록 — 근거 번역", note: "결과지에 인용할 근거 업무 문장 번역(한 번 번역해 모든 세션이 같이 씀)", text: translateSystem() },
  ];

  return (
    <div className="app">
      <Link href="/dev" style={{ fontSize: 13, color: "var(--dim)" }}>
        ← 목록
      </Link>
      <div className="eyebrow" style={{ marginTop: 10 }}>
        AI 지시문
      </div>
      <div className="q-title">스펙이 실제로 AI에게 어떻게 들어가는지</div>
      <div className="q-sub">
        스펙 버전: 질문흐름 <b>{v.interview}</b> / 결과지 <b>{v.result}</b>. 스펙 파일(specs 폴더)을 고치고 다시 배포하면 이 화면에 바로 반영돼요.
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="eyebrow">AI가 만들지 않고 고정 문구로 나가는 말</div>
        {WINDOW_ORDER.map((k) => (
          <div key={k} style={{ marginTop: 12, fontSize: 14, lineHeight: 1.7 }}>
            <b>{WINDOW_LABEL[k]}</b>
            <div style={{ whiteSpace: "pre-wrap", color: "var(--ink-soft)" }}>첫 질문: {OPENING[k]}</div>
            <div style={{ color: "var(--dim)" }}>‘다음 질문으로 넘어갈게요’를 누르면: {CLOSING_HINT[k]}</div>
          </div>
        ))}
      </div>

      {roles.map((r) => (
        <details key={r.label} className="card" style={{ marginTop: 10 }}>
          <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 14.5 }}>
            {r.label} <span style={{ fontWeight: 400, color: "var(--dim)", fontSize: 12.5 }}>· {r.text.length.toLocaleString()}자 · {r.note}</span>
          </summary>
          <pre style={{ whiteSpace: "pre-wrap", wordBreak: "keep-all", fontSize: 12.5, lineHeight: 1.7, marginTop: 12, fontFamily: "inherit", color: "var(--ink-soft)" }}>
            {r.text}
          </pre>
        </details>
      ))}
    </div>
  );
}
