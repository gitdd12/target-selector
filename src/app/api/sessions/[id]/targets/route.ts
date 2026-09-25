import { json, withSession } from "@/lib/api";
import { logEvent, startWindow } from "@/lib/pipeline";
import { toPublic } from "@/lib/public";
import type { TargetSelection } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

// 10초 대상 선택이 끝나면 결과를 저장하고 "경험 1" 창을 연다.
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as TargetSelection | null;
  return withSession(id, async (s) => {
    if (s.phase !== "targets") return json(toPublic(s));
    if (!body || !Array.isArray(body.survivors) || body.survivors.length < 1 || body.survivors.length > 15) {
      return json({ error: "bad_request" }, 400);
    }
    s.targets = {
      survivors: body.survivors.map((t) => ({
        id: Number(t.id),
        category: String(t.category).slice(0, 20),
        name: String(t.name).slice(0, 60),
      })),
      scores: body.scores ?? {},
      timedOut: body.timedOut ?? {},
      answerMs: body.answerMs ?? {},
      passedCount: Number(body.passedCount) || 0,
      eliminatedCount: Number(body.eliminatedCount) || 0,
      totalMs: Number(body.totalMs) || 0,
    };
    s.phase = "interview";
    logEvent(s, "targets_selected", s.targets.survivors.map((t) => t.name).join(" / "));
    startWindow(s, "exp1");
    return json(toPublic(s));
  });
}
