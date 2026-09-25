import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ResultView from "@/components/ResultView";
import { env } from "@/lib/env";
import { isReviewer } from "@/lib/reviewAuth";
import { getStore, isValidId } from "@/lib/store";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "코어 찾기 · 결과지", robots: { index: false, follow: false } };

// 참가자가 이메일로 받은 링크로 여는 결과지. 운영자가 검토를 마치고 공개하기 전에는 열리지 않는다.
export default async function ResultPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ preview?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  if (!isValidId(id)) notFound();
  const s = await getStore().get(id);
  if (!s) notFound();
  const preview = sp.preview === "1" && (await isReviewer());
  if (!s.report || !(s.published || preview)) {
    return (
      <div className="app" style={{ paddingTop: 90, textAlign: "center" }}>
        <div className="q-title">결과지를 다듬는 중이에요</div>
        <div className="q-sub">검토를 마치는 대로 이메일로 알려드릴게요.</div>
      </div>
    );
  }
  return (
    <>
      <style>{`.stage{max-width:620px}`}</style>
      <ResultView session={s} contact={env("CONTACT_EMAIL")} preview={preview && !s.published} />
    </>
  );
}
