import LandingV2Cta from "./LandingV2Cta";

// 기본 첫 화면(/). 제목 하나 + 시작 버튼 하나만 있는 가장 단순한 버전(친구들 테스트용).
// 시작 버튼 자체는 LandingV2Cta를 그대로 써서, 참여 코드·인원 마감·이어서 하기 같은 기존 로직을 그대로 가져간다.
export default function LandingSimple({ needsCode, full }: { needsCode: boolean; full: boolean }) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        textAlign: "center",
      }}
    >
      <h1 className="q-title" style={{ fontSize: 28, marginBottom: 32 }}>
        경험기반 진로 추천 서비스
      </h1>
      <div style={{ width: "100%", maxWidth: 320 }}>
        <LandingV2Cta needsCode={needsCode} full={full} />
      </div>
    </div>
  );
}
