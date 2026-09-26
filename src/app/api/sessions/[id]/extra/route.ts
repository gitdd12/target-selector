import { json, withSession } from "@/lib/api";
import { chooseExtra } from "@/lib/pipeline";
import { toPublic } from "@/lib/public";

type Ctx = { params: Promise<{ id: string }> };

// 경험 2 뒤 선택 카드: "경험 하나 더 이야기하기"(yes) / "다음 질문으로 넘어가기"(no). AI를 부르지 않아 즉시 끝난다.
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { choice?: string } | null;
  const choice = body?.choice;
  return withSession(id, async (s) => {
    if (s.phase !== "interview") return json({ error: "wrong_phase" }, 409);
    if (choice !== "yes" && choice !== "no") return json({ error: "bad_request" }, 400);
    chooseExtra(s, choice); // 이미 고른 뒤(두 번 눌림 등)면 아무것도 안 한다
    return json(toPublic(s));
  });
}
