import type { Metadata } from "next";
import LandingV2 from "@/components/LandingV2";

// 새 랜딩 샘플. 지금 첫 화면(/)은 그대로 두고, 컨펌 전까지 여기서만 본다.
export const metadata: Metadata = { title: "코어 찾기 — 새 랜딩 샘플" };

export default function V2() {
  return <LandingV2 />;
}
