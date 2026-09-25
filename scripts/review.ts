// 운영자 검토용 도구.
//   npm run review -- list          참가자 목록과 진행 상태
//   npm run review -- <세션id>       남은 초안 단계를 마무리하고 review/<id>.md 를 만든다
// 결과지는 참가자에게 바로 보이지 않고, 여기서 만든 검토용 원고를 운영자가 확인·수정한 뒤 이메일로 보낸다.
import fs from "node:fs";
import path from "node:path";
import { finalizeStep } from "../src/lib/pipeline";
import { reportToText } from "../src/lib/reviewText";
import { coreBehavior, getScenes } from "../src/lib/result";
import { getStore, save } from "../src/lib/store";
import { WINDOW_LABEL, WINDOW_ORDER, type Session } from "../src/lib/types";

const arg = process.argv[2];

function status(s: Session): string {
  if (s.phase === "complete") return "초안 완료";
  if (s.phase === "finalizing") return `초안 만드는 중(${s.finalizeStep})`;
  if (s.phase === "interview") return `인터뷰 중(${WINDOW_LABEL[s.currentWindow]})`;
  return "시작 전";
}

async function list() {
  const all = await getStore().list();
  if (all.length === 0) return console.log("참가자가 아직 없습니다.");
  for (const s of all) {
    const c = await getStore().getContact(s.id);
    const u = s.usage;
    console.log(
      `${s.id} | ${s.createdAt.slice(0, 16)} | ${status(s)} | 이메일 ${c ? "받음" : s.emailSubmitted ? "받음(삭제됨)" : "없음"} | 나이대 ${s.profile?.ageBand ?? "-"}` +
        ` | AI호출 ${u?.calls ?? 0}회, 입력 ${u?.input ?? 0}+캐시읽기 ${u?.cacheRead ?? 0}, 출력 ${u?.output ?? 0} 토큰` +
        (s.flagged ? ` | ⚠ ${s.flagged === "misuse" ? "오용으로 중단" : "총량 상한"}` : ""),
    );
  }
}

function draft(s: Session): string {
  return s.report ? reportToText(s) : "(초안 없음)";
}

async function build(id: string) {
  const store = getStore();
  const s = await store.get(id);
  if (!s) return console.error("세션을 찾을 수 없습니다:", id);

  // 참가자가 창을 닫아서 초안 만들기가 중간에 멈췄다면 여기서 이어서 마무리한다.
  if (s.phase === "finalizing") {
    while (s.phase === "finalizing") {
      console.log("진행:", s.finalizeStep);
      await finalizeStep(s);
      await save(s);
    }
  } else if (s.phase !== "complete") {
    return console.error(`아직 인터뷰가 끝나지 않았습니다 (${status(s)})`);
  }

  const contact = await store.getContact(id);
  const md: string[] = [];
  md.push(`# 검토용 원고 — ${id}`);
  md.push(
    [
      `- 발송 대상 이메일: ${contact?.email ?? "(없음 — 이메일을 남기지 않음)"}`,
      `- 나이대: ${s.profile?.ageBand ?? "미입력"} / 고른 대상: ${s.targets?.survivors.map((t) => t.name).join(", ") ?? "-"}`,
      `- 스펙 버전: 질문흐름 ${s.specVersions.interview} / 결과지 ${s.specVersions.result}`,
      `- 인터뷰 시작: ${s.createdAt}`,
    ].join("\n"),
  );

  md.push("## 1. 참가자에게 보낼 결과지 초안 (내부 태그·미검증 표시는 이 절에 없음)\n\n" + draft(s));

  md.push(
    "## 2. 검토 메모 (참가자에게 보내지 않음)\n\n" +
      [
        "### 내부 태그 (본문에는 노출되면 안 됨)",
        ...(s.report?.cores ?? []).map((c) => `- '${coreBehavior(c)}' ← ${c.core}`),
        "",
        "### 코어 판정",
        "```json\n" + JSON.stringify(s.final, null, 1) + "\n```",
        "",
        "### 직업 후보(코드가 좁힌 것)와 AI 선정",
        (s.jobCandidates ?? []).map((c) => `- ${c.code} ${c.title} (gap ${c.gap.toFixed(1)})`).join("\n") || "(없음)",
        "",
        "AI가 제외한 직업:",
        (s.jobPick?.excluded ?? []).map((e) => `- ${e.code}: ${e.reason}`).join("\n") || "(없음)",
        "",
        "### 진행 로그",
        s.log.map((l) => `- ${l.at.slice(11, 19)} ${l.event}${l.detail ? ` — ${l.detail}` : ""}`).join("\n"),
      ].join("\n"),
  );

  md.push(
    "## 3. 인물 사례 초안 — 전부 미검증 (출처를 확인해서 통과한 것만 결과지에 넣을 것)\n\n" +
      (s.celebDraft
        ? s.celebDraft.candidates
            .map(
              (c, i) =>
                `### 후보 ${i + 1}: ${c.name} (${c.field_and_era}) — 확신도 ${c.confidence}\n` +
                `- 대상 패턴: ${c.for_pattern}\n- 닮은 점: ${c.why_similar}\n- 장면: ${getScenes(c).map((x) => `${x.title}: ${x.scene} (강점: ${x.strength}${x.cost ? `, 문제점: ${x.cost}` : ""})`).join(" / ")}\n- 내 규모에서는: ${c.at_your_scale || "(없음)"}\n- 출처 후보: ${c.source_hint}\n- 검증 검색어: ${c.verification_queries.join(" / ")}\n- 검증 결과: [ ] 통과  [ ] 탈락  메모:`,
            )
            .join("\n\n") + `\n\n메모: ${s.celebDraft.notes}`
        : "(없음)"),
  );

  md.push(
    "## 4. 원문 대화 (사실 대조용)\n\n" +
      WINDOW_ORDER.map((k) => {
        const w = s.windows[k];
        return `### ${WINDOW_LABEL[k]} (${w.status}${w.closeReason ? `/${w.closeReason}` : ""})\n\n` +
          w.messages.map((m) => `**${m.role === "user" ? "참가자" : "인터뷰어"}**: ${m.content}`).join("\n\n");
      }).join("\n\n"),
  );

  const dir = path.join(process.cwd(), "review");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${id}.md`);
  fs.writeFileSync(file, md.join("\n\n"), "utf8");
  console.log("검토용 원고를 만들었습니다:", file);
}

(async () => {
  if (!arg) return console.log("사용법: npm run review -- list | <세션id>");
  if (arg === "list") await list();
  else await build(arg);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
