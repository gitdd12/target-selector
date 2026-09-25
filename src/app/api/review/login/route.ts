import { env } from "@/lib/env";
import { passwordOk, REVIEW_COOKIE, tokenFor } from "@/lib/reviewAuth";

// 검토 화면 로그인. 맞으면 쿠키를 심고 /review로 보낸다(자바스크립트 없이 동작하는 일반 폼).
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const pw = String(form?.get("password") ?? "");
  const base = new URL(req.url).origin;
  if (!passwordOk(pw)) return Response.redirect(`${base}/review?error=1`, 303);
  const secure = process.env.VERCEL ? "; Secure" : "";
  return new Response(null, {
    status: 303,
    headers: {
      Location: `${base}/review`,
      "Set-Cookie": `${REVIEW_COOKIE}=${tokenFor(env("REVIEW_PASSWORD"))}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${secure}`,
    },
  });
}
