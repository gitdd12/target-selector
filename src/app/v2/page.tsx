import Landing from "@/components/Landing";
import { env } from "@/lib/env";
import { MAX_SESSIONS } from "@/lib/config";
import { getStore } from "@/lib/store";

// 원래 랜딩. 이제는 기본 첫 화면(/) 자리를 새 랜딩(LandingV2)에 내주고 여기로 옮겨와 보존한다.
export const dynamic = "force-dynamic";

export default async function V2() {
  let full = false;
  try {
    full = (await getStore().count()) >= MAX_SESSIONS;
  } catch {
    // 저장소를 못 읽어도 첫 화면은 보여준다(시작할 때 다시 확인됨)
  }
  return <Landing needsCode={Boolean(env("BETA_CODE"))} contact={env("CONTACT_EMAIL")} full={full} />;
}
