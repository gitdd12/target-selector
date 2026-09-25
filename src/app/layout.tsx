import type { Metadata, Viewport } from "next";
import "./globals.css";


export const metadata: Metadata = {
  title: "코어 찾기",
  description: "AI와 이야기하며 내가 일하는 방식의 코어를 찾아보는 커리어 탐색 (베타)",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  interactiveWidget: "resizes-content", // 안드로이드 크롬: 키보드가 올라오면 화면 높이 자체를 줄인다
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        {/* 자체 호스팅한 Pretendard(unicode-range로 필요한 조각만 내려받음) */}
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link
          rel="stylesheet"
          href="/fonts/pretendard/pretendardvariable-dynamic-subset.css"
        />
      </head>
      <body>
        <div className="stage">{children}</div>
      </body>
    </html>
  );
}
