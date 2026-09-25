import Link from "next/link";
import { env } from "@/lib/env";

// 개인정보 처리 안내 초안. 정식 공개 전에 전문가(변호사·개인정보 담당자) 검토를 받을 것.
export default function Privacy() {
  const contact = env("CONTACT_EMAIL") || "(운영자 연락처 기입 필요)";
  return (
    <div className="app privacy">
      <h1>개인정보 처리 안내 (베타)</h1>
      <p>&lsquo;코어 찾기&rsquo; 베타가 이야기 내용과 이메일을 어떻게 다루는지 알려드려요.</p>

      <h2>1. 받는 정보와 쓰는 목적</h2>
      <ul>
        <li>채팅으로 적어준 내용, 대상 고르기에서의 선택과 응답 시간</li>
        <li>결과지를 받을 이메일 주소</li>
        <li>
          목적: 결과지 생성과 발송, 질문과 결과지를 개선하기 위한 분석. 개선을 위한 분석에는 이메일을 제외하고 사용해요.
        </li>
        <li>이름·전화번호 등 나를 직접 알아볼 수 있는 정보는 받지 않아요. 채팅에 스스로 적은 경우는 예외라서, 적지 않기를 권해요.</li>
      </ul>

      <h2>2. 운영자가 보는 것</h2>
      <ul>
        <li>결과지를 검토하고 다듬기 위해 운영자가 채팅 내용을 직접 읽어요.</li>
        <li>결과지는 운영자가 확인한 뒤 3일 안에 이메일로 보내요.</li>
      </ul>

      <h2>3. 보관과 삭제</h2>
      <ul>
        <li>이메일은 대화 기록과 따로 저장하고, 결과지를 보낸 뒤 30일 안에 삭제해요.</li>
        <li>대화 기록은 베타가 끝난 뒤 90일 안에 삭제해요.</li>
        <li>원하면 언제든 문의 메일로 알려주세요. 대화 기록과 이메일을 바로 삭제해요.</li>
      </ul>

      <h2>4. AI 처리와 국외 이전</h2>
      <ul>
        <li>답변과 결과지 초안은 AI(Anthropic의 Claude)가 만들어요. 이를 위해 적어준 내용이 미국에 있는 Anthropic 서버로 전송돼 처리돼요.</li>
        <li>저장 서비스로 Supabase, 서비스 운영에 Vercel을 이용해요.</li>
      </ul>

      <h2>5. 참여 조건</h2>
      <ul>
        <li>이 안내를 확인한 뒤 시작 버튼을 눌러야 정보가 수집돼요. 시작하지 않으면 아무 정보도 받지 않아요.</li>
        <li>만 14세 이상만 참여할 수 있어요.</li>
      </ul>

      <h2>6. 문의</h2>
      <p>{contact}</p>

      <div style={{ height: 20 }} />
      <Link href="/">
        <button className="btn-ghost">돌아가기</button>
      </Link>
    </div>
  );
}
