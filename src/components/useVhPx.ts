"use client";

import { useEffect } from "react";

/**
 * 모바일 브라우저는 스크롤하면 주소창이 접히거나 펼쳐지면서 실제 보이는 화면 높이가 바뀐다.
 * `100vh`/`100svh`/`100lvh`를 섞어 쓰면 이때 값이 서로 어긋나 스크롤 애니메이션이 흔들리거나
 * 화면이 끊긴다(예전 랜딩이 깨졌던 원인). 그래서 화면 높이가 필요한 계산은 전부
 * 실제 `window.innerHeight`를 담은 이 변수(`--vh-px`) 하나만 쓴다. CSS에서 계산할 값과
 * JS에서 진행도를 계산할 때 쓰는 값이 항상 같은 숫자에서 나오므로 어긋나지 않는다.
 */
export function useVhPx() {
  useEffect(() => {
    const root = document.documentElement;
    const set = () => root.style.setProperty("--vh-px", `${window.innerHeight}px`);
    set();
    addEventListener("resize", set);
    addEventListener("orientationchange", set);
    return () => {
      removeEventListener("resize", set);
      removeEventListener("orientationchange", set);
    };
  }, []);
}
