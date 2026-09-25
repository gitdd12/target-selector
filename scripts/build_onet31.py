"""O*NET 31.0 엑셀 원본에서 직업 추천에 쓰는 파일만 가볍게 뽑아 data/onet31/에 쓴다.

사용법:  python3 scripts/build_onet31.py <엑셀 폴더>
  엑셀 폴더에는 O*NET 31.0 "Excel" 다운로드의 파일들과 Job Zones.xlsx, Job Zone Reference.xlsx가 있어야 한다.
  필요 패키지: pip install openpyxl
"""
import json
import os
import sys
from collections import defaultdict

import openpyxl

SRC = sys.argv[1] if len(sys.argv) > 1 else sys.exit(__doc__)
OUT = os.path.join(os.path.dirname(__file__), "..", "data", "onet31")
os.makedirs(OUT, exist_ok=True)


def rows(name):
    ws = openpyxl.load_workbook(os.path.join(SRC, name), read_only=True).worksheets[0]
    it = ws.iter_rows(values_only=True)
    head = next(it)
    for r in it:
        yield dict(zip(head, r))


def dump(name, obj):
    with open(os.path.join(OUT, name), "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))


jz = {r["O*NET-SOC Code"]: r["Job Zone"] for r in rows("Job Zones.xlsx")}
occupations = {
    r["O*NET-SOC Code"]: {"title": r["Title"], "desc": r["Description"], "jobZone": jz.get(r["O*NET-SOC Code"])}
    for r in rows("Occupation Data.xlsx")
}
dump("occupations.json", occupations)

dump(
    "job_zone_reference.json",
    [
        {"zone": r["Job Zone"], "name": r["Name"], "experience": r["Experience"], "education": r["Education"],
         "training": r["Job Training"], "examples": r["Examples"]}
        for r in rows("Job Zone Reference.xlsx")
    ],
)

im, rt, ft = {}, {}, defaultdict(lambda: [0.0] * 7)
for r in rows("Task Ratings.xlsx"):
    tid = r["Task ID"]
    if r["Scale ID"] == "IM":
        im[tid] = r["Data Value"]
    elif r["Scale ID"] == "RT":
        rt[tid] = r["Data Value"]
    elif r["Scale ID"] == "FT" and r["Category"]:
        ft[tid][int(r["Category"]) - 1] = r["Data Value"]

task_dwas = defaultdict(list)
for r in rows("Tasks to DWAs.xlsx"):
    task_dwas[r["Task ID"]].append(r["DWA Element ID"])

tasks = []
for r in rows("Task Statements.xlsx"):
    tid = r["Task ID"]
    tasks.append({
        "id": tid,
        "soc": r["O*NET-SOC Code"],
        "text": r["Task"],
        "type": r["Task Type"],
        "im": im.get(tid),
        "rt": rt.get(tid),
        "ft": ft[tid] if tid in ft else None,
        "dwas": task_dwas.get(tid, []),
    })
dump("tasks.json", tasks)

dump(
    "dwas.json",
    [
        {"gwaId": r["GWA Element ID"], "gwa": r["GWA Element Name"], "iwaId": r["IWA Element ID"], "iwa": r["IWA Element Name"],
         "dwaId": r["DWA Element ID"], "dwa": r["DWA Element Name"]}
        for r in rows("GWAs to IWAs to DWAs.xlsx")
    ],
)

print(f"occupations {len(occupations)} / tasks {len(tasks)} (IM {len(im)}, RT {len(rt)}, FT {len(ft)}) → {os.path.abspath(OUT)}")
