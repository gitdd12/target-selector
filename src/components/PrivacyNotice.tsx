import Link from "next/link";

// 개인정보 수집·이용 안내. Landing(v1)과 LandingV2Cta에서 같은 내용을 쓴다.
export default function PrivacyNotice({
  contact,
  className,
  listClassName,
  linkWrapClassName,
}: {
  contact: string;
  className?: string;
  listClassName?: string;
  linkWrapClassName?: string;
}) {
  return (
    <details className={className}>
      <summary>개인정보 수집·이용 안내</summary>
      <dl className={listClassName}>
        <dt>받는 정보</dt>
        <dd>
          채팅으로 적어준 내용, 대상 고르기에서의 선택과 응답 시간, 결과지를 받을 이메일. 이메일은 대화 기록과 따로 저장해요. 이름·연락처·회사명은 받지
          않아요.
        </dd>
        <dt>쓰는 목적</dt>
        <dd>결과지 생성과 발송, 그리고 질문과 결과지를 개선하기 위한 분석. 개선을 위한 분석에는 이메일을 제외하고 사용해요.</dd>
        <dt>운영자가 보는 것</dt>
        <dd>결과지를 검토하고 다듬으려고 운영자가 여러분이 적은 대화 내용을 직접 읽어요. 결과지는 3일 안에 이메일로 보내드려요.</dd>
        <dt>보관 기간</dt>
        <dd>이메일은 결과지를 보낸 뒤 30일 안에, 대화 기록은 베타가 끝난 뒤 90일 안에 삭제해요. 그 전에도 원하면 문의 메일로 알려주면 바로 지워드려요.</dd>
        <dt>AI 처리와 해외 전송</dt>
        <dd>
          AI가 답변과 결과지 초안을 만들려면 적어준 내용이 AI 회사(Anthropic, 미국)의 서버로 전송돼 처리돼요. 이 회사가 이 내용을 자기 목적으로 쓰지
          않도록 서비스 이용 조건에 따라 처리를 맡기고 있어요.
        </dd>
        <dt>참여 조건</dt>
        <dd>만 14세 이상이면 참여할 수 있어요. 건강·종교·정치 성향 같은 민감한 내용은 적지 않아도 돼요.</dd>
        <dt>문의·삭제 요청</dt>
        <dd>{contact ? contact : "운영자에게 직접 알려주세요."}</dd>
      </dl>
      <div className={linkWrapClassName} style={{ marginTop: 10 }}>
        <Link href="/privacy">개인정보 처리 안내 전문</Link>
      </div>
    </details>
  );
}
