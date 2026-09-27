"use client";

import { useEffect } from "react";

// 새 랜딩(/v2)의 움직임 두 가지.
//   1) [data-reveal]: 화면에 들어오면 한 번 떠오른다.
//   2) [data-rise]: 줄 세우기 섹션. 스크롤을 내리는 만큼 가운데 "나" 점이 줄 위로 올라온다(--rise 0→1).
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

    const rise = root.querySelector<HTMLElement>("[data-rise]");
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (!rise) return;
        const r = rise.getBoundingClientRect();
        const vh = window.innerHeight;
        // 섹션 윗부분이 화면 70% 지점에 닿을 때 0, 섹션 가운데가 화면 가운데에 올 때 1
        const p = (vh * 0.7 - r.top) / (vh * 0.2 + r.height / 2);
        rise.style.setProperty("--rise", String(Math.max(0, Math.min(1, p))));
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      delete root.dataset.motion;
    };
  }, []);
  return null;
}
