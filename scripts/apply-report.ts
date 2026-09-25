// 운영자 도구: 결과지 글을 직접 새로 써서 넣는다(AI 호출 없음, 비용 0원).
//   npm run apply -- <세션id>     review/patches/<세션id>.json 의 내용을 그 세션에 적용
// 적용 전 원래 값은 review/backup/ 에 저장한다. 인터뷰 원문·코어 판정(final)·이메일은 건드리지 않는다.
// patch.json 에서 쓰는 칸: report(통째로 교체), reliability, situation(working|applying|exploring), jobWhy({직업코드: 한 줄 설명}), jobPick({picks, next_question} 통째로 교체), candidates(인물 사례 후보 통째로 교체)
import fs from "node:fs";
import path from "node:path";
import { getStore, save } from "../src/lib/store";
import { logEvent } from "../src/lib/pipeline";

const id = process.argv[2];

(async () => {
  if (!id) return console.log("사용법: npm run apply -- <세션id>");
  const file = path.join(process.cwd(), "review", "patches", `${id}.json`);
  if (!fs.existsSync(file)) return console.error("패치 파일이 없습니다:", file);
  const patch = JSON.parse(fs.readFileSync(file, "utf8"));
  const s = await getStore().get(id);
  if (!s) return console.error("세션을 찾을 수 없습니다:", id);

  const dir = path.join(process.cwd(), "review", "backup");
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  fs.writeFileSync(
    path.join(dir, `${id}-${stamp}.json`),
    JSON.stringify({ report: s.report, reliability: s.reliability, jobPick: s.jobPick, celebDraft: s.celebDraft }, null, 1),
    "utf8",
  );

  if (patch.report) s.report = patch.report;
  if (patch.reliability) s.reliability = patch.reliability;
  if (patch.situation) s.situation = patch.situation;
  if (patch.jobWhy && s.jobPick) {
    for (const p of s.jobPick.picks) {
      if (patch.jobWhy[p.code]) p.why = patch.jobWhy[p.code];
      p.qualification_note = "";
    }
  }
  if (patch.jobPick && s.jobPick) {
    s.jobPick.picks = patch.jobPick.picks;
    s.jobPick.next_question = patch.jobPick.next_question;
  }
  if (patch.candidates && s.celebDraft) s.celebDraft.candidates = patch.candidates;
  logEvent(s, "report_rewritten_by_operator");
  await save(s);
  console.log("적용했습니다:", id, "(원래 값은 review/backup 에 저장)");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
