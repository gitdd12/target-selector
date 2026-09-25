import SessionApp from "@/components/SessionApp";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SessionApp id={id} />;
}
