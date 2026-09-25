"""调性与和弦推断（骨架，待实现）。

计划实现的算法，与教材 4.2.2（隐马尔可夫模型和维特比算法）一致，
也与前端实现同源，方便前后端结果互相验证：

    1. 调性判定：音符的音级分布与 Krumhansl-Kessler 音级轮廓
       做相关系数，24 个候选（12 大调 + 12 小调）取最高分
    2. 和弦识别：观测 = 每小节音级加权直方图，
       隐状态 = 调内候选和弦（三和弦/七和弦），
       转移矩阵 = 功能和声倾向（T-S-D-T），维特比解码全局最优

对照的前端实现（口径参考，勿改前端）：
    frontend/src/js/08-key-detect.js     Krumhansl 音级轮廓调性判定
    frontend/src/js/09-hmm-viterbi.js    HMM 建模 + 维特比解码

前端"导出 JSON"的字段就是本模块的目标输出格式（见 app.py 注释）。
"""
from __future__ import annotations

# Krumhansl-Kessler 音级轮廓（以主音为 0 级，长度 12）
KRUMLANSL_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
KRUMLANSL_MINOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]

PC_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]


def estimate_key(notes: list[dict]) -> dict:
    """估计调性。

    参数：
        notes: pitch_detection.segment_notes 的返回值，
               至少包含每个音符的 "midi" 字段

    返回：
        {"key": "G", "mode": "major", "confidence": 0.93, "scale": [67, 69, 71, ...]}
        key 为主音音名（PC_NAMES 中的写法），mode 为 "major" | "minor"，
        confidence 为相关系数归一化到 0~1，scale 为调内音高集合

    实现提示：
        hist = 12 维音级直方图（可按音符时长加权，与前端一致）
        对 12 个旋转 × 大/小轮廓算皮尔逊相关，取最大者
    """
    raise NotImplementedError("key_analysis.estimate_key 尚未实现")


def chord_sequence(notes: list[dict], key: str, mode: str) -> list[dict]:
    """HMM + 维特比，输出每小节和弦序列。

    参数：
        notes: 量化到网格后的音符（见 pitch_detection.quantize_to_grid）
        key / mode: estimate_key 的结果

    返回（与前端"导出 JSON"对齐）：
        [{"bar": 0, "symbol": "G", "degree": "I", "pitches": [67, 71, 74]}, ...]

    实现提示：
        观测概率 = 小节内 12 维音级直方图 与 和弦音级模板 的匹配度
        转移矩阵 = 功能和声倾向表（前端 09-hmm-viterbi.js 里有现成数值可参考）
    """
    raise NotImplementedError("key_analysis.chord_sequence 尚未实现")
