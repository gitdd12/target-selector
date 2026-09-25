import { json, withSession } from "@/lib/api";
import { advance } from "@/lib/pipeline";
import { toPublic } from "@/lib/public";

type Ctx = { params: Promise<{ id: string }> };

export const maxDuration = 300;

// 창이 끝난 뒤: 그 창의 대화를 기록 필드로 정리하고, 새 대화창(앞 대화 없이)을 연다.
export async function POST(_req: Request, { params }: Ctx) {
  const { id } = await params;
  return withSession(id, async (s) => {
    if (s.phase !== "interview") return json(toPublic(s));
    const w = s.windows[s.currentWindow];
    if (w.status !== "done" && w.status !== "skipped") return json({ error: "window_not_closed" }, 409);
    await advance(s);
    return json(toPublic(s));
  });
}
