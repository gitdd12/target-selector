import ResultView from "@/components/ResultView";
import type { Session } from "@/lib/types";

// 개발용 미리보기: 결과지 화면을 가짜 데이터로 그려 본다(AI 비용 0원). 인물·직업 내용은 모양을 보기 위한 예시일 뿐이다.
// 기본은 새 형식(v0.27: 코어 칸 안의 직업 목록, 대상 칸 없음). ?legacy=1 은 예전 형식(대상 칸·어울리는 직업·직무와 연결하면)이 그대로 보이는지 확인용.
const legacy = {
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
    { grade: "상", met: ["요구된 것 말고 스스로 보탠 부분", "과정이나 결과물 자체에서 얻은 만족", "다른 때에도 같은 방식으로 되풀이함"] },
    { grade: "상", met: ["요구된 것 말고 스스로 보탠 부분", "과정이나 결과물 자체에서 얻은 만족", "다른 때에도 같은 방식으로 되풀이함"] },
    { grade: "중", met: ["요구된 것 말고 스스로 보탠 부분", "과정이나 결과물 자체에서 얻은 만족"] },
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


// 직업 목록 예시: 수동 판정으로 돌린 직업 로직 결과(근거 번역은 미리보기용 글)
const JOB_LISTS = [
  {
    "core": 0,
    "confirmed": [
      {
        "soc": "27-3043.05",
        "name": "시인·작사가·창작 작가",
        "desc": "시·에세이·노랫말 등 창작 글을 쓰는 일",
        "score": 0.2043,
        "match": 82,
        "object": "글·문서",
        "evidence": [
          {
            "text": "Plan project arrangements or outlines, and organize material accordingly.",
            "quote": "Plan project arrangements or outlines, and organize material accordingly.",
            "ko": "(미리보기용) Plan project arrangements or outlines, a → [[행동에 해당하는 부분]]을 굵게 보여줘요."
          },
          {
            "text": "Revise written material to meet personal standards and to satisfy needs of clients, publishers, directors, or producers.",
            "quote": "Revise written material to meet personal standards and to satisfy needs of clients, publishers, directors, or producers.",
            "ko": "(미리보기용) Revise written material to meet personal → [[행동에 해당하는 부분]]을 굵게 보여줘요."
          }
        ]
      },
      {
        "soc": "43-9081.00",
        "name": "교정원",
        "desc": "인쇄 전 원고의 오탈자를 찾아 표시하는 일",
        "score": 0.1866,
        "match": 75,
        "object": "글·문서",
        "evidence": [
          {
            "text": "Mark copy to indicate and correct errors in type, arrangement, grammar, punctuation, or spelling, using standard printers' marks.",
            "quote": "Mark copy to indicate and correct errors in type, arrangement, grammar, punctuation, or spelling, using standard printers' marks.",
            "ko": "(미리보기용) Mark copy to indicate and correct errors → [[행동에 해당하는 부분]]을 굵게 보여줘요."
          }
        ]
      },
      {
        "soc": "43-9022.00",
        "name": "타이피스트",
        "desc": "편지·보고서 등을 타이핑하는 일",
        "score": 0.171,
        "match": 68,
        "object": "글·문서",
        "evidence": [
          {
            "text": "Reformat documents, moving paragraphs or columns.",
            "quote": "Reformat documents, moving paragraphs or columns.",
            "ko": "(미리보기용) Reformat documents, moving paragraphs or → [[행동에 해당하는 부분]]을 굵게 보여줘요."
          },
          {
            "text": "Electronically sort and compile text and numerical data, retrieving, updating, and merging documents as required.",
            "quote": "Electronically sort and compile text and numerical data, retrieving, updating, and merging documents as required.",
            "ko": "(미리보기용) Electronically sort and compile text and → [[행동에 해당하는 부분]]을 굵게 보여줘요."
          }
        ]
      }
    ],
    "other": [
      {
        "soc": "27-4032.00",
        "name": "영상 편집자",
        "desc": "촬영한 영상을 편집해 작품으로 만드는 일",
        "score": 0.4519,
        "match": 100,
        "object": "영상",
        "evidence": [
          {
            "text": "Organize and string together raw footage into a continuous whole according to scripts or the instructions of directors and producers.",
            "quote": "Organize and string together raw footage into a continuous whole according to scripts or the instructions of directors and producers.",
            "ko": "촬영한 원본 영상을 대본이나 감독의 지시에 따라 [[하나로 이어지게 정리해 붙인다]]."
          },
          {
            "text": "Select and combine the most effective shots of each scene to form a logical and smoothly running story.",
            "quote": "Select and combine the most effective shots of each scene to form a logical and smoothly running story.",
            "ko": "(미리보기용) Select and combine the most effective sh → [[행동에 해당하는 부분]]을 굵게 보여줘요."
          }
        ]
      },
      {
        "soc": "43-9031.00",
        "name": "편집 디자이너(DTP)",
        "desc": "글과 그림을 배치해 인쇄물 레이아웃을 만드는 일",
        "score": 0.2617,
        "match": 100,
        "object": "그림·이미지·디자인",
        "evidence": [
          {
            "text": "Position text and art elements from a variety of databases in a visually appealing way to design print or web pages, using knowledge of type styles and size and layout patterns.",
            "quote": "Position text and art elements from a variety of databases in a visually appealing way to design print or web pages, using knowledge of type styles and size and layout patterns.",
            "ko": "(미리보기용) Position text and art elements from a va → [[행동에 해당하는 부분]]을 굵게 보여줘요."
          },
          {
            "text": "Operate desktop publishing software and equipment to design, lay out, and produce camera-ready copy.",
            "quote": "Operate desktop publishing software and equipment to design, lay out, and produce camera-ready copy.",
            "ko": "(미리보기용) Operate desktop publishing software and  → [[행동에 해당하는 부분]]을 굵게 보여줘요."
          }
        ]
      },
      {
        "soc": "27-2041.00",
        "name": "작곡가·지휘자",
        "desc": "곡을 만들거나 연주를 지휘하는 일",
        "score": 0.2233,
        "match": 89,
        "object": "소리·음악",
        "evidence": [
          {
            "text": "Position members within groups to obtain balance among instrumental or vocal sections.",
            "quote": "Position members within groups to obtain balance among instrumental or vocal sections.",
            "ko": "(미리보기용) Position members within groups to obtain → [[행동에 해당하는 부분]]을 굵게 보여줘요."
          },
          {
            "text": "Use gestures to shape the music being played, communicating desired tempo, phrasing, tone, color, pitch, volume, and other performance aspects.",
            "quote": "Use gestures to shape the music being played, communicating desired tempo, phrasing, tone, color, pitch, volume, and other performance aspects.",
            "ko": "(미리보기용) Use gestures to shape the music being pl → [[행동에 해당하는 부분]]을 굵게 보여줘요."
          }
        ]
      }
    ],
    "exploreObjects": [
      {
        "object": "영상",
        "soc": "27-4032.00",
        "name": "영상 편집자",
        "match": 100
      },
      {
        "object": "그림·이미지·디자인",
        "soc": "43-9031.00",
        "name": "편집 디자이너(DTP)",
        "match": 100
      },
      {
        "object": "소리·음악",
        "soc": "27-2041.00",
        "name": "작곡가·지휘자",
        "match": 89
      },
      {
        "object": "물건",
        "soc": "27-1026.00",
        "name": "디스플레이어",
        "match": 60
      }
    ]
  },
  {
    "core": 1,
    "confirmed": [
      {
        "soc": "21-1013.00",
        "name": "가족 치료사",
        "desc": "부부와 가족의 관계 문제를 상담하고 치료하는 일",
        "score": 0.2353,
        "match": 94,
        "object": "사람·관계",
        "evidence": [
          {
            "text": "Counsel clients on concerns, such as unsatisfactory relationships, divorce and separation, child rearing, home management, or financial difficulties.",
            "quote": "Counsel clients on concerns, such as unsatisfactory relationships, divorce and separation, child rearing, home management, or financial difficulties.",
            "ko": "(미리보기용) Counsel clients on concerns, such as uns → [[행동에 해당하는 부분]]을 굵게 보여줘요."
          },
          {
            "text": "Ask questions that will help clients identify their feelings and behaviors.",
            "quote": "Ask questions that will help clients identify their feelings and behaviors.",
            "ko": "(미리보기용) Ask questions that will help clients ide → [[행동에 해당하는 부분]]을 굵게 보여줘요."
          }
        ]
      },
      {
        "soc": "21-1014.00",
        "name": "정신건강 상담사",
        "desc": "마음의 건강을 위해 개인과 집단을 상담하는 일",
        "score": 0.188,
        "match": 75,
        "object": "사람·관계",
        "evidence": [
          {
            "text": "Counsel clients or patients, individually or in group sessions, to assist in overcoming dependencies, adjusting to life, or making changes.",
            "quote": "Counsel clients or patients, individually or in group sessions, to assist in overcoming dependencies, adjusting to life, or making changes.",
            "ko": "(미리보기용) Counsel clients or patients, individuall → [[행동에 해당하는 부분]]을 굵게 보여줘요."
          },
          {
            "text": "Encourage clients to express their feelings and discuss what is happening in their lives, helping them to develop insight into themselves or their relationships.",
            "quote": "Encourage clients to express their feelings and discuss what is happening in their lives, helping them to develop insight into themselves or their relationships.",
            "ko": "(미리보기용) Encourage clients to express their feeli → [[행동에 해당하는 부분]]을 굵게 보여줘요."
          }
        ]
      },
      {
        "soc": "21-1023.00",
        "name": "정신건강 사회복지사",
        "desc": "정신건강·중독 문제를 가진 사람을 평가하고 돕는 일",
        "score": 0.1741,
        "match": 70,
        "object": "사람·관계",
        "evidence": [
          {
            "text": "Counsel clients in individual or group sessions to assist them in dealing with substance abuse, mental or physical illness, poverty, unemployment, or physical abuse.",
            "quote": "Counsel clients in individual or group sessions to assist them in dealing with substance abuse, mental or physical illness, poverty, unemployment, or physical abuse.",
            "ko": "(미리보기용) Counsel clients in individual or group s → [[행동에 해당하는 부분]]을 굵게 보여줘요."
          },
          {
            "text": "Counsel or aid family members to assist them in understanding, dealing with, or supporting the client or patient.",
            "quote": "Counsel or aid family members to assist them in understanding, dealing with, or supporting the client or patient.",
            "ko": "(미리보기용) Counsel or aid family members to assist  → [[행동에 해당하는 부분]]을 굵게 보여줘요."
          }
        ]
      }
    ],
    "other": [
      {
        "soc": "31-1133.00",
        "name": "정신병동 보호사",
        "desc": "정신 질환 환자의 생활을 돕고 살피는 일",
        "score": 0.2313,
        "match": 93,
        "object": "몸·건강",
        "evidence": [
          {
            "text": "Provide patients with cognitive, intellectual, or developmental disabilities with routine physical, emotional, psychological, or rehabilitation care under the direction of nursing or medical staff.",
            "quote": "Provide patients with cognitive, intellectual, or developmental disabilities with routine physical, emotional, psychological, or rehabilitation care under the direction of nursing or medical staff.",
            "ko": "(미리보기용) Provide patients with cognitive, intelle → [[행동에 해당하는 부분]]을 굵게 보여줘요."
          },
          {
            "text": "Aid patients in becoming accustomed to hospital routines.",
            "quote": "Aid patients in becoming accustomed to hospital routines.",
            "ko": "(미리보기용) Aid patients in becoming accustomed to h → [[행동에 해당하는 부분]]을 굵게 보여줘요."
          }
        ]
      },
      {
        "soc": "29-2053.00",
        "name": "정신건강 요양보호사",
        "desc": "정신 질환이 있는 사람을 돌보고 치료 계획을 따르는 일",
        "score": 0.218,
        "match": 87,
        "object": "몸·건강",
        "evidence": [
          {
            "text": "Monitor patients' physical and emotional well-being and report unusual behavior or physical ailments to medical staff.",
            "quote": "Monitor patients' physical and emotional well-being and report unusual behavior or physical ailments to medical staff.",
            "ko": "(미리보기용) Monitor patients' physical and emotional → [[행동에 해당하는 부분]]을 굵게 보여줘요."
          }
        ]
      },
      {
        "soc": "21-1021.00",
        "name": "아동·가족 사회복지사",
        "desc": "아동과 가족이 어려움을 이겨내도록 지원하는 일",
        "score": 0.2158,
        "match": 86,
        "object": "대상 없음",
        "evidence": [
          {
            "text": "Counsel students whose behavior, school progress, or mental or physical impairment indicate a need for assistance, diagnosing students' problems and arranging for needed services.",
            "quote": "Counsel students whose behavior, school progress, or mental or physical impairment indicate a need for assistance, diagnosing students' problems and arranging for needed services.",
            "ko": "(미리보기용) Counsel students whose behavior, school  → [[행동에 해당하는 부분]]을 굵게 보여줘요."
          },
          {
            "text": "Serve as liaisons between students, homes, schools, family services, child guidance clinics, courts, protective services, doctors, and other contacts to help children who face problems, such as disabilities, abuse, or poverty.",
            "quote": "Serve as liaisons between students, homes, schools, family services, child guidance clinics, courts, protective services, doctors, and other contacts to help children who face problems, such as disabilities, abuse, or poverty.",
            "ko": "(미리보기용) Serve as liaisons between students, home → [[행동에 해당하는 부분]]을 굵게 보여줘요."
          }
        ]
      }
    ],
    "exploreObjects": [
      {
        "object": "몸·건강",
        "soc": "31-1133.00",
        "name": "정신병동 보호사",
        "match": 93
      },
      {
        "object": "생물",
        "soc": "39-2011.00",
        "name": "동물 훈련사",
        "match": 41
      },
      {
        "object": "돈·재무",
        "soc": "13-2052.00",
        "name": "개인 자산관리사",
        "match": 7
      }
    ]
  },
  {
    "core": 2,
    "confirmed": [
      {
        "soc": "27-3043.05",
        "name": "시인·작사가·창작 작가",
        "desc": "시·에세이·노랫말 등 창작 글을 쓰는 일",
        "score": 0.2043,
        "match": 82,
        "object": "글·문서",
        "evidence": [
          {
            "text": "Plan project arrangements or outlines, and organize material accordingly.",
            "quote": "Plan project arrangements or outlines, and organize material accordingly.",
            "ko": "(미리보기용) Plan project arrangements or outlines, a → [[행동에 해당하는 부분]]을 굵게 보여줘요."
          },
          {
            "text": "Revise written material to meet personal standards and to satisfy needs of clients, publishers, directors, or producers.",
            "quote": "Revise written material to meet personal standards and to satisfy needs of clients, publishers, directors, or producers.",
            "ko": "(미리보기용) Revise written material to meet personal → [[행동에 해당하는 부분]]을 굵게 보여줘요."
          }
        ]
      },
      {
        "soc": "43-9081.00",
        "name": "교정원",
        "desc": "인쇄 전 원고의 오탈자를 찾아 표시하는 일",
        "score": 0.1866,
        "match": 75,
        "object": "글·문서",
        "evidence": [
          {
            "text": "Mark copy to indicate and correct errors in type, arrangement, grammar, punctuation, or spelling, using standard printers' marks.",
            "quote": "Mark copy to indicate and correct errors in type, arrangement, grammar, punctuation, or spelling, using standard printers' marks.",
            "ko": "(미리보기용) Mark copy to indicate and correct errors → [[행동에 해당하는 부분]]을 굵게 보여줘요."
          }
        ]
      },
      {
        "soc": "43-9022.00",
        "name": "타이피스트",
        "desc": "편지·보고서 등을 타이핑하는 일",
        "score": 0.171,
        "match": 68,
        "object": "글·문서",
        "evidence": [
          {
            "text": "Reformat documents, moving paragraphs or columns.",
            "quote": "Reformat documents, moving paragraphs or columns.",
            "ko": "(미리보기용) Reformat documents, moving paragraphs or → [[행동에 해당하는 부분]]을 굵게 보여줘요."
          },
          {
            "text": "Electronically sort and compile text and numerical data, retrieving, updating, and merging documents as required.",
            "quote": "Electronically sort and compile text and numerical data, retrieving, updating, and merging documents as required.",
            "ko": "(미리보기용) Electronically sort and compile text and → [[행동에 해당하는 부분]]을 굵게 보여줘요."
          }
        ]
      }
    ],
    "other": [
      {
        "soc": "27-4032.00",
        "name": "영상 편집자",
        "desc": "촬영한 영상을 편집해 작품으로 만드는 일",
        "score": 0.4519,
        "match": 100,
        "object": "영상",
        "evidence": [
          {
            "text": "Organize and string together raw footage into a continuous whole according to scripts or the instructions of directors and producers.",
            "quote": "Organize and string together raw footage into a continuous whole according to scripts or the instructions of directors and producers.",
            "ko": "촬영한 원본 영상을 대본이나 감독의 지시에 따라 [[하나로 이어지게 정리해 붙인다]]."
          },
          {
            "text": "Select and combine the most effective shots of each scene to form a logical and smoothly running story.",
            "quote": "Select and combine the most effective shots of each scene to form a logical and smoothly running story.",
            "ko": "(미리보기용) Select and combine the most effective sh → [[행동에 해당하는 부분]]을 굵게 보여줘요."
          }
        ]
      },
      {
        "soc": "43-9031.00",
        "name": "편집 디자이너(DTP)",
        "desc": "글과 그림을 배치해 인쇄물 레이아웃을 만드는 일",
        "score": 0.2617,
        "match": 100,
        "object": "그림·이미지·디자인",
        "evidence": [
          {
            "text": "Position text and art elements from a variety of databases in a visually appealing way to design print or web pages, using knowledge of type styles and size and layout patterns.",
            "quote": "Position text and art elements from a variety of databases in a visually appealing way to design print or web pages, using knowledge of type styles and size and layout patterns.",
            "ko": "(미리보기용) Position text and art elements from a va → [[행동에 해당하는 부분]]을 굵게 보여줘요."
          },
          {
            "text": "Operate desktop publishing software and equipment to design, lay out, and produce camera-ready copy.",
            "quote": "Operate desktop publishing software and equipment to design, lay out, and produce camera-ready copy.",
            "ko": "(미리보기용) Operate desktop publishing software and  → [[행동에 해당하는 부분]]을 굵게 보여줘요."
          }
        ]
      },
      {
        "soc": "27-2041.00",
        "name": "작곡가·지휘자",
        "desc": "곡을 만들거나 연주를 지휘하는 일",
        "score": 0.2233,
        "match": 89,
        "object": "소리·음악",
        "evidence": [
          {
            "text": "Position members within groups to obtain balance among instrumental or vocal sections.",
            "quote": "Position members within groups to obtain balance among instrumental or vocal sections.",
            "ko": "(미리보기용) Position members within groups to obtain → [[행동에 해당하는 부분]]을 굵게 보여줘요."
          },
          {
            "text": "Use gestures to shape the music being played, communicating desired tempo, phrasing, tone, color, pitch, volume, and other performance aspects.",
            "quote": "Use gestures to shape the music being played, communicating desired tempo, phrasing, tone, color, pitch, volume, and other performance aspects.",
            "ko": "(미리보기용) Use gestures to shape the music being pl → [[행동에 해당하는 부분]]을 굵게 보여줘요."
          }
        ]
      }
    ],
    "exploreObjects": [
      {
        "object": "영상",
        "soc": "27-4032.00",
        "name": "영상 편집자",
        "match": 100
      },
      {
        "object": "그림·이미지·디자인",
        "soc": "43-9031.00",
        "name": "편집 디자이너(DTP)",
        "match": 100
      },
      {
        "object": "소리·음악",
        "soc": "27-2041.00",
        "name": "작곡가·지휘자",
        "match": 89
      },
      {
        "object": "물건",
        "soc": "27-1026.00",
        "name": "디스플레이어",
        "match": 60
      }
    ]
  }
];

const sample = {
  ...legacy,
  report: {
    ...legacy.report!,
    cores: legacy.report!.cores.map((c) => ({ behavior: c.behavior, restatement: c.restatement, pattern: c.pattern, cost_note: c.cost_note, say: "" })),
    object: undefined,
    explore: {
      items: [
        { core: 1, object: "영상", title: "영상 클립 순서 바꿔 잇기", do: "짧은 영상 클립 3~4개를 순서를 바꿔 가며 이어 보세요.", why: "이게 끌리면 영상 편집자 같은 일에서도 이 행동이 쓰여요." },
        { core: 1, object: "그림·이미지·디자인", title: "포스터 요소 자리 바꾸기", do: "포스터 한 장의 글과 그림 자리를 바꿔 가며 가장 잘 읽히는 배치를 찾아보세요.", why: "이게 끌리면 편집 디자이너 같은 일에서도 이 행동이 쓰여요." },
        { core: 2, object: "몸·건강", title: "가족 건강 루틴 챙기기", do: "요즘 지쳐 보이는 가족의 하루 루틴을 함께 살펴보고 무리한 부분을 하나 덜어 보세요.", why: "이게 끌리면 정신병동 보호사 같은 일에서도 이 행동이 쓰여요." },
      ],
    },
  },
  jobPick: undefined,
  jobLists: JOB_LISTS,
} as unknown as Session;

// ?n=1|2|3 으로 코어 개수를 바꿔 볼 수 있다. DEV_REPORT_FILE 환경변수에 결과지 JSON 경로를 주면 그 내용으로 그린다(시험용).
export default async function DevResult({ searchParams }: { searchParams: Promise<{ n?: string; legacy?: string }> }) {
  const { n, legacy: old } = await searchParams;
  const count = Math.max(1, Math.min(3, Number(n) || 3));
  const base = old ? legacy : sample;
  let session = base;
  const file = process.env.DEV_REPORT_FILE;
  if (file) {
    const fs = await import("node:fs");
    const loaded = JSON.parse(fs.readFileSync(file, "utf8"));
    session = { ...base, ...loaded, report: { ...base.report, ...loaded.report } } as Session;
  } else {
    session = {
      ...base,
      report: { ...base.report, cores: base.report!.cores.slice(0, count) },
      reliability: base.reliability?.slice(0, count),
      jobLists: base.jobLists?.filter((j) => j.core < count),
    } as Session;
  }
  return (
    <>
      <style>{`.stage{max-width:620px}`}</style>
      <ResultView session={session} contact="hello@example.com" />
    </>
  );
}
