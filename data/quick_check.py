"""快速验证真实数据可加载且结构正确"""
import json
from pathlib import Path

p = Path(r"d:\AI\project\IdeaCreate\zhiyuan-zhixuan\data\zhejiang-data.json")
d = json.loads(p.read_text(encoding="utf-8"))

print(f"[OK] 省份: {d['province']}")
print(f"[OK] 考试模式: {d['exam_mode']}")
print(f"[OK] 学校数: {len(d['schools'])}")
print(f"[OK] 选科: {d['subjects']}")
print(f"[OK] 批次: {d['batches']}")

# 统计
total_majors = sum(len(s["majors"]) for s in d["schools"])
total_scores = sum(len(m["scores"]) for s in d["schools"] for m in s["majors"])
print(f"[OK] 专业总数: {total_majors}")
print(f"[OK] 分数记录总数: {total_scores}")

# 层级分布
from collections import Counter
levels = Counter(s["level"] for s in d["schools"])
print(f"[OK] 层级分布: {dict(levels)}")

# 抽样第一所学校的第一个专业
s = d["schools"][0]
print(f"\n[抽样] 第一所学校: {s['name']} ({s['level']}) @ {s['city']}")
print(f"       标签: {s['tags']}")
print(f"       专业数: {len(s['majors'])}")
m = s["majors"][0]
print(f"       首个专业: {m['name']} ({m['category']}) 选科: {m['subject_req']}")
for sc in m["scores"]:
    print(f"         {sc['year']}: 分={sc['min_score']} 位次={sc['min_rank']} 录取={sc['enrollment']}")

# 字段完整性检查
required_school = {"id","name","city","province","level","tags","majors"}
required_major = {"name","category","subject_req","scores"}
required_score = {"year","min_score","min_rank","enrollment"}

errors = 0
for s in d["schools"]:
    if not required_school.issubset(s.keys()):
        errors += 1
        continue
    for m in s["majors"]:
        if not required_major.issubset(m.keys()):
            errors += 1
            continue
        for sc in m["scores"]:
            if not required_score.issubset(sc.keys()):
                errors += 1

print(f"\n[字段完整性] 缺失字段数: {errors}")
print(f"\n=== 验证结论: {'PASS ✓' if errors == 0 else 'FAIL ✗'} ===")
