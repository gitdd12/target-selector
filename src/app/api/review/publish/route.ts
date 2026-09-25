import { json } from "@/lib/api";
import { isReviewer } from "@/lib/reviewAuth";
import { getStore, isValidId, save } from "@/lib/store";

// 운영자가 결과지를 검토한 뒤 공개 여부와, 출처를 확인해 승인한 인물 사례를 저장한다.
export async function POST(req: Request) {
  if (!(await isReviewer())) return json({ error: "forbidden" }, 403);
  const body = (await req.json().catch(() => null)) as { id?: string; published?: boolean; approved?: number[] } | null;
  if (!body?.id || !isValidId(body.id)) return json({ error: "bad_request" }, 400);
  const s = await getStore().get(body.id);
  if (!s || !s.report) return json({ error: "not_found" }, 404);
  const count = s.celebDraft?.candidates.length ?? 0;
  const approved = Array.from(new Set((body.approved ?? []).filter((n) => Number.isInteger(n) && n >= 0 && n < count)));
  s.approvedCelebs = approved;
  if (typeof body.published === "boolean") {
    s.published = body.published;
    if (body.published) s.publishedAt = new Date().toISOString();
    s.log.push({ at: new Date().toISOString(), event: body.published ? "result_published" : "result_unpublished", detail: `인물 ${approved.length}명 승인` });
  }
  await save(s);
  return json({ ok: true, published: Boolean(s.published), approved });
}
