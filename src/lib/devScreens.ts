// 개발용 미리보기(/dev)에서 볼 수 있는 화면 목록. 가짜 데이터로만 그리며 AI를 부르지 않는다(비용 0원).
export interface DevScreenInfo {
  key: string;
  group: string;
  label: string;
  note?: string;
}

export const DEV_SCREENS: DevScreenInfo[] = [
  { key: "landing", group: "시작 화면", label: "첫 화면 (동의 안내)", note: "시작 버튼은 눌러도 실제로 시작되지 않아요" },
  { key: "landing-full", group: "시작 화면", label: "첫 화면 (참가자 마감)" },

  { key: "targets-intro", group: "10초 대상 고르기", label: "① 안내 + 연습" },
  { key: "targets-rating", group: "10초 대상 고르기", label: "② 10초 평가 (타이머 바)", note: "10초가 지나면 자동으로 다음 대상으로 넘어가요" },
  { key: "targets-eliminate", group: "10초 대상 고르기", label: "③ 덜 끌리는 것 지우기 (6개)" },
  { key: "targets-eliminate-few", group: "10초 대상 고르기", label: "③ 지우기 (이미 3개뿐일 때)", note: "4개 이하여도 더 지울 수 있어야 해요" },
  { key: "targets-candidates", group: "10초 대상 고르기", label: "④ 고른 대상 확인" },

  { key: "chat-normal", group: "채팅", label: "채팅 — 대화 중 (경험 1)", note: "위쪽 DEV 메뉴로 다른 상태로 바꿀 수 있어요. 글을 보내면 가짜 답이 와요" },
  { key: "chat-typing", group: "채팅", label: "채팅 — AI 답 생각 중" },
  { key: "chat-card", group: "채팅", label: "채팅 — 재진술 카드 + 버튼 두 개" },
  { key: "chat-after-card", group: "채팅", label: "채팅 — 카드를 본 뒤 (‘다음 질문으로 넘어가기’ 남음)" },
  { key: "chat-closing", group: "채팅", label: "채팅 — 창이 끝나고 정리하는 중" },
  { key: "chat-closing-error", group: "채팅", label: "채팅 — 정리하다 오류 (다시 시도 버튼)" },
  { key: "chat-extra", group: "채팅", label: "채팅 — 경험 2 뒤 ‘경험 하나 더 이야기하기’ 선택 카드" },
  { key: "chat-values", group: "채팅", label: "채팅 — 가치관 질문 창 (대상 표시 없음)" },

  { key: "situation", group: "끝난 뒤", label: "현재 상태 고르기 팝업 (이메일 화면 앞)" },
  { key: "complete-email", group: "끝난 뒤", label: "이메일 입력 화면" },
  { key: "complete-done", group: "끝난 뒤", label: "이메일 접수 후 화면" },
];

export const DEV_SCREEN_KEYS = DEV_SCREENS.map((s) => s.key);
