// 저장소(Supabase) 연결 시험: 쓰기 → 읽기 → 이메일 분리 저장 → 개수 → 삭제
import { getStore, newSession } from "../src/lib/store";

(async () => {
  console.log("저장소 종류:", process.env.SUPABASE_URL ? "Supabase" : "로컬 파일(주의: Supabase 설정 안 됨)");
  const store = getStore();
  const s = newSession({ ageBand: "20대 후반" });
  await store.put(s);
  console.log("1) 세션 쓰기 OK");
  const back = await store.get(s.id);
  console.log("2) 세션 읽기:", back?.id === s.id && back?.profile.ageBand === "20대 후반" ? "OK" : "불일치");
  await store.putContact(s.id, { email: "test@example.com", at: new Date().toISOString() });
  const c = await store.getContact(s.id);
  console.log("3) 이메일 분리 저장/읽기:", c?.email === "test@example.com" ? "OK" : "불일치", "| 세션 JSON에 이메일 섞임:", JSON.stringify(back).includes("test@example.com"));
  console.log("4) 세션 개수:", await store.count(), "/ 목록 길이:", (await store.list()).length);
  await store.del(s.id);
  console.log("5) 삭제 후 세션:", (await store.get(s.id)) === null ? "없음(OK)" : "남아 있음", "/ 이메일:", (await store.getContact(s.id)) === null ? "없음(OK)" : "남아 있음");
})().catch((e) => {
  console.error("오류:", e instanceof Error ? e.message : e);
  process.exit(1);
});
