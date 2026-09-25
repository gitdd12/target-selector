import { json, withSession } from "@/lib/api";
import { toPublic } from "@/lib/public";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  return withSession(id, async (s) => json(toPublic(s)));
}

// 참가자 화면의 "내 기록 삭제" 버튼과 이 삭제 API는 없앴다. 삭제 요청은 안내문의 문의 메일로 받고 운영자가 처리한다(npm run cleanup).
