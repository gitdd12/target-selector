import { clientIp, json, rateLimited, withSession } from "@/lib/api";
import { LIMITS } from "@/lib/config";
import { interviewTurn } from "@/lib/interview";
import { applyTurnResult, logEvent } from "@/lib/pipeline";
import { toPublic } from "@/lib/public";
import { WINDOW_ORDER } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export const maxDuration = 120;

// 사용자가 한 말을 받아 AI 인터뷰어의 다음 말을 돌려준다.
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { text?: string } | null;
  const text = body?.text?.trim();

  // 같은 IP에서 짧은 시간에 너무 많이 보내면 AI를 부르기 전에 막는다(토큰 낭비 방지)
  if (rateLimited(`chat:${clientIp(req)}`, LIMITS.perIpChatsPer10Min, 10 * 60 * 1000)) {
    return json({ error: "busy", message: "너무 빠르게 많이 보내고 있어요. 잠시 뒤에 다시 해주세요." }, 429);
  }

  return withSession(id, async (s) => {
    if (s.phase !== "interview") return json({ error: "wrong_phase" }, 409);
    const kind = s.currentWindow;
    const w = s.windows[kind];
    if (w.status !== "active") return json({ error: "window_closed" }, 409);
    if (w.pendingRestatement) return json({ error: "pending_restatement", message: "위 카드에서 버튼을 먼저 골라주세요." }, 409);
    if (!text) return json({ error: "empty" }, 400);
    if (text.length > LIMITS.maxUserChars) {
      return json({ error: "too_long", message: `한 번에 ${LIMITS.maxUserChars}자까지만 보낼 수 있어요. 나눠서 말해줄래요?` }, 400);
    }

    // 도배 방지: 직전 메시지와 너무 가까우면 거절
    const lastUser = [...w.messages].reverse().find((m) => m.role === "user");
    if (lastUser && Date.now() - Date.parse(lastUser.at) < LIMITS.minMsgIntervalMs) {
      return json({ error: "too_fast", message: "조금만 천천히 보내줘요." }, 429);
    }

    const at = new Date().toISOString();
    w.messages.push({ role: "user", content: text, at });

    // 이 창의 길이, 그리고 인터뷰 전체의 총량을 확인한다
    const userTurns = w.messages.filter((m) => m.role === "user").length;
    const all = WINDOW_ORDER.flatMap((k) => s.windows[k].messages).filter((m) => m.role === "user");
    const totalTurns = all.length;
    const totalChars = all.reduce((n, m) => n + m.content.length, 0);

    const overWindow = userTurns > LIMITS.hardUserTurns[kind];
    const overTotal = totalTurns > LIMITS.totalUserTurns || totalChars > LIMITS.totalUserChars;
    if (overWindow || overTotal) {
      // 안전장치: 너무 길어지면 여기서 창을 닫는다. 총량을 넘겼으면 남은 창은 건너뛰고 결과지 단계로 간다.
      w.status = "done";
      w.closeReason = "turn_limit";
      if (overTotal) s.flagged = "budget";
      w.messages.push({
        role: "assistant",
        content: overTotal
          ? "이야기가 충분히 쌓였어요. 여기서 마무리하고 정리해볼게요."
          : "이야기가 충분히 쌓였어요. 다음 질문으로 넘어갈게요.",
        at,
      });
      logEvent(s, "window_closed", `${kind}:turn_limit${overTotal ? ":total" : ""}`);
      return json(toPublic(s));
    }

    try {
      const turn = await interviewTurn(s, kind);
      applyTurnResult(s, kind, turn);
    } catch (e) {
      // AI 호출이 실패하면 방금 사용자가 한 말을 되돌려서 다시 보낼 수 있게 한다
      w.messages.pop();
      throw e;
    }
    return json(toPublic(s));
  });
}
