import Link from "next/link";
import { isReviewer, reviewEnabled } from "@/lib/reviewAuth";

export const dynamic = "force-dynamic";

// 개발용 미리보기는 검토 화면과 같은 비밀번호로 잠겨 있다(REVIEW_PASSWORD). 로그인은 /review에서 한다.
export default async function DevLayout({ children }: { children: React.ReactNode }) {
  if (!reviewEnabled() || !(await isReviewer())) {
    return (
      <div className="app" style={{ paddingTop: 60 }}>
        <div className="q-title">개발용 미리보기</div>
        <div className="q-sub">
          운영자만 볼 수 있어요. 먼저 검토 화면에서 비밀번호로 로그인한 뒤 다시 열어주세요.
        </div>
        <Link href="/review">
          <button className="btn-primary" style={{ marginTop: 16 }}>
            검토 화면에서 로그인
          </button>
        </Link>
      </div>
    );
  }
  return <>{children}</>;
}
