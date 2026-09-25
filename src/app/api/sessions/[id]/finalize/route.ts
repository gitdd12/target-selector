import { json, withSession } from "@/lib/api";
import { finalizeStep } from "@/lib/pipeline";
import { toPublic } from "@/lib/public";

type Ctx = { params: Promise<{ id: string }> };

export const maxDuration = 300;

// 결과지 초안 단계를 한 걸음 진행한다(코어 판정 → 초안 작성 → 직업 추천 → 유명인 사례 초안).
// 참가자 화면이 이메일을 받는 동안 조용히 반복해서 부르고, 결과는 참가자에게 내려가지 않는다.
export async function POST(_req: Request, { params }: Ctx) {
  const { id } = await params;
  return withSession(id, async (s) => {
    if (s.phase === "complete") return json(toPublic(s));
    if (s.phase !== "finalizing") return json({ error: "wrong_phase" }, 409);
    await finalizeStep(s);
    return json(toPublic(s));
  });
}
