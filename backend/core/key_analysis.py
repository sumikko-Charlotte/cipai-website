"""调性与和弦推断。

算法与教材 4.2.2（隐马尔可夫模型和维特比算法）一致，也与前端实现同源，
方便前后端结果互相验证：

    1. 调性判定：音符的音级分布与 Krumhansl-Kessler 音级轮廓
       做相关系数，24 个候选（12 大调 + 12 小调）取最高分
    2. 和弦识别：观测 = 每小节音级直方图，
       隐状态 = 调内候选和弦，转移矩阵 = 功能和声倾向（T-S-D-T），
       维特比解码全局最优

对照的前端实现（口径参考，勿改前端）：
    frontend/src/js/08-key-detect.js     Krumhansl 音级轮廓调性判定
    frontend/src/js/09-hmm-viterbi.js    HMM 建模 + 维特比解码

后端实现是确定性的：不使用前端按风格随机升级七和弦的逻辑。
"""
from __future__ import annotations

# Krumhansl-Kessler 音级轮廓（以主音为 0 级，长度 12）
KRUMLANSL_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
KRUMLANSL_MINOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]

PC_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

SCALE_INTERVALS = {"major": [0, 2, 4, 5, 7, 9, 11], "minor": [0, 2, 3, 5, 7, 8, 10]}

CHORD_TONES = {
    "maj": [0, 4, 7],
    "min": [0, 3, 7],
    "dim": [0, 3, 6],
    "aug": [0, 4, 8],
    "sus4": [0, 5, 7],
    "maj7": [0, 4, 7, 11],
    "min7": [0, 3, 7, 10],
    "dom7": [0, 4, 7, 10],
    "m7b5": [0, 3, 6, 10],
}

CHORD_SUF = {
    "maj": "",
    "min": "m",
    "dim": "dim",
    "aug": "aug",
    "sus4": "sus4",
    "maj7": "maj7",
    "min7": "m7",
    "dom7": "7",
    "m7b5": "m7b5",
}

# 调内候选和弦（音级偏移 / 类型 / 功能标记），与前端 DIATONIC 一致
DIATONIC = {
    "major": [
        {"deg": 0, "type": "maj", "roman": "I"},
        {"deg": 2, "type": "min", "roman": "ii"},
        {"deg": 4, "type": "min", "roman": "iii"},
        {"deg": 5, "type": "maj", "roman": "IV"},
        {"deg": 7, "type": "maj", "roman": "V"},
        {"deg": 7, "type": "dom7", "roman": "V7"},
        {"deg": 9, "type": "min", "roman": "vi"},
    ],
    "minor": [
        {"deg": 0, "type": "min", "roman": "i"},
        {"deg": 3, "type": "maj", "roman": "III"},
        {"deg": 5, "type": "min", "roman": "iv"},
        {"deg": 7, "type": "maj", "roman": "V"},
        {"deg": 7, "type": "min", "roman": "v"},
        {"deg": 8, "type": "maj", "roman": "VI"},
        {"deg": 10, "type": "maj", "roman": "VII"},
    ],
}

# 功能和声转移倾向表，与前端 TRANS 一致
TRANS = {
    "major": {
        "I": {"IV": 1.7, "V": 1.2, "vi": 0.4, "ii": 0.5, "iii": 0.2, "V7": 1.3},
        "ii": {"V": 3.3, "V7": 3.5, "I": 0.3, "vi": 0.3, "IV": 0.1, "iii": 0.2},
        "iii": {"vi": 2.6, "IV": 0.4, "ii": 0.4, "I": 0.4, "V": 0.3},
        "IV": {"V": 0.8, "V7": 0.8, "ii": 0.6, "I": 1.4, "vi": 0.3, "iii": 0.2},
        "V": {"I": 2.6, "vi": 0.3, "IV": 0.2, "ii": 0.7, "iii": 0.3},
        "V7": {"I": 2.8, "vi": 0.3, "IV": 0.2},
        "vi": {"ii": 2.9, "IV": 0.2, "V": 0.4, "iii": 0.3, "I": 0.3},
    },
    "minor": {
        "i": {"iv": 1.0, "V": 0.7, "VI": 0.2, "VII": 0.3, "III": 0.2, "v": 0.4},
        "III": {"VI": 0.5, "VII": 0.6, "iv": 1.0, "i": 0.6},
        "iv": {"V": 0.8, "i": 0.7, "VII": 1.2, "VI": 0.1},
        "V": {"i": 1.5, "VI": 0.3, "iv": 0.3},
        "v": {"i": 1.0, "VI": 0.3, "VII": 0.4},
        "VI": {"VII": 0.6, "iv": 0.8, "V": 0.2, "i": 0.9, "III": 0.7},
        "VII": {"i": 0.8, "III": 1.1, "VI": 0.1},
    },
}

BEATS_PER_BAR = 4
GRIDS_PER_BEAT = 4


def _mod(n: int) -> int:
    return n % 12


def _chroma_histogram(notes: list[dict]) -> list[float]:
    """按时长加权的 12 维音级直方图（归一化），与前端 pitchHistogram 一致。"""
    hist = [0.0] * 12
    for note in notes:
        dur = note.get("dur") or (note.get("end", 0.0) - note.get("start", 0.0))
        hist[_mod(int(note["midi"]))] += max(dur, 0.0)
    total = sum(hist) or 1.0
    return [h / total for h in hist]


