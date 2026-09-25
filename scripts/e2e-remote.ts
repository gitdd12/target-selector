// 배포된 사이트 주소로 인터뷰 한 판을 처음부터 끝까지 돌린다(서버 시간 제한·저장소·화면 API 전체 시험). AI 호출 비용이 든다.
//   npm run e2e -- https://core-finder-alpha.vercel.app
import { OFF_TOPIC, participantSays, TARGETS } from "./persona";
import { WINDOW_ORDER, type WindowKind } from "../src/lib/types";

const BASE = (process.argv[2] ?? "").replace(/\/$/, "");
if (!BASE) {
  console.log("사용법: npm run e2e -- <사이트 주소>");
  process.exit(1);
}

const timings: { step: string; ms: number; status: number }[] = [];
async function call(path: string, body?: unknown, method = "POST") {
  const t = Date.now();
  const res = await fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const ms = Date.now() - t;
  const text = await res.text();
  let data: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any
  try {
    data = JSON.parse(text);
  } catch {}
  timings.push({ step: `${method} ${path.replace(/[A-Za-z0-9_-]{30,}/, ":id")}`, ms, status: res.status });
  if (!res.ok) console.log(`  ⚠ ${res.status} ${path} (${(ms / 1000).toFixed(1)}초): ${text.slice(0, 200)}`);
  return { status: res.status, data, ms };
}

(async () => {
  console.log("대상:", BASE);
  const created = await call("/api/sessions", { consent: true, ageBand: "20대 후반" });
  if (created.status !== 200) return console.log("세션 생성 실패", created.data);
  const id = created.data.id as string;
  console.log("세션:", id);
  const base = `/api/sessions/${id}`;

  let s = (await call(`${base}/targets`, TARGETS)).data;
  for (const kind of WINDOW_ORDER as WindowKind[]) {
    console.log(`\n== ${kind} ==`);
    let pressedMore = false;
    for (let turn = 1; turn <= 45; turn++) {
      const userTurns = s.messages.filter((m: { role: string }) => m.role === "user").length + 1;
      const text = kind === OFF_TOPIC.kind && userTurns === OFF_TOPIC.atUserTurn ? OFF_TOPIC.text : await participantSays(s.messages, kind);
      const r = await call(`${base}/chat`, { text });
      if (r.status !== 200) {
        if (r.status === 429) { await new Promise((r2) => setTimeout(r2, 2500)); turn--; continue; }
        return console.log("채팅 실패로 중단");
      }
      s = r.data;
      if (s.pendingRestatement) {
        // 재진술 카드: 첫 창과 셋째 창에서는 "더 할 얘기 있어요"를 한 번 눌러보고, 그 뒤에는 "다음 질문으로 넘어갈게요"
        const action = !pressedMore && (kind === "exp1" || kind === "hardship") ? "more" : "next";
        if (action === "more") pressedMore = true;
        const b = await call(`${base}/restatement`, { action });
        if (b.status !== 200) return console.log("재진술 버튼 실패로 중단");
        s = b.data;
        console.log(`  재진술 카드 → 「${action === "more" ? "더 할 얘기 있어요" : "다음 질문으로 넘어갈게요"}」`);
      }
      if (s.awaitingAdvance) break;
    }
    const last = s.messages[s.messages.length - 1]?.content ?? "";
    console.log("마지막 인터뷰어 발화:", last.slice(0, 60).replace(/\n/g, " "));
    const a = await call(`${base}/advance`);
    if (a.status !== 200) return console.log("advance 실패로 중단");
    s = a.data;
    console.log(`  다음 창으로 (기록 정리 ${(a.ms / 1000).toFixed(1)}초) → phase=${s.phase}`);
  }

  console.log("\n== 이메일 + 결과지 초안 ==");
  const em = await call(`${base}/email`, { email: "test-e2e@example.com" });
  console.log("이메일 접수:", em.status === 200 ? "OK" : em.status);
  for (let i = 0; i < 6 && s.phase === "finalizing"; i++) {
    const f = await call(`${base}/finalize`);
    if (f.status !== 200) return console.log("finalize 실패로 중단");
    s = f.data;
    console.log(`  finalize → 다음 단계 ${s.finalizeStep} (${(f.ms / 1000).toFixed(1)}초)`);
  }
  console.log("\n최종 phase:", s.phase, "| 화면 응답에 결과지 필드 노출:", JSON.stringify(s).includes("pattern_phrase"));

  console.log("\n== 소요 시간 상위 ==");
  [...timings].sort((x, y) => y.ms - x.ms).slice(0, 8).forEach((t) => console.log(`  ${(t.ms / 1000).toFixed(1).padStart(6)}초  ${t.status}  ${t.step}`));
  console.log("\n호출 수:", timings.length, "| 실패:", timings.filter((t) => t.status >= 400).length);
  console.log("세션 id:", id);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
