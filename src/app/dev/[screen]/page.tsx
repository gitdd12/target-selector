import { notFound } from "next/navigation";
import DevScreen from "@/components/DevScreen";
import { DEV_SCREEN_KEYS } from "@/lib/devScreens";

export default async function DevScreenPage({ params }: { params: Promise<{ screen: string }> }) {
  const { screen } = await params;
  if (!DEV_SCREEN_KEYS.includes(screen)) notFound();
  return <DevScreen name={screen} />;
}
