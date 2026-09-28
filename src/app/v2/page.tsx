import type { Metadata } from "next";
import LandingV2 from "@/components/LandingV2";
import { env } from "@/lib/env";
import { MAX_SESSIONS } from "@/lib/config";
import { getStore } from "@/lib/store";

// 새 랜딩 샘플. 지금 첫 화면(/)은 그대로 두고, 컨펌 전까지 여기서만 본다.
export const metadata: Metadata = { title: "코어 찾기 — 새 랜딩 샘플" };
// 참가자 수 상한을 매번 확인해야 해서 미리 만들어 두지 않고 요청 때마다 그린다(/의 page.tsx와 같은 이유).
export const dynamic = "force-dynamic";

export default async function V2() {
  let full = false;
  try {
    full = (await getStore().count()) >= MAX_SESSIONS;
  } catch {
    // 저장소를 못 읽어도 첫 화면은 보여준다(시작할 때 다시 확인됨)
  }
  return <LandingV2 needsCode={Boolean(env("BETA_CODE"))} contact={env("CONTACT_EMAIL")} full={full} />;
}
