// 시험용 참가자 삭제: npm run cleanup -- <세션id>   (세션과 이메일을 함께 지운다)
import { getStore } from "../src/lib/store";
(async () => {
  const id = process.argv[2];
  if (!id) return console.log("사용법: npm run cleanup -- <세션id>");
  await getStore().del(id);
  console.log("삭제:", id, "| 남은 참가자 수:", await getStore().count());
})();
