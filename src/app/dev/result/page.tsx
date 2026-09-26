import ResultView from "@/components/ResultView";
import type { Session } from "@/lib/types";

// 개발용 미리보기: 결과지 화면을 가짜 데이터로 그려 본다(AI 비용 0원). 인물·직업 내용은 모양을 보기 위한 예시일 뿐이다.
const sample = {
  report: {
    cores: [
      {
        core: "알기",
        behavior: "끊긴 흐름이 이어질 때까지 앞뒤를 맞춰 봐요",
        restatement: "팀 발표 자료를 합치다가 앞뒤가 안 이어지는 슬라이드를 봤어요.\n맡은 건 6장뿐이었는데 전체를 처음부터 다시 읽었어요.\n새벽에 \"이제 이야기가 이어진다\" 싶을 때 멈췄어요.",
        pattern: "이해가 안 서는 자리를 그냥 두지 않아요. '이어지는가'가 멈추는 기준이에요.",
        cost_note: "이해가 서야 멈추다 보니, 분량으로 평가받는 일에서는 들인 시간만큼 인정받지 못할 때가 있어요.",
      },
      {
        core: "짜기",
        behavior: "흩어진 조각을 하나의 구조로 엮어 봐요",
        restatement: "동아리 행사 준비물이 여기저기 흩어져 있었어요." + String.fromCharCode(10) + "체크리스트를 만들어 담당을 나눴어요.",
        pattern: "따로 놀던 것을 한 판에 올려 놓아야 마음이 놓여요.",
        cost_note: "",
        bridge: { usable: "여러 사람의 일을 한 계획으로 묶는 일에 쓰일 수 있어요.", unknown: "사람을 이끄는 일이 맞는지는 알 수 없어요.", say: "" },
      },
      {
        core: "꺼내기",
        behavior: "머릿속 생각을 밖으로 내놓아야 정리돼요",
        restatement: "생각이 복잡할 때마다 글로 써 보면 정리됐어요.",
        pattern: "말이나 글로 꺼내는 과정에서 생각이 또렷해져요.",
        cost_note: "",
        bridge: { usable: "생각을 글이나 말로 설명하는 일에 쓰일 수 있어요.", unknown: "남 앞에서 발표하는 일이 맞는지는 알 수 없어요.", say: "" },
      },
    ],
    values: {
      short: "이유를 알아야 움직이는",
      summary: "어디로 가는지 감이 안 잡히는 상태를 오래 못 버텨요.",
      important: "\"어디로 가고 있는지 감이 잡히는 것\"을 중요하게 여겨요.",
      hard: "이유를 묻지 않고 양식만 채우는 일이 가장 힘들었다고 했어요.",
      alive: "흩어진 자료가 왜 그렇게 연결되는지 직접 따져볼 여지가 있는 일에서 힘이 붙어요.",
      stuck: "\"원래 그렇게 한다\"는 답만 돌아오는 일에서는 손이 잘 안 나가고 대충 마무리하게 됐을 수 있어요.",
    },
    object: { label: "글·문서, 개념·규칙", note: "지금 이야기에서 드러난 대상이에요. 살면서 바뀔 수 있어요." },
    explore: {
      items: [
        { title: "궁금한 뉴스 하나를 끝까지 찾아보기", do: "이번 주에 궁금해진 뉴스 하나를 골라 이유가 이어질 때까지 찾아보세요.", why: "이해되는 순간이 좋은지 알 수 있어요." },
        { title: "남이 쓴 글 하나를 내 문장으로 고쳐 써 보기", do: "공개된 글 하나를 골라 안 맞는 곳을 고쳐 써 보세요.", why: "남의 글에서도 그 일이 재밌는지 알 수 있어요." },
        { title: "발표 자료 한두 장을 처음부터 만들어 보기", do: "관심 있는 주제로 발표 자료를 처음부터 만들어 보세요.", why: "만드는 쪽이 더 좋았을 수도 있어요." },
      ],
      common_why: "예시 경험을 하면서 하셨던 많은 행동 중에서, 정확히 어떤 행동이 끌리는지 찾아내는 거예요.",
    },
    hold_note: "",
  },
  jobPick: {
    picks: [
      { code: "13-1111", title_en: "Management Analyst", title_ko: "경영 분석가", why: "흩어진 자료의 흐름을 잇는 일이에요.", qualification_note: "" },
      { code: "15-2031", title_en: "Operations Research Analyst", title_ko: "운영 분석가", why: "이유를 따져 구조를 이해하는 일이에요.", qualification_note: "" },
    ],
    excluded: [],
  },
  celebDraft: {
    candidates: [
      {
        name: "예시 인물 A",
        field_and_era: "예시 · 화면 확인용",
        for_pattern: "끊긴 흐름을 잇는 방식",
        why_similar: "끊어진 설명을 그냥 넘기지 않고 끝까지 이어 붙이려 한 점이 닮았어요.",
        scenes: [
          { title: "끊긴 설명을 붙잡은 밤", scene: "이 장면은 화면 확인을 위한 예시 글이에요. 실제 결과지에서는 출처가 확인된 실제 장면이 들어가요.", strength: "이유가 이어질 때까지 멈추지 않아요.", cost: "" },
          { title: "다시 처음부터", scene: "두 번째 예시 장면이에요. 카드를 옆으로 넘기면 이렇게 장면이 이어져요.", strength: "틀린 곳을 발견하면 처음으로 돌아가요.", cost: "돌아가는 만큼 시간이 더 들었어요." },
        ],
        at_your_scale: "",
        source_hint: "예시 출처 (실제 결과지에서는 검증된 출처가 표시돼요)",
        verification_queries: [],
        confidence: "높음" as const,
      },
      {
        name: "예시 인물 B",
        field_and_era: "예시 · 화면 확인용",
        for_pattern: "끊긴 흐름을 잇는 방식",
        why_similar: "흩어진 관찰을 하나의 설명으로 묶으려 한 점이 닮았어요.",
        scenes: [{ title: "관찰을 하나로", scene: "예시 장면이에요. 카드는 눌러서 떠오르고 뒷배경은 흐려져요.", strength: "흩어진 조각을 한 이야기로 묶어요.", cost: "" }],
        at_your_scale: "",
        source_hint: "예시 출처",
        verification_queries: [],
        confidence: "보통" as const,
      },
    ],
    notes: "",
  },
  approvedCelebs: [0, 1],
  published: true,
  situation: "exploring",
  reliability: [
    { grade: "최상", met: ["요구된 것보다 더 들인 수고", "다른 때에도 같은 방식으로 되풀이함", "과정이나 결과물 자체에서 얻은 만족", "방법·순서·범위를 스스로 정함"] },
    { grade: "상", met: ["요구된 것보다 더 들인 수고", "다른 때에도 같은 방식으로 되풀이함", "방법·순서·범위를 스스로 정함"] },
    { grade: "중", met: ["과정이나 결과물 자체에서 얻은 만족", "방법·순서·범위를 스스로 정함"] },
  ],
  targets: {
    survivors: [
      { id: 2, name: "재료 (음식, 나무, 천, 흙, 금속)", category: "물질" },
      { id: 4, name: "공간 (방, 매장, 건물, 무대)", category: "물질" },
      { id: 8, name: "글, 문서", category: "기호" },
      { id: 12, name: "개념, 전략, 규칙", category: "기호" },
    ],
  },
} as unknown as Session;

// ?n=1|2|3 으로 코어 개수를 바꿔 볼 수 있다. DEV_REPORT_FILE 환경변수에 결과지 JSON 경로를 주면 그 내용으로 그린다(시험용).
export default async function DevResult({ searchParams }: { searchParams: Promise<{ n?: string }> }) {
  const { n } = await searchParams;
  const count = Math.max(1, Math.min(3, Number(n) || 3));
  let session = sample;
  const file = process.env.DEV_REPORT_FILE;
  if (file) {
    const fs = await import("node:fs");
    const loaded = JSON.parse(fs.readFileSync(file, "utf8"));
    session = { ...sample, ...loaded, report: { ...sample.report, ...loaded.report } } as Session;
  } else {
    session = {
      ...sample,
      report: { ...sample.report, cores: sample.report!.cores.slice(0, count) },
      reliability: sample.reliability?.slice(0, count),
    } as Session;
  }
  return (
    <>
      <style>{`.stage{max-width:620px}`}</style>
      <ResultView session={session} contact="hello@example.com" />
    </>
  );
}
