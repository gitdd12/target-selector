"""O*NET "Work Styles"·"Work Context" 엑셀에서 가치관 매칭에 쓸 요소만 뽑아
data/onet31/occupation_essence.json의 각 직업 항목에 work_styles·work_context 필드로 합친다.

왜 이 둘만, 그리고 Work Context는 57개 중 18개만, Work Styles는 21개 중 14개만 뽑는지:
docs/직업매칭_본질기반_재설계_2026-09-30.md §32-33.
요약: Work Context(57개)는 실내외·노출·안전장비 같은 물리적 근무조건(약 39개, 대상=신체 쪽 얘기라 가치관
인터뷰 질문과 안 이어짐)을 빼고 사람·속도·자율성·압박 관련 18개만 남긴다. Work Styles(21개)는 884개
직업 데이터로 표준편차를 재서 신뢰성·세부사항주의·인내력·자신감·겸손·스트레스내구력·성취지향(표준편차
0.28~0.59, 직업마다 거의 안 갈림 — "좋은 직원" 일반론에 가까움)을 뺀 14개만 남긴다(§33).
코드(약어)는 coreEssenceMatch.ts의 범례와 반드시 같아야 한다(한쪽만 고치면 안 됨).

사용법: python3 scripts/build_work_values.py <Work Styles.xlsx> <Work Context.xlsx>
필요 패키지: pip install openpyxl
"""
import json
import os
import sys

import openpyxl

if len(sys.argv) != 3:
    sys.exit(__doc__)
STYLES_XLSX, CONTEXT_XLSX = sys.argv[1], sys.argv[2]
ESSENCE_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "onet31", "occupation_essence.json")

# coreEssenceMatch.ts의 범례와 반드시 같은 이름·약어를 쓴다.
# 21개 중 7개(신뢰성·세부사항주의·인내력·자신감·겸손·스트레스내구력·성취지향)는 §33에서 뺐다 —
# 884개 직업 표준편차가 0.28~0.59로, 직업마다 거의 안 갈리는 "좋은 직원" 일반론이라 매칭에 안 쓴다.
STYLE_CODES = {
    "Innovation": "INV", "Intellectual Curiosity": "ICU",
    "Tolerance for Ambiguity": "AMB", "Initiative": "INI", "Adaptability": "ADP",
    "Leadership Orientation": "LED",
    "Sincerity": "SIN", "Empathy": "EMP", "Cooperation": "COO",
    "Optimism": "OPT", "Social Orientation": "SOC", "Cautiousness": "CAU",
    "Integrity": "INT", "Self-Control": "SCT",
}
CONTEXT_CODES = {
    "Contact With Others": "COW",
    "Work With or Contribute to a Work Group or Team": "TEAM",
    "Deal With External Customers or the Public in General": "CUST",
    "Coordinate or Lead Others in Accomplishing Work Activities": "LEADO",
    "Conflict Situations": "CONF",
    "Dealing With Unpleasant, Angry, or Discourteous People": "UNPL",
    "Impact of Decisions on Co-workers or Company Results": "IMPACT",
    "Frequency of Decision Making": "FREQ",
    "Freedom to Make Decisions": "FREE",
    "Determine Tasks, Priorities and Goals": "GOALS",
    "Level of Competition": "COMP",
    "Time Pressure": "TIME",
    "Pace Determined by Speed of Equipment": "PACE",
    "Consequence of Error": "ERR",
    "Importance of Being Exact or Accurate": "EXACT",
    "Importance of Repeating Same Tasks": "REPEAT",
    "Work Schedules": "SCHED",
    "Duration of Typical Work Week": "DUR",
}


def rows(path):
    ws = openpyxl.load_workbook(path, read_only=True).worksheets[0]
    it = ws.iter_rows(values_only=True)
    head = next(it)
    for r in it:
        yield dict(zip(head, r))


# Work Styles: Scale ID == "WI"(Work Styles Impact)만 쓴다. DR(Distinctiveness Rank)은 안 씀.
work_styles = {}
for r in rows(STYLES_XLSX):
    code = STYLE_CODES.get(r["Element Name"])
    if code and r["Scale ID"] == "WI":
        work_styles.setdefault(r["O*NET-SOC Code"], {})[code] = round(r["Data Value"], 1)

# Work Context: 요소 대부분은 Scale ID "CX", Work Schedules·Duration만 "CT"를 쓴다(엑셀에 CX가 없음).
work_context = {}
for r in rows(CONTEXT_XLSX):
    code = CONTEXT_CODES.get(r["Element Name"])
    if code and r["Scale ID"] in ("CX", "CT"):
        work_context.setdefault(r["O*NET-SOC Code"], {})[code] = round(r["Data Value"], 1)

essence = json.load(open(ESSENCE_PATH, encoding="utf-8"))
hit_styles = hit_context = 0
for o in essence:
    ws = work_styles.get(o["soc"])
    wc = work_context.get(o["soc"])
    if ws:
        o["work_styles"] = ws
        hit_styles += 1
    else:
        o.pop("work_styles", None)
    if wc:
        o["work_context"] = wc
        hit_context += 1
    else:
        o.pop("work_context", None)

with open(ESSENCE_PATH, "w", encoding="utf-8") as f:
    json.dump(essence, f, ensure_ascii=False, separators=(",", ":"))

print(f"{len(essence)}개 직업 중 work_styles {hit_styles}개, work_context {hit_context}개 채움"
      f" (둘 다 없는 직업은 가치관 판정 때 코어만으로 본다)")
