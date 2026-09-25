# 검색 문장: 대상만 바꾸고 방식(순서·배치를 바꿔 맞춤 / 알아채고 먼저 다가가 들어주고 지지함)과 기준(매끄럽게 이어질 때까지 / 괜찮아질 때까지)은 남긴다.
EDIT_DESC_EN = "Rearrange the order of existing parts until the whole flows smoothly without awkward breaks."
EDIT_DESC_KO = "이미 있는 조각들의 순서와 배치를 바꿔, 전체가 걸리는 데 없이 매끄럽게 이어질 때까지 맞춘다."
EDIT = {
    "신체": "Adjust the sequence of movements in an exercise routine so the motion flows smoothly.",
    "재료": "Reorder preparation steps and ingredients so the cooking process flows smoothly.",
    "기계·장비": "Reorder equipment setup and operating steps so the operation runs smoothly without interruption.",
    "공간": "Rearrange furniture and the layout of a room so movement through the space flows naturally.",
    "물건": "Rearrange products and items in a display so they follow a clear, logical order.",
    "생물": "Reorder the daily sequence of care tasks for plants or animals so the routine flows without gaps.",
    "사람·관계": "Rearrange the order of speakers and agenda items so the meeting flows smoothly.",
    "글·문서": "Reorganize paragraphs and sections of written material so the text reads smoothly and logically.",
    "데이터·숫자": "Rearrange data, tables, and columns into a logical order so the report reads clearly.",
    "코드": "Restructure and reorder existing code so the program logic flows clearly.",
    "수식": "Reorder the steps of a mathematical derivation so the reasoning flows logically.",
    "개념·전략·규칙": "Reorganize the structure of a plan or argument so the ideas connect logically.",
    "그림·이미지·디자인": "Rearrange layout elements on a page so the design flows visually.",
    "소리·음악": "Rearrange sections of music and audio so the piece flows smoothly.",
    "영상": "Arrange video clips and scenes into a sequence so the story flows.",
    "일정·절차": "Rearrange schedules and task sequences so work proceeds smoothly without gaps.",
    "돈·재무": "Reorganize financial statements and budget items into a clear, logical order.",
    "조직·프로젝트": "Reorganize project phases and team workflow so the project runs smoothly.",
    "몸·건강": "Adjust the sequence of treatment or therapy steps so care proceeds smoothly.",
    "대상 없음": "Change the order of existing parts until the whole connects smoothly.",
}

CARE_DESC_EN = "Notice when someone is going through a hard time, reach out first, listen and support them until they feel better, then step back."
CARE_DESC_KO = "힘들어하는 사람을 먼저 알아채고 연락해서, 이야기를 들어주고 괜찮아질 때까지 곁에서 지지한 뒤 물러난다."
CARE = {
    "사람·관계": "Reach out to a friend going through a hard time, listen, and offer emotional support until they feel better.",
    "몸·건강": "Comfort and emotionally support patients who are struggling during illness or recovery.",
    "생물": "Notice when an animal is distressed and comfort it until it calms down.",
    "조직·프로젝트": "Check in on team members who are struggling and support them until they are back on track.",
    # 사람이 대상인 행동은 사람의 종류가 곧 대상이다
    "사람:학생": "Notice students who are struggling, talk with them, and support them emotionally.",
    "사람:고객": "Listen to clients who are upset or distressed and reassure them until they feel better.",
    "사람:동료·직원": "Notice when coworkers or employees are stressed and offer support and encouragement.",
    "사람:노인": "Visit and keep company with elderly people who are lonely, listening to them.",
    "사람:아이": "Comfort and reassure children who are upset until they calm down.",
    "대상 없음": "Notice someone is struggling, reach out first, and support them until they are okay.",
}

# O*NET 업무 문장 말투로 쓴 버전(동사 + 대상 + 목적). 대상만 바꾸고 방식·기준은 유지.
EDIT_ONET = {
    "신체": "Modify sequences of exercises or movements to improve flow and coordination.",
    "재료": "Adjust the order of production steps to ensure smooth processing of materials.",
    "기계·장비": "Sequence equipment operations to ensure smooth, uninterrupted production.",
    "공간": "Rearrange furniture, fixtures, or layouts to improve the flow of space.",
    "물건": "Arrange merchandise or displays in logical sequences.",
    "생물": "Schedule and sequence animal or plant care activities.",
    "사람·관계": "Arrange order of speakers, acts, or program segments to ensure smooth transitions.",
    "글·문서": "Edit, revise, or rewrite written material to improve clarity, organization, and flow.",
    "데이터·숫자": "Organize and restructure data or reports into a logical sequence.",
    "코드": "Revise or restructure program code to improve logic and readability.",
    "수식": "Revise mathematical proofs or derivations to present steps in logical order.",
    "개념·전략·규칙": "Revise plans, proposals, or procedures to improve their logical structure.",
    "그림·이미지·디자인": "Revise layouts or designs to improve visual flow and arrangement of elements.",
    "소리·음악": "Arrange or edit music or audio segments to achieve smooth transitions.",
    "영상": "Edit film or video to arrange scenes into sequences with smooth transitions.",
    "일정·절차": "Revise schedules or work sequences to improve workflow.",
    "돈·재무": "Revise financial statements or budgets to present information in logical order.",
    "조직·프로젝트": "Reorganize project workflows or processes to improve continuity.",
    "몸·건강": "Modify the sequence of treatment steps to ensure continuity of care.",
    "대상 없음": "Rearrange, edit, or revise the sequence of components so the whole flows logically.",
}
CARE_ONET = {
    "사람·관계": "Provide emotional support, comfort, or encouragement to individuals experiencing personal difficulties.",
    "몸·건강": "Provide emotional support to patients and their families.",
    "생물": "Provide companionship and comfort to animals.",
    "조직·프로젝트": "Counsel and support employees experiencing personal or work-related problems.",
    "사람:학생": "Counsel students regarding personal, social, or emotional problems.",
    "사람:고객": "Listen to client concerns and provide reassurance and support.",
    "사람:동료·직원": "Support coworkers or staff members experiencing stress.",
    "사람:노인": "Provide companionship and emotional support to elderly individuals.",
    "사람:아이": "Comfort and reassure children who are upset or distressed.",
    "대상 없음": "Listen to individuals' concerns and provide emotional support and encouragement.",
}
