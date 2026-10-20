#!/usr/bin/env python
"""GET /validation 数据验证页冒烟测试（课本 4.3.2，实时渲染版）。

用法（在仓库根目录）：
    python tools/test-validation-page.py

检查项：
    1. GET /validation 返回 200，页面含「数据验证」与 base64 图数据
    2. 实时性：修改 trans_matrix.json 一个数值后重新请求，页面输出随之变化，然后还原
进程内自起 uvicorn，结束自动关闭，不留后台进程。
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import time
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND = os.path.join(ROOT, "backend")
MATRIX_PATH = os.path.join(BACKEND, "core", "data", "trans_matrix.json")


def check(name: str, ok: bool, detail: str = "") -> bool:
    print(("  PASS " if ok else "  FAIL ") + name + (" —— " + detail if detail else ""))
    return ok


def fetch(port: int) -> tuple[int, str]:
    with urllib.request.urlopen("http://127.0.0.1:%d/validation" % port, timeout=30) as r:
        return r.status, r.read().decode("utf-8")


def main() -> int:
    ok = True
    port = 8125
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app:app", "--host", "127.0.0.1", "--port", str(port)],
        cwd=BACKEND,
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    try:
        for _ in range(60):
            try:
                urllib.request.urlopen("http://127.0.0.1:%d/api/health" % port, timeout=1)
                break
            except Exception:
                time.sleep(0.5)

        print("== 1. 页面可用性 ==")
        status, html = fetch(port)
        ok &= check("返回 200", status == 200, str(status))
        ok &= check("含「数据验证」", "数据验证" in html)
        ok &= check("含 base64 图数据", html.count("data:image/png;base64,") >= 2,
                    "内嵌图片 %d 张" % html.count("data:image/png;base64,"))
        ok &= check("标注矩阵来源", "trained" in html or "builtin" in html)

        print("== 2. 实时性：改 JSON 后页面随之变化 ==")
        with open(MATRIX_PATH, encoding="utf-8") as f:
            original = f.read()
        data = json.loads(original)
        data["major"]["trans"]["I"]["IV"] = data["major"]["trans"]["I"]["IV"] + 0.25
        try:
            with open(MATRIX_PATH, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            _, html2 = fetch(port)
            changed = html2 != html
        finally:
            with open(MATRIX_PATH, "w", encoding="utf-8") as f:
                f.write(original)
        ok &= check("修改后页面输出变化", changed,
                    "HTML %d -> %d 字节" % (len(html), len(html2)))
        _, html3 = fetch(port)
        ok &= check("还原后恢复一致", html3 == html)
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=10)
        except subprocess.TimeoutExpired:
            proc.kill()

    print("== 结果：%s ==" % ("全部通过" if ok else "存在失败项"))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
