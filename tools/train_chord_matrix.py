#!/usr/bin/env python
"""课本 4.3：从 MusicXML 语料统计 HMM 和弦转移矩阵。

用法（在仓库根目录）：
    python tools/train_chord_matrix.py [语料目录]   # 默认 tools/fixtures

流程：
    1. 扫描目录中的 .musicxml / .xml（MXL 是 zip，暂不支持，跳过并计数）
    2. xml.etree 解析每首的调号（<key><fifths> + <mode>）与 <harmony> 序列
       （<root-step>/<root-alter> + <kind>），无法解析的文件跳过并打印原因
    3. 按课本 to_C 思想移调归一到 C 大调 / A 小调，映射为级数（I/ii/...）
    4. 统计一阶转移频次与 和弦→音级(chord tone) 出现频次，
       加 1 拉普拉斯平滑后归一化
    5. 写出 backend/core/data/trans_matrix.json，
       并在终端打印与内置 TRANS 表的 top10 差异

只依赖标准库，纯频次统计，不需要 GPU。
"""
from __future__ import annotations

import json
import os
import sys
import xml.etree.ElementTree as ET

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND = os.path.join(ROOT, "backend")
sys.path.insert(0, BACKEND)

from core.key_analysis import CHORD_TONES, DIATONIC, TRANS  # noqa: E402

# MusicXML <kind> 文本 → 内部和弦类型（与 KIND_MAP 同源，另补常见别名）
KIND_MAP = {
    "major": "maj",
    "minor": "min",
    "dominant": "dom7",
    "major-seventh": "maj7",
    "minor-seventh": "min7",
    "diminished": "dim",
    "augmented": "aug",
    "suspended-fourth": "sus4",
    "half-diminished": "m7b5",
    "major-sixth": "maj",
    "minor-sixth": "min",
    "dominant-ninth": "dom7",
    "major-ninth": "maj7",
    "minor-ninth": "min7",
    "power": "maj",
}
SUPPORTED_KINDS = set(KIND_MAP)

PC_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
STEP_PC = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}

OUT_PATH = os.path.join(BACKEND, "core", "data", "trans_matrix.json")

# (级数偏移, 和弦类型) → 级数符号，与 DIATONIC 一致
ROMAN = {(mode, c["deg"], c["type"]): c["roman"] for mode, cs in DIATONIC.items() for c in cs}
MODES = ("major", "minor")


def tonic_pc(fifths: int, mode: str) -> int:
    """调号第五数 → 主音音级：大调 = 第五圈顺时针，小调 = 其关系大调下方小三度。"""
    rel_major = (7 * fifths) % 12
    return rel_major if mode == "major" else (rel_major - 3) % 12


def parse_score(path: str) -> tuple[str, list[tuple[str, str]]]:
    """返回 (mode, [(roman, chord_type), ...])。解析失败抛异常由调用方跳过。"""
    tree = ET.parse(path)
    root = tree.getroot()
    ns = ""
    if root.tag.startswith("{"):
        ns = root.tag[: root.tag.index("}") + 1]

    # 调号：第一个 <attributes> 里的 <key>；<mode> 缺省时按第五数推定
    key_el = root.find(".//%sattributes/%skey" % (ns, ns))
    if key_el is None:
        raise ValueError("缺少 <key> 调号")
    fifths = int(key_el.findtext("%sfifths" % ns) or "0")
    mode = (key_el.findtext("%smode" % ns) or "").strip().lower()
    if mode not in MODES:
        mode = "minor" if fifths < 0 else "major"  # 无 <mode> 时的约定推定

    tonic = tonic_pc(fifths, mode)

    # 和弦序列：按文档顺序收集所有 <harmony>
    chords: list[tuple[str, str]] = []
    skipped_kinds: set[str] = set()
    for har in root.iter(ns + "harmony"):
        step_el = har.find("%sroot/%sroot-step" % (ns, ns))
        kind_el = har.find("%skind" % (ns,))
        if step_el is None or kind_el is None:
            continue
        step = step_el.text.strip().upper()
        if step not in STEP_PC:
            skipped_kinds.add("root=" + str(step))
            continue
        alter = int(har.findtext("%sroot/%sroot-alter" % (ns, ns)) or "0")
        kind_text = (kind_el.text or "").strip()
        if kind_text not in SUPPORTED_KINDS:
            skipped_kinds.add(kind_text or "(空)")
            continue
        ctype = KIND_MAP[kind_text]
        root_pc = (STEP_PC[step] + alter) % 12
        deg = (root_pc - tonic) % 12
        roman = ROMAN.get((mode, deg, ctype))
        if roman is None:
            skipped_kinds.add("%s%s(调外)" % (step, kind_text))
            continue
        chords.append((roman, ctype))

    if skipped_kinds:
        print("    提示：跳过不支持和弦 %s" % ", ".join(sorted(skipped_kinds)))
    if len(chords) < 2:
        raise ValueError("可用和弦少于 2 个，无法统计转移")
    return mode, chords


