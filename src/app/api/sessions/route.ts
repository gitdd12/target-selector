import { errorResponse, json, tooManyCreates } from "@/lib/api";
import { env } from "@/lib/env";
import { AGE_BANDS, MAX_SESSIONS } from "@/lib/config";
import { getStore, newSession, save } from "@/lib/store";

// 새 인터뷰 시작. 참가자가 안내문에 동의해야 만들어진다.
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { consent?: boolean; code?: string; ageBand?: string };
    if (body.consent !== true) return json({ error: "consent_required" }, 400);

    const required = env("BETA_CODE");
    if (required && body.code?.trim() !== required) return json({ error: "bad_code", message: "참여 코드가 맞지 않아요." }, 403);

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    if (tooManyCreates(ip)) return json({ error: "busy", message: "잠시 뒤에 다시 시도해주세요." }, 429);

    // 운영자가 결과지를 직접 검토하는 인력 한계 때문에 참가자 수에 상한을 둔다
    if ((await getStore().count()) >= MAX_SESSIONS) {
      return json({ error: "full", message: "이번 베타의 참여 인원이 모두 찼어요. 관심 가져줘서 고마워요." }, 403);
    }

    const ageBand = (AGE_BANDS as readonly string[]).includes(body.ageBand ?? "") ? body.ageBand : undefined;
    const s = newSession({ ageBand });
    await save(s);
    return json({ id: s.id });
  } catch (e) {
    return errorResponse(e);
  }
}
