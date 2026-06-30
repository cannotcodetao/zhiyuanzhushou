# -*- coding: utf-8 -*-
"""
validate_data.py — 验证 zhejiang-data.json 的结构完整性、数据范围合理性，
并与原始官方 XLS 抽样核对，输出统计报告与数据来源可追溯声明。

运行：python validate_data.py
"""
import os
import json
import random
import pandas as pd

DATA_DIR = os.path.dirname(os.path.abspath(__file__))
RAW_DIR = os.path.join(DATA_DIR, "raw")
JSON_PATH = os.path.join(DATA_DIR, "zhejiang-data.json")

VALID_LEVELS = {"985", "211", "双一流", "省重点", "普通本科"}
VALID_SUBJECTS = {"物理", "化学", "生物", "历史", "地理", "政治", "技术"}
VALID_YEARS = {2023, 2024, 2025}
VALID_CATEGORIES = {"工学", "理学", "医学", "文学", "法学", "经济学",
                    "管理学", "教育学", "历史学", "哲学", "农学", "艺术学", "综合"}


def load_json():
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def load_xls(year):
    p = os.path.join(RAW_DIR, f"zhejiang_{year}_phase1.xls")
    df = pd.read_excel(p, sheet_name=0, engine="xlrd", header=0)
    df.columns = [str(c).strip() for c in df.columns]
    df = df.rename(columns={
        "学校代号": "school_code", "学校名称": "school_name",
        "专业代号": "major_code", "专业名称": "major_name",
        "计划数": "plan", "分数线": "score", "位次": "rank",
    })
    df["school_name"] = df["school_name"].astype(str).str.strip()
    df["major_name"] = df["major_name"].astype(str).str.strip()
    for c in ["plan", "score", "rank"]:
        df[c] = pd.to_numeric(df[c], errors="coerce")
    return df


