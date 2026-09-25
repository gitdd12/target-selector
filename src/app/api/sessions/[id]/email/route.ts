import { errorResponse, json, withSession } from "@/lib/api";
import { logEvent } from "@/lib/pipeline";
import { toPublic } from "@/lib/public";
import { getStore } from "@/lib/store";

type Ctx = { params: Promise<{ id: string }> };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// 결과지를 받을 이메일. 대화 기록과 분리된 곳(contacts)에 저장한다.
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { email?: string } | null;
  const email = body?.email?.trim().toLowerCase() ?? "";
  return withSession(id, async (s) => {
    if (s.phase !== "finalizing" && s.phase !== "complete") return json({ error: "wrong_phase" }, 409);
    if (email.length > 200 || !EMAIL_RE.test(email)) {
      return json({ error: "bad_email", message: "이메일 주소를 다시 확인해줄래요?" }, 400);
    }
    try {
      await getStore().putContact(id, { email, at: new Date().toISOString() });
    } catch (e) {
      return errorResponse(e);
    }
    s.emailSubmitted = true;
    logEvent(s, "email_submitted");
    return json(toPublic(s));
  });
}
