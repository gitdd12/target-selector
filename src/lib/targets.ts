import type { Target } from "./types";

// index.html의 대상 15개와 척도 문구를 그대로 가져왔다.
export const TARGET_LIST: Target[] = [
  { id: 1, category: "물질", name: "신체 (움직임, 자세, 체력)" },
  { id: 2, category: "물질", name: "재료 (음식, 나무, 천, 흙, 금속)" },
  { id: 3, category: "물질", name: "기계·장비 (가전, 차량, 공구, 설비)" },
  { id: 4, category: "물질", name: "공간 (방, 매장, 건물, 무대)" },
  { id: 5, category: "물질", name: "물건 (수집품, 옷, 장비, 상품)" },
  { id: 6, category: "물질", name: "생물 (식물, 동물)" },
  { id: 7, category: "사람", name: "사람, 관계" },
  { id: 8, category: "기호", name: "글, 문서" },
  { id: 9, category: "기호", name: "데이터, 숫자" },
  { id: 10, category: "기호", name: "코드" },
  { id: 11, category: "기호", name: "수식" },
  { id: 12, category: "기호", name: "개념, 전략, 규칙" },
  { id: 13, category: "기호", name: "그림, 이미지, 디자인" },
  { id: 14, category: "기호", name: "소리, 음악" },
  { id: 15, category: "기호", name: "영상" },
];

export const SCALE_LABELS: Record<number, string> = {
  1: "매우 안 끌린다",
  2: "안 끌린다",
  3: "아주 조금 안 끌린다",
  4: "보통이다",
  5: "아주 조금 끌린다",
  6: "끌린다",
  7: "매우 끌린다",
};

export const RATE_SECONDS = 10; // 대상마다 10초 안에 답한다
export const TARGET_COUNT = 4; // 이 개수 이하가 되면 멈출 수 있다(더 지워도 된다)