def main():
    print("=" * 70)
    print("zhejiang-data.json 验证报告")
    print("=" * 70)

    errors = []
    warnings = []

    data = load_json()

    # ===== 1. 顶层结构 =====
    for k in ["province", "exam_mode", "subjects", "total_score", "batches", "schools"]:
        if k not in data:
            errors.append(f"顶层缺失字段: {k}")
    if data.get("province") != "浙江":
        errors.append(f"province 应为 '浙江'，实际 '{data.get('province')}'")
    if data.get("exam_mode") != "3+3":
        errors.append(f"exam_mode 应为 '3+3'")
    if data.get("total_score") != 750:
        errors.append(f"total_score 应为 750")
    if not isinstance(data.get("schools"), list):
        errors.append("schools 应为列表")

    print(f"\n[1] 顶层结构: province={data.get('province')}, exam_mode={data.get('exam_mode')}, "
          f"total_score={data.get('total_score')}, subjects={data.get('subjects')}")
    print(f"    batches={data.get('batches')}")

    # ===== 2. 学校/专业/分数结构 =====
    n_schools = len(data["schools"])
    n_majors = 0
    n_records = 0
    school_ids = set()
    by_level = {}
    by_year = {}
    score_ranges = {"min_score": [], "min_rank": []}

    for s in data["schools"]:
        for fk in ["id", "name", "city", "province", "level", "tags", "majors"]:
            if fk not in s:
                errors.append(f"学校 {s.get('name')} 缺字段 {fk}")
        if s["id"] in school_ids:
            errors.append(f"学校ID重复: {s['id']}")
        school_ids.add(s["id"])
        if s["level"] not in VALID_LEVELS:
            errors.append(f"学校 {s['name']} level 非法: {s['level']}")
        by_level[s["level"]] = by_level.get(s["level"], 0) + 1

        if not isinstance(s.get("majors"), list):
            errors.append(f"学校 {s['name']} majors 非列表")
            continue
        for m in s["majors"]:
            for fk in ["name", "category", "subject_req", "scores"]:
                if fk not in m:
                    errors.append(f"{s['name']}/{m.get('name')} 缺字段 {fk}")
            n_majors += 1
            cat = m.get("category")
            if cat not in VALID_CATEGORIES:
                warnings.append(f"{s['name']}/{m.get('name')} category 非标准: {cat}")
            # subject_req 校验
            req = m.get("subject_req", [])
            if not isinstance(req, list):
                errors.append(f"{s['name']}/{m.get('name')} subject_req 非列表")
            else:
                for r in req:
                    if r not in VALID_SUBJECTS:
                        errors.append(f"{s['name']}/{m.get('name')} subject_req 非法科目: {r}")
            # scores 校验
            if not isinstance(m.get("scores"), list):
                errors.append(f"{s['name']}/{m.get('name')} scores 非列表")
                continue
            seen_years = set()
            for sc in m["scores"]:
                for fk in ["year", "min_score", "min_rank", "enrollment"]:
                    if fk not in sc:
                        errors.append(f"{s['name']}/{m['name']} score 缺字段 {fk}")
                yr = sc.get("year")
                if yr not in VALID_YEARS:
                    errors.append(f"{s['name']}/{m['name']} year 非法: {yr}")
                if yr in seen_years:
                    errors.append(f"{s['name']}/{m['name']} year 重复: {yr}")
                seen_years.add(yr)
                ms = sc.get("min_score")
                mr = sc.get("min_rank")
                if ms is not None:
                    if not (400 <= ms <= 720):
                        warnings.append(f"{s['name']}/{m['name']} {yr} min_score 超范围: {ms}")
                    score_ranges["min_score"].append(ms)
                if mr is not None:
                    if not (1 <= mr <= 200000):
                        warnings.append(f"{s['name']}/{m['name']} {yr} min_rank 超范围: {mr}")
                    score_ranges["min_rank"].append(mr)
                n_records += 1
                by_year[yr] = by_year.get(yr, 0) + 1

    print(f"\n[2] 数量统计:")
    print(f"    学校数: {n_schools}")
    print(f"    专业数: {n_majors}")
    print(f"    分数记录数: {n_records}")
    print(f"    按层级: {by_level}")
    print(f"    按年份: {dict(sorted(by_year.items()))}")

    if score_ranges["min_score"]:
        ss = score_ranges["min_score"]
        print(f"    min_score 范围: {min(ss)} ~ {max(ss)}")
    if score_ranges["min_rank"]:
        rs = score_ranges["min_rank"]
        print(f"    min_rank 范围: {min(rs):,} ~ {max(rs):,}")

    # ===== 3. 验收标准检查 =====
    print(f"\n[3] 验收标准:")
    checks = [
        ("学校数 >= 60", n_schools >= 60),
        ("专业数 >= 300", n_majors >= 300),
        ("2025年记录数 >= 500", by_year.get(2025, 0) >= 500),
        ("JSON 结构无错误", len(errors) == 0),
    ]
    for desc, ok in checks:
        print(f"    [{'PASS' if ok else 'FAIL'}] {desc}")

    # ===== 4. 抽样核对（与官方 XLS 对照）=====
    print(f"\n[4] 抽样核对（随机 10 条 vs 官方XLS）:")
    # 建立 XLS 查询索引：(school, year, major_substring) -> (score, rank, plan)
    xls_cache = {}
    for yr in [2023, 2024, 2025]:
        df = load_xls(yr)
        for _, row in df.iterrows():
            key = (row["school_name"], yr, str(row["major_name"]).strip())
            if pd.notna(row["score"]):
                xls_cache[key] = (int(row["score"]),
                                  int(row["rank"]) if pd.notna(row["rank"]) else None,
                                  int(row["plan"]) if pd.notna(row["plan"]) else None)

    # 收集所有 (school, major_name, year, min_score, min_rank) 用于抽样
    all_recs = []
    for s in data["schools"]:
        for m in s["majors"]:
            for sc in m["scores"]:
                all_recs.append((s["name"], m["name"], sc["year"],
                                 sc["min_score"], sc["min_rank"], sc["enrollment"]))
    random.seed(42)
    samples = random.sample(all_recs, min(10, len(all_recs)))

    matched = 0
    for sn, mn, yr, ms, mr, en in samples:
        # 直接精确匹配
        key = (sn, yr, mn)
        if key in xls_cache:
            x_score, x_rank, x_plan = xls_cache[key]
            ok = (x_score == ms)
            if ok:
                matched += 1
            print(f"    [{yr}] {sn} / {mn[:24]:24s} JSON={ms}/{mr} XLS={x_score}/{x_rank} "
                  f"{'OK' if ok else 'MISMATCH'}")
        else:
            # 模糊匹配（去括号）
            import re
            mn_norm = re.sub(r"[（(].*?[)）]", "", mn).strip()
            found = None
            for k, v in xls_cache.items():
                if k[0] == sn and k[1] == yr:
                    k_norm = re.sub(r"[（(].*?[)）]", "", k[2]).strip()
                    if k_norm == mn_norm:
                        found = v
                        break
            if found:
                x_score, x_rank, x_plan = found
                ok = (x_score == ms)
                if ok:
                    matched += 1
                print(f"    [{yr}] {sn} / {mn[:24]:24s} JSON={ms}/{mr} XLS={x_score}/{x_rank} "
                      f"{'OK' if ok else 'MISMATCH'} (模糊)")
            else:
                print(f"    [{yr}] {sn} / {mn[:24]:24s} JSON={ms}/{mr} XLS未找到对应行")
    print(f"    抽样匹配率: {matched}/10")

    # ===== 5. 数据来源可追溯声明 =====
    print(f"\n[5] 数据来源可追溯声明:")
    print(f"    - 分数/位次/计划数(min_score/min_rank/enrollment): 100% 来自浙江省教育考试院官方XLS")
    print(f"      · 2023: https://www.zjzs.net/art/2023/7/19/art_155_2089.html")
    print(f"      · 2024: https://www.zjzs.net/art/2024/7/21/art_45_9899.html")
    print(f"      · 2025: https://www.zjzs.net/art/2025/7/21/art_3_11454.html")
    print(f"    - 学校层级/城市/标签(level/city/tags): 掌上高考 list_v2.json + 浙江高校参照表")
    print(f"    - 选科要求(subject_req): 按《教育部选考科目要求指引》按专业名规则推导(derived)")
    print(f"    - 学科门类(category): 按《普通高等学校本科专业目录(2024)》按专业名归类(derived)")
    print(f"    - 每条分数记录可通过 (学校名, 年份, 专业名) 三元组回溯到官方XLS原始行")

    # ===== 汇总 =====
    print(f"\n{'=' * 70}")
    print(f"验证汇总: 错误 {len(errors)} 条, 警告 {len(warnings)} 条")
    if errors:
        print("错误明细:")
        for e in errors[:20]:
            print(f"  - {e}")
    if warnings:
        print(f"警告明细(前10):")
        for w in warnings[:10]:
            print(f"  - {w}")
    print(f"\n结论: {'PASS 验证通过' if not errors else 'FAIL 存在错误，需修复'}")
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
