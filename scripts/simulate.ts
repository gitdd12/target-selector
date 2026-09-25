// 시험용: 가상 참가자(다른 AI가 연기)로 인터뷰 한 판을 처음부터 끝까지 돌린다. 실제 AI 호출이라 비용이 든다.
//   npm run simulate
// 끝나면 세션 id를 알려준다. 이어서 `npm run review -- <id>`로 검토용 원고를 만든다.
import fs from "node:fs";
import path from "node:path";
import { OFF_TOPIC, participantSays, pickTargets } from "./persona";
import { interviewTurn } from "../src/lib/interview";
import { advance, applyRestatement, applyTurnResult, finalizeStep, logEvent, startWindow } from "../src/lib/pipeline";
import { newSession, save } from "../src/lib/store";
import { COVERAGE_KEYS, WINDOW_ORDER, type Situation } from "../src/lib/types";

const MAX_TURNS = 40;
// 재진술 카드에서 "더 할 얘기 있어요"를 한 번 눌러보는 창(버튼 두 가지 경로를 모두 시험)
const PRESS_MORE_ONCE = new Set(["exp1", "hardship"]);

async function main() {
  const s = newSession({ ageBand: "20대 후반" });
  s.targets = pickTargets();
  s.phase = "interview";
  logEvent(s, "simulated_run");
  startWindow(s, "exp1");
  await save(s);
  console.log("세션:", s.id);

  const out: string[] = [];
  const say = (line: string) => {
    console.log(line);
    out.push(line);
  };

  for (const kind of WINDOW_ORDER) {
    if ((s.phase as string) !== "interview") break;
    const w = s.windows[kind];
    say(`\n===== ${kind} =====`);
    say(`인터뷰어: ${w.messages[0].content}`);
    let pressedMore = false;
    for (let t = 1; t <= MAX_TURNS && w.status === "active"; t++) {
      const userTurns = w.messages.filter((m) => m.role === "user").length + 1;
      const text = kind === OFF_TOPIC.kind && userTurns === OFF_TOPIC.atUserTurn && process.env.PERSONA !== "multi" ? OFF_TOPIC.text : await participantSays(w.messages, kind);
      w.messages.push({ role: "user", content: text, at: new Date().toISOString() });
      say(`참가자: ${text}`);

      const turn = await interviewTurn(s, kind);
      applyTurnResult(s, kind, turn);
      if (turn.reply) say(`인터뷰어: ${turn.reply}`);
      if (turn.coverage) {
        const missing = COVERAGE_KEYS.filter((k) => turn.coverage![k] === "미확보");
        say(`   (확보 현황: 미확보 ${missing.length}개${missing.length ? " — " + missing.join(", ") : ""})`);
      }
      if (turn.finish) say(`   [창 종료: ${turn.finish}]`);

      if (w.pendingRestatement) {
        say(`\n┌─ 재진술 카드 ─────────\n${turn.restatement}\n└──────────────────────`);
        if (!pressedMore && PRESS_MORE_ONCE.has(kind)) {
          pressedMore = true;
          applyRestatement(s, "more");
          say("   → 버튼: 「더 할 얘기 있어요」");
          say(`인터뷰어: ${w.messages[w.messages.length - 1].content}`);
        } else {
          applyRestatement(s, "next");
          say("   → 버튼: 「다음 질문으로 넘어갈게요」");
        }
      }
      await save(s);
    }
    if (w.status === "active") {
      w.status = "done";
      w.closeReason = "turn_limit";
      say(`(시험 스크립트가 ${MAX_TURNS}턴에서 강제로 닫음)`);
    }
    await advance(s);
    await save(s);
  }

  // 인터뷰 끝 팝업에서 고르는 현재 상태(기본: 진로 탐색 중). SITUATION=working|applying|exploring
  if ((s.phase as string) === "finalizing") {
    s.situation = (process.env.SITUATION as Situation | undefined) ?? "exploring";
    logEvent(s, "situation_chosen", s.situation);
  }
  while ((s.phase as string) === "finalizing") {
    console.log("결과지 초안 단계:", s.finalizeStep);
    await finalizeStep(s);
    await save(s);
  }

  const dir = path.join(process.cwd(), "review");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `sim-${s.id}-transcript.txt`), out.join("\n"), "utf8");
  console.log("\n완료. 세션 id:", s.id);
  console.log("사용량:", s.usage);
  console.log("다음: npm run review --", s.id);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