def _correlate(a: list[float], b: list[float]) -> float:
    n = len(a)
    ma = sum(a) / n
    mb = sum(b) / n
    num = da = db = 0.0
    for x, y in zip(a, b):
        dx, dy = x - ma, y - mb
        num += dx * dy
        da += dx * dx
        db += dy * dy
    return num / (da * db) ** 0.5 if da and db else -1.0


def estimate_key(notes: list[dict]) -> dict:
    """估计调性。

    参数：
        notes: pitch_detection.segment_notes 的返回值，
               至少包含每个音符的 "midi" 字段

    返回：
        {"key": "G", "mode": "major", "confidence": 0.93, "scale": [67, 69, 71, ...]}
        key 为主音音名（PC_NAMES 中的写法），mode 为 "major" | "minor"，
        confidence 为相关系数从 [-1,1] 线性映射到 0~1，scale 为调内音高集合
    """
    hist = _chroma_histogram(notes)
    best = {"root": 0, "mode": "major", "score": -2.0}
    for root in range(12):
        for mode, profile in (("major", KRUMLANSL_MAJOR), ("minor", KRUMLANSL_MINOR)):
            shifted = [profile[_mod(i - root)] for i in range(12)]
            score = _correlate(hist, shifted)
            if score > best["score"]:
                best = {"root": root, "mode": mode, "score": score}

    root_pc = best["root"]
    scale = [60 + root_pc + iv for iv in SCALE_INTERVALS[best["mode"]]]
    return {
        "key": PC_NAMES[root_pc],
        "mode": best["mode"],
        "confidence": round((best["score"] + 1.0) / 2.0, 3),
        "scale": scale,
    }


def _emission(hist: list[float], root_pc: int, chord_type: str, scale_pcs: list[int]) -> float:
    """观测似然：小节音级直方图与和弦模板的匹配打分，与前端 emission 一致。"""
    tones = [_mod(root_pc + iv) for iv in CHORD_TONES[chord_type]]
    score = 0.0
    for pc, weight in enumerate(hist):
        if not weight:
            continue
        if pc in tones:
            score += weight * 2.0
            if pc == _mod(root_pc):
                score += weight * 0.8
        elif pc in scale_pcs:
            score -= weight * 0.45
        else:
            score -= weight * 1.3
    return score * 4.0


def chord_sequence(notes: list[dict], key: str, mode: str) -> list[dict]:
    """HMM + 维特比，输出每小节和弦序列。

    参数：
        notes: 量化到网格后的音符（见 pitch_detection.quantize_to_grid），
               每项含 "beat" / "midi" 字段
        key / mode: estimate_key 的结果

    返回（相邻同和弦已合并）：
        [{"bar": 0, "symbol": "G", "degree": "I", "pitches": [67, 71, 74]}, ...]
    """
    root_pc = PC_NAMES.index(key)
    scale_pcs = [_mod(root_pc + iv) for iv in SCALE_INTERVALS[mode]]
    candidates = [
        {"rootPc": _mod(root_pc + c["deg"]), "type": c["type"], "roman": c["roman"]}
        for c in DIATONIC[mode]
    ]
    trans = TRANS[mode]

    # 每小节音级直方图（按音符数计权，与前端 barHistogram 一致）
    bars: dict[int, list[float]] = {}
    for note in notes:
        bar = int(note["beat"]) // BEATS_PER_BAR
        hist = bars.setdefault(bar, [0.0] * 12)
        hist[_mod(int(note["midi"]))] += 1.0
    if not bars:
        return []
    n_bars = max(bars) + 1
    bar_hists = []
    for b in range(n_bars):
        h = bars.get(b, [0.0] * 12)
        total = sum(h) or 1.0
        bar_hists.append([v / total for v in h])

    n = len(candidates)
    dp: list[list[float]] = []
    bp: list[list[int]] = []
    for b in range(n_bars):
        dp.append([-1e9] * n)
        bp.append([0] * n)
        for i, cand in enumerate(candidates):
            emit = _emission(bar_hists[b], cand["rootPc"], cand["type"], scale_pcs)
            if b == 0:
                dp[b][i] = emit
                bp[b][i] = -1
                continue
            best_val, best_j = -1e9, 0
            for j, prev in enumerate(candidates):
                t = trans.get(prev["roman"], {}).get(cand["roman"], -0.9)
                val = dp[b - 1][j] + t * 2.2
                if val > best_val:
                    best_val = val
                    best_j = j
            dp[b][i] = emit + best_val
            bp[b][i] = best_j

    last = max(range(n), key=lambda i: dp[n_bars - 1][i])
    idx = [0] * n_bars
    idx[n_bars - 1] = last
    for b in range(n_bars - 2, -1, -1):
        idx[b] = bp[b + 1][idx[b + 1]]

    out: list[dict] = []
    for b, i in enumerate(idx):
        cand = candidates[i]
        symbol = PC_NAMES[cand["rootPc"]] + CHORD_SUF[cand["type"]]
        item = {
            "bar": b,
            "symbol": symbol,
            "degree": cand["roman"],
            "pitches": [60 + cand["rootPc"] + iv for iv in CHORD_TONES[cand["type"]]],
        }
        if out and out[-1]["symbol"] == symbol and out[-1]["bar"] + 1 == b:
            continue  # 相邻同和弦合并（保留首个 bar 标记）
        out.append(item)
    return out
