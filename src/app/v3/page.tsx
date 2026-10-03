import LandingV2 from "@/components/LandingV2";
import { env } from "@/lib/env";
import { MAX_SESSIONS } from "@/lib/config";
import { getStore } from "@/lib/store";

// 스크롤 연출이 있던 랜딩. 기본 첫 화면(/) 자리를 더 단순한 버전(LandingSimple)에 내주고 여기로 옮겨와 보존한다.
export const dynamic = "force-dynamic";

export default async function V3() {
  let full = false;
  try {
    full = (await getStore().count()) >= MAX_SESSIONS;
  } catch {
    // 저장소를 못 읽어도 첫 화면은 보여준다(시작할 때 다시 확인됨)
  }
  return <LandingV2 needsCode={Boolean(env("BETA_CODE"))} contact={env("CONTACT_EMAIL")} full={full} />;
}
