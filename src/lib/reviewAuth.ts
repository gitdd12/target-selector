import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { env } from "./env";

// 검토용 화면(/review) 보호. 환경변수 REVIEW_PASSWORD가 없으면 화면 자체가 꺼진다.
export const REVIEW_COOKIE = "review_token";
export const reviewEnabled = () => Boolean(env("REVIEW_PASSWORD"));

// 비밀번호 자체를 쿠키에 넣지 않고, 비밀번호로 만든 표식(해시)만 넣는다.
export const tokenFor = (pw: string) => createHmac("sha256", pw).update("core-finder-review-v1").digest("hex");

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export function passwordOk(input: string): boolean {
  const pw = env("REVIEW_PASSWORD");
  return pw.length > 0 && same(tokenFor(input), tokenFor(pw));
}

export async function isReviewer(): Promise<boolean> {
  const pw = env("REVIEW_PASSWORD");
  if (!pw) return false;
  const c = (await cookies()).get(REVIEW_COOKIE)?.value ?? "";
  return same(c, tokenFor(pw));
}
