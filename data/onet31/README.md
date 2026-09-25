# O*NET 31.0 (2026년 8월판) — 직업 추천 재설계용 데이터

- 출처: O*NET 31.0 Database, U.S. Department of Labor, Employment and Training Administration (USDOL/ETA). https://www.onetcenter.org/database.html
- 라이선스: CC BY 4.0 (https://www.onetcenter.org/license_db.html). 상업적 사용 가능. 출처 표기와 가공 표시가 조건이다(결과지 화면의 O*NET 표기 참고).
- 가공: 원본 엑셀에서 필요한 열만 뽑아 JSON으로 바꿨다. 원본 엑셀은 크기 때문에 저장소에 넣지 않았다.
- 다시 만들기: `pip install openpyxl` 후 `python3 scripts/build_onet31.py <엑셀 폴더>`. 폴더에는 O*NET 31.0 엑셀 다운로드 파일과 `Job Zones.xlsx`, `Job Zone Reference.xlsx`가 있어야 한다.
- 설계 문서: `docs/직업추천_재설계_2026-09-25.md`

아직 앱 코드는 이 폴더를 쓰지 않는다. 현재 직업 추천은 `data/`의 기존 파일(`occ_core_scores_hybrid_v2.csv`, `hybrid_mapping_v2.csv`, `onet_tasks.json`)을 쓴다.

## 파일

| 파일 | 내용 | 원본 |
|---|---|---|
| `occupations.json` | 직업 1,016개. `{직업코드: {title, desc, jobZone}}`. jobZone이 없는 직업이 있다(923개만 있음) | Occupation Data, Job Zones |
| `job_zone_reference.json` | Job Zone 단계 설명. 31.0판은 1과 2가 합쳐져 4단계 | Job Zone Reference |
| `tasks.json` | 업무 문장 18,838개. 아래 필드 참고 | Task Statements, Task Ratings, Tasks to DWAs |
| `dwas.json` | 업무 활동 계층 2,087행(GWA 41 → IWA 332 → DWA 2,087) | GWAs to IWAs to DWAs |

`tasks.json` 필드
- `id` 업무 ID, `soc` 이 업무가 속한 직업 코드(업무 하나는 직업 하나에만 속한다), `text` 업무 문장, `type` Core / Supplemental
- `im` 중요도(1~5, 종사자 응답 평균). 직업 점수의 가중치로 쓴다
- `rt` 관련도(종사자 중 이 업무를 한다고 답한 비율, %)
- `ft` 빈도 7단계 응답 비율(%): [매년 이하, 매년 초과, 매월 초과, 매주 초과, 매일, 하루 여러 번, 매시간 이상]
- `dwas` 이 업무가 연결된 DWA ID 목록

주의
- 418개 업무는 평가(im, rt, ft)가 없어 `null`이다. 직업 점수를 계산할 때 중요도 0으로 친다.
- 같은 문장이 여러 직업에 들어 있는 경우가 있다(예: "Plan, evaluate, and revise curricula…"는 대학 교수 34개 직업). ID는 직업마다 다르다. 검색·판정은 문장 단위로 한 번만 하고, 직업으로 바꿀 때 그 문장을 가진 모든 직업에 반영한다.
