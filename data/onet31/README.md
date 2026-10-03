# O*NET 31.0 (2026년 8월판) — 직업 추천 재설계용 데이터

- 출처: O*NET 31.0 Database, U.S. Department of Labor, Employment and Training Administration (USDOL/ETA). https://www.onetcenter.org/database.html
- 라이선스: CC BY 4.0 (https://www.onetcenter.org/license_db.html). 상업적 사용 가능. 출처 표기와 가공 표시가 조건이다(결과지 화면의 O*NET 표기 참고).
- 가공: 원본 엑셀에서 필요한 열만 뽑아 JSON으로 바꿨다. 원본 엑셀은 크기 때문에 저장소에 넣지 않았다.
- 다시 만들기: `pip install openpyxl` 후 `python3 scripts/build_onet31.py <엑셀 폴더>`. 폴더에는 O*NET 31.0 엑셀 다운로드 파일과 `Job Zones.xlsx`, `Job Zone Reference.xlsx`가 있어야 한다.
- 설계 문서: `docs/직업추천_재설계_2026-09-25.md`

2026-09-30부터 직업 추천은 업무 문장 커버리지 방식(`src/lib/onet31.ts`, `src/lib/embed.ts`, `tasks.json`, `task_emb_*`)을 버리고 "본질 유사도" 방식(`src/lib/coreEssenceMatch.ts`, `occupation_essence.json`)으로 바뀌었다 — 설계 로그는 `docs/직업매칭_본질기반_재설계_2026-09-30.md`. 그 두 모듈은 삭제됐다. `tasks.json`·`task_emb_*`·`dwas.json`은 더 이상 앱이 안 쓰지만, 본질 문장이 O*NET 원문을 빠뜨리지 않았는지 재확인할 때(완전성 검증, 위 로그 §25-26) 여전히 참고용으로 쓰므로 지우지 않았다.

2026-10-03: `occupations_ko.json`의 한국어 이름·설명을 O*NET의 "Job Titles"(Alternate Titles, 직업당 대체 명칭 다수)·"Sample of Reported Titles"(My Next Move에 노출되는 더 추려진 흔한 이름, Y/N 플래그)로 다시 검토했다 — 전에는 "Occupation Data"의 공식 명칭 하나만 보고 지었어서, 실제로 그 직업을 부르는 이름과 동떨어진 경우가 있었다(예: EMT를 "응급구조사"로만 적어 1급(Paramedics)과 구분이 안 됐던 것, "테크니컬 라이터"처럼 음차만 한 것). 20개 서브에이전트로 1,016개를 나눠 검토해 96개를 고쳤다(API 비용 없음). 변경분은 `occupation_essence.json`의 916개 쪽 `name` 필드에도 동기화했다 — 설계 로그 `직업매칭_본질기반_재설계_2026-09-30.md` §34 참고.

## 파일

| 파일 | 내용 | 원본 |
|---|---|---|
| `occupations.json` | 직업 1,016개. `{직업코드: {title, desc, jobZone}}`. jobZone이 없는 직업이 있다(923개만 있음). jobZone은 직업 추천에 쓰지 않기로 했다(2026-09-25) | Occupation Data, Job Zones |
| `job_zone_reference.json` | Job Zone 단계 설명. 31.0판은 1과 2가 합쳐져 4단계. 참고용(추천에 쓰지 않음) | Job Zone Reference |
| `tasks.json` | 업무 문장 18,838개. 아래 필드 참고 | Task Statements, Task Ratings, Tasks to DWAs |
| `excluded_occupations.json` | 직업 추천에서 빼는 직업 8개(종교 3, 장례 5). 직업 코드로 정확히 제외 | 결정 2026-09-25 |
| `dwas.json` | 업무 활동 계층 2,087행(GWA 41 → IWA 332 → DWA 2,087) | GWAs to IWAs to DWAs |
| `occupations_ko.json` | 직업 1,016개의 한국어 이름과 한 줄 설명. `{직업코드: {name, desc}}`. 실제 서비스는 이 파일을 직접 안 읽는다(916개는 occupation_essence.json에 복사된 값을 쓴다) — 전체 1,016개짜리 정본 기록용. 설명은 "…하는 일" 꼴. 이름은 모두 다르다 | 직접 작성 2026-09-26, 2026-10-03 재검토 |
| `task_emb_e5.f16` | 업무 문장 임베딩. 고유 문장 17,579개 × 768차원, float16(리틀엔디언) 그대로 이어 붙인 파일(약 27MB). 모델 intfloat/e5-base-v2, 문장 앞에 "passage: "를 붙이고 길이 1로 맞춤 | 직접 생성 2026-09-26 |
| `task_emb_texts.json` | 위 임베딩의 문장 순서(n번째 줄 = n번째 문장). `tasks.json`의 `text`와 같은 문자열이라 이것으로 업무·직업을 찾는다 | 직접 생성 2026-09-26 |

`tasks.json` 필드
- `id` 업무 ID, `soc` 이 업무가 속한 직업 코드(업무 하나는 직업 하나에만 속한다), `text` 업무 문장, `type` Core / Supplemental
- `im` 중요도(1~5, 종사자 응답 평균). `rt`·`ft`와 함께 업무 무게(중요도 × 수행 비율 × 빈도, src/lib/onet31.ts taskWeight)로 직업 점수의 가중치가 된다
- `rt` 관련도(종사자 중 이 업무를 한다고 답한 비율, %)
- `ft` 빈도 7단계 응답 비율(%): [매년 이하, 매년 초과, 매월 초과, 매주 초과, 매일, 하루 여러 번, 매시간 이상]
- `dwas` 이 업무가 연결된 DWA ID 목록

주의
- 418개 업무는 평가(im, rt, ft)가 없어 `null`이다. 직업 점수를 계산할 때 무게 0으로 친다.
- 같은 문장이 여러 직업에 들어 있는 경우가 있다(예: "Plan, evaluate, and revise curricula…"는 대학 교수 34개 직업). ID는 직업마다 다르다. 검색·판정은 문장 단위로 한 번만 하고, 직업으로 바꿀 때 그 문장을 가진 모든 직업에 반영한다.

## eval/ — 임베딩 시험 정답지 (2026-09-25)

- `relevance_edit.json`, `relevance_care.json`: 시험 행동 두 개(글 흐름 / 힘든 사람 챙기기)에 대해 업무 문장을 수동 판정한 결과. `{업무 문장: {B: 대상 무관 점수, A: 이 사람 대상일 때 점수, obj: 업무의 대상}}`. 점수 0인 문장도 "판정했음" 기록으로 남긴다. `obj`가 없는 문장은 첫 키워드 판정분이다.
- `queries.py`: 시험에 쓴 검색 문장(대상 20개 × 일상 말투 / O*NET 말투).
- 앱 로직을 바꾼 뒤 같은 정답지로 재현율·직업 순위를 다시 재는 용도. 결과 요약은 `docs/직업추천_재설계_2026-09-25.md` 5절.

## 업무 임베딩 (2026-09-26)

- 만든 방법: sentence-transformers로 `intfloat/e5-base-v2`를 불러 `tasks.json`의 고유 문장(가나다·ABC 정렬)마다 `"passage: " + 문장`을 임베딩하고 길이 1로 맞춘 뒤 float16으로 저장했다.
- (2026-09-30 이후 더 안 씀) 당시엔 검색 문장만 실행 중에 임베딩했다(`src/lib/embed.ts`, 같은 모델의 ONNX 변환본 `Xenova/e5-base-v2` fp16, 앞에 `"query: "`) — 이 모듈은 삭제됐다.
- 확인: 시험 검색 문장 65개에서 앱 쪽 검색 결과 상위 30개가 원래 모델(fp32) 결과와 평균 99.95% 같았다. 8비트 양자화 모델(q8)은 89%로 떨어져 쓰지 않는다.
- 모델을 바꾸면 이 파일도 같은 모델로 다시 만들어야 한다. 업무 임베딩과 검색 임베딩은 같은 모델이어야 한다.
