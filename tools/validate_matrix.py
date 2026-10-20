#!/usr/bin/env python
"""统计矩阵 vs 手写 TRANS 对比热力图，存 tools/matrix_compare.png。

用法（在仓库根目录）：
    python tools/validate_matrix.py
需先跑过 tools/train_chord_matrix.py 生成 backend/core/data/trans_matrix.json。
"""
from __future__ import annotations

import json
import os
import sys

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND = os.path.join(ROOT, "backend")
sys.path.insert(0, BACKEND)

from core.key_analysis import DIATONIC, TRANS  # noqa: E402

MATRIX_PATH = os.path.join(BACKEND, "core", "data", "trans_matrix.json")
OUT_PNG = os.path.join(ROOT, "tools", "matrix_compare.png")


def builtin_probs(mode: str, romans: list) -> list[list[float]]:
    out = []
    for a in romans:
        row = TRANS[mode].get(a, {})
        total = sum(row.values()) or 1.0
        out.append([row.get(b, 0.0) / total for b in romans])
    return out


def main() -> int:
    with open(MATRIX_PATH, encoding="utf-8") as f:
        trained = json.load(f)

    modes = ["major", "minor"]
    fig, axes = plt.subplots(2, 3, figsize=(15, 8))
    for r, mode in enumerate(modes):
        romans = [c["roman"] for c in DIATONIC[mode]]
        mats = [
            [trained[mode]["trans"][a][b] for b in romans] for a in romans
        ]
        builtin = builtin_probs(mode, romans)
        diff = [[mats[i][j] - builtin[i][j] for j in range(len(romans))] for i in range(len(romans))]
        for c, (mat, title, cmap) in enumerate([
            (mats, "trained (%s)" % mode, "viridis"),
            (builtin, "builtin TRANS (%s)" % mode, "viridis"),
            (diff, "diff trained-builtin (%s)" % mode, "RdBu_r"),
        ]):
            ax = axes[r][c]
            im = ax.imshow(mat, cmap=cmap, vmin=-max(abs(min(min(diff))), max(max(diff))) if c == 2 else 0,
                           vmax=None if c == 2 else 1)
            ax.set_xticks(range(len(romans)), romans)
            ax.set_yticks(range(len(romans)), romans)
            ax.set_title(title)
            for i in range(len(romans)):
                for j in range(len(romans)):
                    ax.text(j, i, "%.2f" % mat[i][j], ha="center", va="center",
                            fontsize=7, color="w" if c < 2 and mat[i][j] > 0.5 else "k")
            fig.colorbar(im, ax=ax, fraction=0.046)
    fig.suptitle("Trained transition matrix vs builtin TRANS")
    fig.tight_layout()
    fig.savefig(OUT_PNG, dpi=120)
    print("已保存 %s" % OUT_PNG)
    return 0


if __name__ == "__main__":
    sys.exit(main())
