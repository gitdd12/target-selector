import { after } from "next/server";
import { json, withSession } from "@/lib/api";
import { advance, recordWindow } from "@/lib/pipeline";
import { toPublic } from "@/lib/public";

type Ctx = { params: Promise<{ id: string }> };

export const maxDuration = 300;

// 창이 끝난 뒤: 새 대화창(앞 대화 없이)을 바로 열어 응답한다. 그 창의 대화를 기록 필드로 정리하는
// AI 호출은 느려서 다음 질문을 막지 않도록, 응답이 나간 뒤 뒤에서 이어서 한다(recordWindow).
export async function POST(_req: Request, { params }: Ctx) {
  const { id } = await params;
  return withSession(id, async (s) => {
    if (s.phase !== "interview") return json(toPublic(s));
    const w = s.windows[s.currentWindow];
    if (w.status !== "done" && w.status !== "skipped") return json({ error: "window_not_closed" }, 409);
    const pending = await advance(s);
    if (pending) after(() => recordWindow(id, pending.kind, pending.messages));
    return json(toPublic(s));
  });
}
