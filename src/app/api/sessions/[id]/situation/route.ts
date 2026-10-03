import { after } from "next/server";
import { json, withSession } from "@/lib/api";
import { logEvent, runFinalize } from "@/lib/pipeline";
import { toPublic } from "@/lib/public";
import { SITUATIONS, type Situation } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export const maxDuration = 300;

// 인터뷰가 끝난 뒤 팝업에서 고른 현재 상태. 이 선택을 받은 뒤에야 결과지 초안 만들기가 시작된다.
// 참가자가 화면을 닫아도 끝까지 이어지도록, 응답이 나간 뒤 뒤에서 runFinalize로 전체 단계를 진행한다.
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { situation?: string } | null;
  const situation = body?.situation as Situation | undefined;
  let started = false;
  const res = await withSession(id, async (s) => {
    if (s.phase !== "finalizing") return json({ error: "wrong_phase" }, 409);
    if (!situation || !SITUATIONS.includes(situation)) return json({ error: "bad_value", message: "선택지 중에서 골라주세요." }, 400);
    if (!s.situation) {
      s.situation = situation;
      logEvent(s, "situation_chosen", situation);
      started = true;
    }
    return json(toPublic(s));
  });
  if (started) {
    const baseUrl = new URL(req.url).origin;
    after(() => runFinalize(id, baseUrl));
  }
  return res;
}
