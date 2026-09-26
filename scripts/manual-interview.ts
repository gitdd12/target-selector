// 수동 시험용: 참가자 발화를 (다른 AI 호출 없이) 커맨드라인 인자로 직접 넣어서 실제 파이프라인을 한 턴씩 돌린다.
// 세션은 실제 저장소(Supabase 또는 .data)에 저장되므로 여러 번의 node 프로세스 호출에 걸쳐 이어진다.
//   new [category:name ...]        새 세션 시작, exp1 창 첫 질문 출력
//   say <sessionId> <text>         참가자 발화 한 번 보내고 인터뷰어 응답 출력
//   restate <sessionId> more|next  재진술 카드 버튼
//   advance <sessionId>            현재 창 마감 후 다음 창으로(또는 결과지 단계로)
//   extra <sessionId> yes|no       경험 2 뒤 "경험 하나 더 이야기하기" 선택
//   finalize <sessionId> [situation]  결과지 초안까지 전체 진행
//   dump <sessionId>               세션 상태 요약 출력
import { interviewTurn } from "../src/lib/interview";
import { advance, applyRestatement, applyTurnResult, chooseExtra, finalizeStep, logEvent, startWindow } from "../src/lib/pipeline";
import { newSession, save, getStore } from "../src/lib/store";
import { COVERAGE_KEYS, COVERAGE_LABEL, WINDOW_ORDER, type Situation, type Target } from "../src/lib/types";

const [, , cmd, ...rest] = process.argv;

async function main() {
  if (cmd === "new") {
    const s = newSession({ ageBand: "20대 후반" });
    const targets: Target[] = rest.length
      ? rest.map((r, i) => {
          const [category, name] = r.split(":");
          return { id: i + 1, category, name };
        })
      : [{ id: 1, category: "사람", name: "사람, 관계" }];
    s.targets = {
      survivors: targets,
      scores: Object.fromEntries(targets.map((t) => [t.id, 5])),
      timedOut: {},
      answerMs: {},
      passedCount: targets.length + 2,
      eliminatedCount: 2,
      totalMs: 60000,
    };
    s.phase = "interview";
    logEvent(s, "manual_run");
    startWindow(s, "exp1");
    await save(s);
    console.log("SESSION_ID:", s.id);
    console.log("MODELS:", JSON.stringify(s.models));
    console.log(`\n===== exp1 =====`);
    console.log("인터뷰어:", s.windows.exp1.messages[0].content);
    return;
  }

  if (cmd === "say") {
    const [id, ...textParts] = rest;
    const text = textParts.join(" ");
    const s = await getStore().get(id);
    if (!s) throw new Error("세션을 찾을 수 없습니다: " + id);
    const kind = s.currentWindow;
    const w = s.windows[kind];
    if (w.pendingRestatement) throw new Error("재진술 카드가 떠 있습니다. restate 명령을 먼저 쓰세요.");
    if (w.status !== "active") throw new Error(`이 창(${kind})은 이미 끝났습니다(status=${w.status}). advance를 쓰세요.`);
    w.messages.push({ role: "user", content: text, at: new Date().toISOString() });
    console.log(`참가자: ${text}`);
    const turn = await interviewTurn(s, kind);
    applyTurnResult(s, kind, turn);
    if (turn.reply) console.log("인터뷰어:", turn.reply);
    if (turn.coverage) {
      const missing = COVERAGE_KEYS.filter((k) => turn.coverage![k] === "미확보");
      console.log(`   (미확보 ${missing.length}개${missing.length ? " — " + missing.map((k) => COVERAGE_LABEL[k]).join(", ") : ""})`);
    }
    if (w.pendingRestatement) console.log(`\n┌─ 재진술 카드 ─────────\n${turn.restatement}\n└──────────────────────`);
    if (turn.finish) console.log(`   [창 종료: ${turn.finish}]`);
    await save(s);
    return;
  }

  if (cmd === "restate") {
    const [id, action] = rest;
    if (action !== "more" && action !== "next") throw new Error("more 또는 next");
    const s = await getStore().get(id);
    if (!s) throw new Error("세션을 찾을 수 없습니다: " + id);
    applyRestatement(s, action);
    if (action === "next") {
      console.log(`   → 버튼: 「다음 질문으로 넘어갈게요」 (창 마감)`);
    } else {
      console.log(`   → 버튼: 「더 할 얘기 있어요」`);
      console.log("인터뷰어:", s.windows[s.currentWindow].messages.at(-1)!.content);
    }
    await save(s);
    return;
  }

  if (cmd === "extra") {
    const [id, choice] = rest;
    if (choice !== "yes" && choice !== "no") throw new Error("yes 또는 no");
    const s = await getStore().get(id);
    if (!s) throw new Error("세션을 찾을 수 없습니다: " + id);
    chooseExtra(s, choice);
    await save(s);
    console.log(`\n===== ${s.currentWindow} =====`);
    console.log("인터뷰어:", s.windows[s.currentWindow].messages[0].content);
    return;
  }

  if (cmd === "advance") {
    const [id] = rest;
    const s = await getStore().get(id);
    if (!s) throw new Error("세션을 찾을 수 없습니다: " + id);
    const prevKind = s.currentWindow;
    await advance(s);
    await save(s);
    if ((s.phase as string) === "finalizing") {
      console.log(`(${prevKind} 종료 → 모든 창 끝, 결과지 단계로 넘어갑니다. finalize 명령을 쓰세요)`);
    } else if ((s.phase as string) === "complete") {
      console.log(`(오용으로 중단됨)`);
    } else if (s.extraOffer === "pending") {
      console.log(`(${prevKind} 종료 → 「경험 하나 더 이야기하기 / 다음 질문으로 넘어가기」 선택 카드. extra 명령을 쓰세요)`);
    } else {
      console.log(`\n===== ${s.currentWindow} =====`);
      console.log("인터뷰어:", s.windows[s.currentWindow].messages[0].content);
    }
    return;
  }

  if (cmd === "finalize") {
    const [id, situation] = rest;
    const s = await getStore().get(id);
    if (!s) throw new Error("세션을 찾을 수 없습니다: " + id);
    if ((s.phase as string) === "finalizing" && !s.situation) {
      s.situation = (situation as Situation | undefined) ?? "exploring";
      logEvent(s, "situation_chosen", s.situation);
    }
    while ((s.phase as string) === "finalizing") {
      console.log("결과지 초안 단계:", s.finalizeStep);
      await finalizeStep(s);
      await save(s);
    }
    console.log("완료. usage:", JSON.stringify(s.usage));
    console.log(`review 화면: npm run review -- ${id}`);
    return;
  }

  if (cmd === "dump") {
    const [id] = rest;
    const s = await getStore().get(id);
    if (!s) throw new Error("세션을 찾을 수 없습니다: " + id);
    console.log(JSON.stringify({ phase: s.phase, currentWindow: s.currentWindow, windows: Object.fromEntries(WINDOW_ORDER.map((k) => [k, { status: s.windows[k].status, closeReason: s.windows[k].closeReason, turns: s.windows[k].messages.filter((m) => m.role === "user").length }])), records: s.records, final: s.final, report: s.report, usage: s.usage }, null, 2));
    return;
  }

  console.error("알 수 없는 명령:", cmd);
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
