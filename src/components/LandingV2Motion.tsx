"use client";

import { useEffect } from "react";

// 새 랜딩(/v2)의 움직임: [data-reveal] 요소는 화면에 들어오면 한 번 떠오른다.
// 움직임 줄이기 설정이면 아무것도 하지 않는다(모두 처음부터 보인다). 스크립트가 돌기 전에도 내용은 보인다.
export default function LandingV2Motion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>("[data-landing-v2]");
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    root.dataset.motion = "on";

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          (e.target as HTMLElement).dataset.shown = "";
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.1 },
    );
    root.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));

    return () => {
      io.disconnect();
      delete root.dataset.motion;
    };
  }, []);
  return null;
}
