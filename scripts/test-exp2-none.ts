// 시험용: 두 번째 경험 창에서 참가자가 계속 "없어"라고만 답할 때(대표님의 실제 인터뷰 상황),
// 첫 "없어"를 바로 받아들이지 않고 서로 다른 회상 경로를 두 번 시도하는지 본다. AI 호출 3~4회.
import { interviewTurn } from "../src/lib/interview";
import { applyTurnResult, startWindow } from "../src/lib/pipeline";
import { newSession } from "../src/lib/store";

(async () => {
  const s = newSession();
  s.phase = "interview";
  s.targets = { survivors: [{ id: 2, category: "물질", name: "재료 (음식, 나무, 천, 흙, 금속)" }], scores: {}, timedOut: {}, answerMs: {}, passedCount: 1, eliminatedCount: 0, totalMs: 0 };
  startWindow(s, "exp2");
  const w = s.windows.exp2;
  console.log("인터뷰어:", w.messages[0].content.replace(/\n/g, " "));
  for (let i = 1; i <= 5 && w.status === "active"; i++) {
    w.messages.push({ role: "user", content: "없어", at: new Date().toISOString() });
    console.log(`참가자(${i}번째): 없어`);
    const turn = await interviewTurn(s, "exp2");
    applyTurnResult(s, "exp2", turn);
    console.log(`인터뷰어: ${turn.reply}${turn.finish ? `   [창 종료: ${turn.finish}]` : ""}`);
  }
  console.log("\n사용량:", s.usage.calls, "회 호출");
})();
