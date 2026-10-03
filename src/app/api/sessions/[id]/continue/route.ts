import { after } from "next/server";
import { json } from "@/lib/api";
import { runFinalize } from "@/lib/pipeline";
import { getStore, isValidId } from "@/lib/store";

type Ctx = { params: Promise<{ id: string }> };

export const maxDuration = 300;

// jobs 단계가 시간제한(300초)에 걸려 멈췄을 때 runFinalize가 스스로를 다시 호출하는 전용 경로(§38).
// 참가자·운영자가 직접 부르는 라우트가 아니다 — 새 시간 예산으로 finalizeStep을 이어서 진행한다.
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  if (!isValidId(id)) return json({ error: "not_found" }, 404);
  const s = await getStore().get(id);
  if (!s || s.phase !== "finalizing") return json({ ok: true });
  const baseUrl = new URL(req.url).origin;
  after(() => runFinalize(id, baseUrl));
  return json({ ok: true });
}
