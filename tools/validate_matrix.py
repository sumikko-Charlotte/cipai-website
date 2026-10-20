#!/usr/bin/env python
"""落盘验证图表：调用 backend/core/validation_charts.py 的实时渲染函数。

产物：
    tools/matrix_compare.png   转移矩阵「训练 vs 手写」对比热力图（含差值面板）
    tools/emission_chart.png   和弦-单音分布柱状图（课本图 4-7 同款）

用法（在仓库根目录，需先跑过 tools/train_chord_matrix.py）：
    python tools/validate_matrix.py
"""
from __future__ import annotations

import os
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND = os.path.join(ROOT, "backend")
sys.path.insert(0, BACKEND)

from core import validation_charts  # noqa: E402

OUTPUTS = [
    ("transition_chart_png", os.path.join(ROOT, "tools", "matrix_compare.png")),
    ("emission_chart_png", os.path.join(ROOT, "tools", "emission_chart.png")),
]


def main() -> int:
    ok = True
    for fn_name, out_path in OUTPUTS:
        png = getattr(validation_charts, fn_name)()
        if png is None:
            print("生成失败 %s：matplotlib 缺失或 backend/core/data/trans_matrix.json 缺失/非法" % out_path)
            ok = False
            continue
        with open(out_path, "wb") as f:
            f.write(png)
        print("已保存 %s" % out_path)
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
