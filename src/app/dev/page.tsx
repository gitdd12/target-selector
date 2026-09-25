import Link from "next/link";
import { DEV_SCREENS } from "@/lib/devScreens";

export default function DevHome() {
  const groups = [...new Set(DEV_SCREENS.map((s) => s.group))];
  return (
    <div className="app">
      <div className="eyebrow">개발용 미리보기</div>
      <div className="q-title">질문에 답하지 않고 화면을 바로 봐요</div>
      <div className="q-sub">
        가짜 데이터로 실제 화면을 그대로 그려요. AI를 부르지 않아서 비용이 들지 않고, 아무것도 저장되지 않아요. 문구나 화면을 고친 뒤 여기서 바로
        확인하세요.
      </div>

      {groups.map((g) => (
        <section key={g} style={{ marginTop: 22 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            {g}
          </div>
          {DEV_SCREENS.filter((s) => s.group === g).map((s) => (
            <Link key={s.key} href={`/dev/${s.key}`} style={{ textDecoration: "none", color: "inherit" }}>
              <div className="card" style={{ marginBottom: 8, padding: "13px 16px" }}>
                <div style={{ fontSize: 14.5, fontWeight: 600 }}>{s.label}</div>
                {s.note && <div className="q-note" style={{ marginTop: 4 }}>{s.note}</div>}
              </div>
            </Link>
          ))}
        </section>
      ))}

      <section style={{ marginTop: 26 }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>
          지시문·문구 확인
        </div>
        <Link href="/dev/prompts" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="card" style={{ padding: "13px 16px" }}>
            <div style={{ fontSize: 14.5, fontWeight: 600 }}>AI 지시문과 고정 문구 보기</div>
            <div className="q-note" style={{ marginTop: 4 }}>
              스펙을 고친 뒤 AI가 실제로 받는 지시문에 반영됐는지 AI 호출 없이 확인해요
            </div>
          </div>
        </Link>
      </section>
    </div>
  );
}
