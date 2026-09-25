import Landing from "@/components/Landing";
import { env } from "@/lib/env";
import { MAX_SESSIONS } from "@/lib/config";
import { getStore } from "@/lib/store";

// 참가자 수 상한을 매번 확인해야 해서 미리 만들어 두지 않고 요청 때마다 그린다.
export const dynamic = "force-dynamic";

export default async function Home() {
  let full = false;
  try {
    full = (await getStore().count()) >= MAX_SESSIONS;
  } catch {
    // 저장소를 못 읽어도 첫 화면은 보여준다(시작할 때 다시 확인됨)
  }
  return <Landing needsCode={Boolean(env("BETA_CODE"))} contact={env("CONTACT_EMAIL")} full={full} />;
}
