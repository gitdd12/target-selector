// 검토용 화면은 데스크톱에서 넓게 보이도록 폭을 넓힌다(참가자 화면은 모바일 폭 그대로).
export default function ReviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`.stage{max-width:880px}`}</style>
      {children}
    </>
  );
}
