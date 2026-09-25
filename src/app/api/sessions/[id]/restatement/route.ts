import { json, withSession } from "@/lib/api";
import { applyRestatement } from "@/lib/pipeline";
import { toPublic } from "@/lib/public";

type Ctx = { params: Promise<{ id: string }> };

// 재진술 카드의 버튼: "더 할 얘기 있어요"(more) / "다음 질문으로 넘어갈게요"(next). AI를 부르지 않아 즉시 끝난다.
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { action?: string } | null;
  const action = body?.action;
  return withSession(id, async (s) => {
    if (s.phase !== "interview") return json({ error: "wrong_phase" }, 409);
    if (action !== "more" && action !== "next") return json({ error: "bad_request" }, 400);
    const w = s.windows[s.currentWindow];
    if (w.status !== "active") return json(toPublic(s)); // 이미 끝난 창(두 번 눌림 등)
    if (!w.pendingRestatement && !(action === "next" && w.restatedOnce)) return json(toPublic(s));
    applyRestatement(s, action);
    return json(toPublic(s));
  });
}
