import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { EFFORT, MODELS } from "./config";
import { env } from "./env";
import type { Session } from "./types";

// 서버에서만 부른다. API 키는 환경변수 ANTHROPIC_API_KEY에서 자동으로 읽는다.
let client: Anthropic | null = null;
export function anthropic(): Anthropic {
  if (!client) {
    const apiKey = env("ANTHROPIC_API_KEY");
    if (!apiKey && !process.env.ANTHROPIC_AUTH_TOKEN) {
      throw new ConfigError("ANTHROPIC_API_KEY가 설정되지 않았습니다 (.env.local 확인)");
    }
    client = apiKey ? new Anthropic({ apiKey }) : new Anthropic();
  }
  return client;
}

export type Role = keyof typeof MODELS;

export class LlmRefusal extends Error {}
export class ConfigError extends Error {}

/** AI를 부를 때마다 토큰 사용량을 세션에 쌓는다(운영자가 비용을 볼 수 있게). */
export function addUsage(
  s: Session | undefined,
  u: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number | null; cache_creation_input_tokens?: number | null },
) {
  if (!s) return;
  s.usage.calls += 1;
  s.usage.input += u.input_tokens;
  s.usage.output += u.output_tokens;
  s.usage.cacheRead += u.cache_read_input_tokens ?? 0;
  s.usage.cacheWrite += u.cache_creation_input_tokens ?? 0;
}

// 시험 스크립트용: AI 대신 정해 둔 답을 돌려주는 함수를 끼운다(비용 없이 코드 흐름만 확인할 때). 앱에서는 쓰지 않는다.
type Fake = (role: Role, system: Anthropic.TextBlockParam[], user: string) => unknown;
let fake: Fake | null = null;
export function setFakeLlm(f: Fake | null) {
  fake = f;
}

/** 결과를 정해진 형식(JSON)으로 받는 호출. 기록 정리·코어 판정·결과지·직업 목록에 쓴다. */
export async function callJson<S extends z.ZodType>(
  role: Role,
  schema: S,
  system: Anthropic.TextBlockParam[],
  user: string,
  s?: Session,
  maxTokens = 16000, // 이보다 크면 SDK가 "10분 넘을 수 있는 요청은 스트리밍 필수"라며 막는다
): Promise<z.infer<S>> {
  if (fake) return schema.parse(await fake(role, system, user)) as z.infer<S>;
  const attempt = (userText: string) =>
    anthropic().messages.parse({
      model: MODELS[role],
      max_tokens: maxTokens,
      thinking: { type: "adaptive" },
      output_config: { effort: EFFORT[role], format: zodOutputFormat(schema) },
      system,
      messages: [{ role: "user", content: userText }],
    });
  let res;
  try {
    res = await attempt(user);
  } catch (e) {
    // 시험에서 AI가 가끔 허용된 값 목록 밖의 값을 써서 형식 검사에 걸렸다. 한 번은 다시 요청한다(비용은 그 호출분만 더 든다).
    if (!(e instanceof Error) || !e.message.includes("Failed to parse structured output")) throw e;
    res = await attempt(
      `${user}\n\n※ 직전 출력이 정해진 형식에 맞지 않았습니다(허용된 값 목록 밖의 값을 썼습니다). 각 필드에는 허용된 값만 정확히 쓰세요.`,
    );
  }
  addUsage(s, res.usage);
  if (res.stop_reason === "refusal") throw new LlmRefusal("모델이 응답을 거부했습니다");
  if (res.stop_reason === "max_tokens") throw new Error("응답이 길이 제한으로 잘렸습니다");
  if (!res.parsed_output) throw new Error("응답을 형식에 맞게 읽지 못했습니다");
  return res.parsed_output as z.infer<S>;
}

/** 스펙처럼 길고 고정된 앞부분은 캐시해서 두 번째 호출부터 싸고 빠르게 한다. */
export const cached = (text: string): Anthropic.TextBlockParam => ({
  type: "text",
  text,
  cache_control: { type: "ephemeral", ttl: "1h" },
});
export const plain = (text: string): Anthropic.TextBlockParam => ({ type: "text", text });
