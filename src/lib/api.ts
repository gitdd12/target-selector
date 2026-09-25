import Anthropic from "@anthropic-ai/sdk";
import { ConfigError, LlmRefusal } from "./llm";
import { getStore, isValidId, save } from "./store";
import type { Session } from "./types";

export const json = (body: unknown, status = 200) => Response.json(body, { status });

/** 서버 내부 사정은 사용자에게 그대로 보이지 않게, 화면에서 쓸 수 있는 짧은 코드와 문구로 바꾼다. */
export function errorResponse(e: unknown): Response {
  console.error("[api error]", e);
  if (e instanceof LlmRefusal) {
    return json({ error: "refusal", message: "AI가 이 응답을 만들지 못했어요. 표현을 조금 바꿔서 다시 말해줄래요?" }, 422);
  }
  if (e instanceof ConfigError || e instanceof Anthropic.AuthenticationError) {
    return json({ error: "config", message: "서비스 설정에 문제가 있어요. 운영자에게 알려주세요." }, 500);
  }
  if (e instanceof Anthropic.RateLimitError || (e instanceof Anthropic.APIError && (e.status ?? 0) >= 500)) {
    return json({ error: "busy", message: "지금 AI가 바빠요. 잠시 뒤에 다시 시도해주세요." }, 503);
  }
  return json({ error: "server", message: "잠시 문제가 생겼어요. 다시 시도해주세요." }, 500);
}

/** 세션을 불러와 처리하고 저장까지 한다. 링크의 비밀 코드가 곧 접근 권한이다. */
export async function withSession(
  id: string,
  fn: (s: Session) => Promise<Response | void>,
): Promise<Response> {
  if (!isValidId(id)) return json({ error: "not_found" }, 404);
  try {
    const s = await getStore().get(id);
    if (!s) return json({ error: "not_found" }, 404);
    const res = await fn(s);
    await save(s);
    return res ?? json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}

// 남용 방지용 간단한 횟수 제한(서버가 여러 대로 늘어나면 정확하지 않은 최소한의 방어)
const hits = new Map<string, number[]>();
export function rateLimited(key: string, max: number, windowMs: number): boolean {
  const t = Date.now();
  const arr = (hits.get(key) ?? []).filter((x) => t - x < windowMs);
  arr.push(t);
  hits.set(key, arr);
  return arr.length > max;
}
export const tooManyCreates = (ip: string) => rateLimited(`create:${ip}`, 12, 60 * 60 * 1000);
export const clientIp = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
