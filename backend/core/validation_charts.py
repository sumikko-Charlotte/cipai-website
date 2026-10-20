"""课本 4.3.2 数据验证图表：转移矩阵对比热力图 + 和弦-单音分布柱状图。

被两处复用：
    backend/app.py  GET /validation  实时渲染（每次调用都重新读 JSON）
    tools/validate_matrix.py          落盘 PNG

注意：这里刻意不碰 key_analysis.load_trans_matrix() 的模块缓存，
training 脚本重跑后刷新页面即显示新数据，无需重启后端。

matplotlib 缺失 / JSON 缺失或格式非法时两个函数都返回 None，
由调用方优雅降级。
"""
from __future__ import annotations

import base64
import json
import os

_MATRIX_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "trans_matrix.json")

try:
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    # Windows 中文缺字体会告警，图表内尽量用英文标注
    _HAS_MPL = True
except ImportError:  # pragma: no cover - 依赖缺失时整模块降级
    _HAS_MPL = False


def _load_matrix() -> dict | None:
    """每次调用重新读 trans_matrix.json 并做最简校验，失败返回 None。"""
    try:
        with open(_MATRIX_PATH, encoding="utf-8") as f:
            data = json.load(f)
    except (OSError, ValueError):
        return None
    if not isinstance(data, dict):
        return None
    for mode in ("major", "minor"):
        node = data.get(mode)
        if not isinstance(node, dict) or not isinstance(node.get("trans"), dict):
            return None
    return data


def _builtin_probs(romans: list, trans_row_src) -> list[list[float]]:
    """内置 TRANS 权重按行归一化，与统计矩阵同口径。"""
    out = []
    for a in romans:
        row = trans_row_src.get(a, {})
        total = sum(row.values()) or 1.0
        out.append([row.get(b, 0.0) / total for b in romans])
    return out


def transition_chart_png() -> bytes | None:
    """转移矩阵「训练 vs 手写」对比热力图（含差值面板），返回 PNG bytes。"""
    if not _HAS_MPL:
        return None
    data = _load_matrix()
    if data is None:
        return None

    # 延迟导入，避免 matplotlib 缺失时影响 key_analysis 本身
    from core.key_analysis import DIATONIC, TRANS

    modes = ["major", "minor"]
    fig, axes = plt.subplots(2, 3, figsize=(15, 8))
    for r, mode in enumerate(modes):
        romans = [c["roman"] for c in DIATONIC[mode]]
        trained = [[data[mode]["trans"][a][b] for b in romans] for a in romans]
        builtin = _builtin_probs(romans, TRANS[mode])
        diff = [[trained[i][j] - builtin[i][j] for j in range(len(romans))] for i in range(len(romans))]
        vmax_diff = max(abs(min(min(diff))), max(max(diff)))
        for c, (mat, title, cmap, vmin, vmax) in enumerate([
            (trained, "trained (%s)" % mode, "viridis", 0.0, None),
            (builtin, "builtin TRANS (%s)" % mode, "viridis", 0.0, 1.0),
            (diff, "diff trained-builtin (%s)" % mode, "RdBu_r", -vmax_diff, vmax_diff),
        ]):
            ax = axes[r][c]
            im = ax.imshow(mat, cmap=cmap, vmin=vmin, vmax=vmax)
            ax.set_xticks(range(len(romans)), romans)
            ax.set_yticks(range(len(romans)), romans)
            ax.set_title(title)
            for i in range(len(romans)):
                for j in range(len(romans)):
                    ax.text(j, i, "%.2f" % mat[i][j], ha="center", va="center", fontsize=7,
                            color="w" if c < 2 and mat[i][j] > 0.5 else "k")
            fig.colorbar(im, ax=ax, fraction=0.046)
    fig.suptitle("Trained transition matrix vs builtin TRANS")
    fig.tight_layout()
    buf = _fig_to_png(fig)
    plt.close(fig)
    return buf


def _fig_to_png(fig) -> bytes:
    import io

    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=120)
    return buf.getvalue()


def emission_chart_png() -> bytes | None:
    """课本图 4-7 同款：每调内和弦一个子图，x 轴 12 音级，标出和弦构成音。"""
    if not _HAS_MPL:
        return None
    data = _load_matrix()
    if data is None:
        return None
    for mode in ("major", "minor"):
        node = data[mode]
        if not isinstance(node.get("emission"), dict):
            return None

    from core.key_analysis import CHORD_TONES, DIATONIC

    modes = ["major", "minor"]
    n_per = max(len(DIATONIC[m]) for m in modes)
    fig, axes = plt.subplots(len(modes), n_per, figsize=(2.4 * n_per, 5.4), sharey=True)
    pc_names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
    for r, mode in enumerate(modes):
        for c_i, cand in enumerate(DIATONIC[mode]):
            ax = axes[r][c_i]
            roman = cand["roman"]
            row = data[mode]["emission"].get(roman) or {}
            probs = [row.get(str(pc), 0.0) for pc in range(12)]
            tones = {(cand["deg"] + iv) % 12 for iv in CHORD_TONES[cand["type"]]}
            colors = ["#d62728" if pc in tones else "#1f77b4" for pc in range(12)]
            ax.bar(range(12), probs, color=colors)
            ax.set_xticks(range(12), pc_names, rotation=90, fontsize=6)
            ax.set_title(roman, fontsize=9)
            ax.tick_params(axis="y", labelsize=6)
            if c_i == 0:
                ax.set_ylabel("%s\nP(pitch|chord)" % mode, fontsize=8)
    fig.suptitle("Chord-tone distribution (red = chord tones)")
    fig.tight_layout()
    buf = _fig_to_png(fig)
    plt.close(fig)
    return buf


def png_to_b64(png: bytes | None) -> str | None:
    return base64.b64encode(png).decode("ascii") if png else None