def train(corpus_dir: str) -> dict:
    files = sorted(
        os.path.join(corpus_dir, f)
        for f in os.listdir(corpus_dir)
        if f.lower().endswith((".musicxml", ".xml"))
    )
    mxl_count = sum(1 for f in os.listdir(corpus_dir) if f.lower().endswith(".mxl"))
    if mxl_count:
        print("跳过 %d 个 .mxl（zip 格式暂不支持）" % mxl_count)
    if not files:
        raise SystemExit("目录 %s 中没有 .musicxml / .xml 文件" % corpus_dir)

    trans_counts = {m: {} for m in MODES}   # roman -> roman -> count
    tone_counts = {m: {} for m in MODES}    # roman -> pc偏移 -> count
    parsed = skipped = 0

    for path in files:
        name = os.path.basename(path)
        try:
            mode, chords = parse_score(path)
        except Exception as exc:  # noqa: BLE001  单首失败不影响整体
            print("跳过 %s：%s" % (name, exc))
            skipped += 1
            continue
        parsed += 1
        print("解析 %s：%s，%d 个和弦：%s" % (name, mode, len(chords),
                                            " ".join(r for r, _ in chords)))
        tc, cc = trans_counts[mode], tone_counts[mode]
        for i, (roman, ctype) in enumerate(chords):
            if i:
                prev = chords[i - 1][0]
                tc.setdefault(prev, {}).setdefault(roman, 0)
                tc[prev][roman] += 1
            for iv in CHORD_TONES[ctype]:
                deg = (DIATONIC_PC[mode][roman] + iv) % 12
                cc.setdefault(roman, {}).setdefault(deg, 0)
                cc[roman][deg] += 1

    print("\n语料：解析成功 %d 首，跳过 %d 首" % (parsed, skipped))
    if parsed == 0:
        raise SystemExit("没有可用语料")

    result = {}
    for m in MODES:
        romans = [c["roman"] for c in DIATONIC[m]]
        # 转移矩阵：加 1 拉普拉斯平滑后按行归一化
        trans = {}
        for a in romans:
            row_counts = trans_counts[m].get(a, {})
            total = sum(row_counts.values()) + len(romans)
            trans[a] = {b: round((row_counts.get(b, 0) + 1) / total, 6) for b in romans}
        # 和弦→音级(chord tone)概率：平滑 + 归一化（分母按 12 个音级）
        emission = {}
        for a in romans:
            tone_c = tone_counts[m].get(a, {})
            total = sum(tone_c.values()) + 12
            emission[a] = {str(pc): round((tone_c.get(pc, 0) + 1) / total, 6) for pc in range(12)}
        result[m] = {"trans": trans, "emission": emission}
    return result


# 级数符号 → 级数偏移（与 DIATONIC 一致）
DIATONIC_PC = {m: {c["roman"]: c["deg"] for c in cs} for m, cs in DIATONIC.items()}


def builtin_probs(mode: str) -> dict:
    """内置 TRANS 权重按行归一化，便于与统计矩阵同口径比较。"""
    romans = [c["roman"] for c in DIATONIC[mode]]
    out = {}
    for a in romans:
        row = TRANS[mode].get(a, {})
        total = sum(row.values()) or 1.0
        out[a] = {b: row.get(b, 0.0) / total for b in romans}
    return out


def compare(result: dict) -> None:
    print("\n== 统计矩阵 vs 内置 TRANS（各自归一化后按行内概率降序，top10）==")
    for m in MODES:
        print("\n[%s]" % m)
        rows = []
        for a, row in result[m]["trans"].items():
            for b, p in row.items():
                rows.append((p, a, b))
        rows.sort(reverse=True)
        trained_top = [(a, b) for _, a, b in rows[:10]]
        builtin = builtin_probs(m)
        brows = sorted(
            ((builtin[a][b], a, b) for a in builtin for b in builtin[a]), reverse=True
        )
        builtin_top = [(a, b) for _, a, b in brows[:10]]
        print("  统计 top10 ：" + ", ".join("%s→%s %.3f" % (a, b, p) for p, a, b in rows[:10]))
        print("  手写 top10 ：" + ", ".join("%s→%s %.3f" % (a, b, builtin[a][b]) for _, a, b in brows[:10]))
        overlap = len(set(trained_top) & set(builtin_top))
        print("  top10 重合 %d/10" % overlap)
        # 行内最大分歧
        diffs = []
        for a in builtin:
            for b in builtin[a]:
                diffs.append((abs(builtin[a][b] - result[m]["trans"][a][b]), a, b,
                              builtin[a][b], result[m]["trans"][a][b]))
        diffs.sort(reverse=True)
        print("  最大分歧   ：" + "; ".join(
            "%s→%s 手写 %.3f / 统计 %.3f" % (a, b, bp, tp) for _, a, b, bp, tp in diffs[:5]))


def main() -> int:
    corpus_dir = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "tools", "fixtures")
    result = train(corpus_dir)
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print("\n已写出 %s" % OUT_PATH)
    compare(result)
    return 0


if __name__ == "__main__":
    sys.exit(main())
