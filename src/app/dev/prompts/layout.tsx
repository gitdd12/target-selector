// 지시문은 길어서 데스크톱에서 넓게 보이도록 폭을 넓힌다.
export default function PromptsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`.stage{max-width:920px}`}</style>
      {children}
    </>
  );
}
