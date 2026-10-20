#!/usr/bin/env python
"""采集带 <harmony> 和弦标记的真实 MusicXML 语料（课本 4.3.1）。

来源：GitHub 公开仓库 00sapo/OpenEWLD（Wikifonia 公有领域 leadsheet
子集，.mxl 压缩 MusicXML）。流程：

    1. 下载仓库 zip（codeload），UA 伪装、超时重试 ≤3 次
    2. 逐首解压 .mxl → 读 META-INF/container.xml 找到主乐谱 →
       必须含 <harmony> 标签才入库到 corpus/，否则丢弃并记录
    3. 每个条目处理间隔 ≥1 秒（礼貌）；日志写 corpus/collect.log（不进 git）

用法（在仓库根目录）：
    python tools/collect_corpus.py [最多保留首数，默认 200]
"""
from __future__ import annotations

import io
import os
import re
import sys
import time
import urllib.request
import zipfile

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CORPUS_DIR = os.path.join(ROOT, "corpus")
LOG_PATH = os.path.join(CORPUS_DIR, "collect.log")

ZIP_URL = "https://codeload.github.com/00sapo/OpenEWLD/zip/refs/heads/master"
USER_AGENT = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
              "(KHTML, like Gecko) Chrome/124.0 Safari/537.36")
MAX_RETRIES = 3
TIMEOUT = 60
POLITE_DELAY = 1.0  # 条目间最小间隔（秒）

_log_fp = None


def log(msg: str) -> None:
    line = "[%s] %s" % (time.strftime("%H:%M:%S"), msg)
    print(line)
    if _log_fp:
        _log_fp.write(line + "\n")
        _log_fp.flush()


def download_zip() -> bytes:
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            req = urllib.request.Request(ZIP_URL, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
                data = r.read()
            log("下载成功 %s（%.1f KB，第 %d 次尝试）" % (ZIP_URL, len(data) / 1024, attempt))
            return data
        except Exception as exc:  # noqa: BLE001
            log("下载失败（第 %d/%d 次）：%s" % (attempt, MAX_RETRIES, exc))
            time.sleep(2 * attempt)
    raise SystemExit("下载失败 %s，已达最大重试次数" % ZIP_URL)


def find_root_score(inner: zipfile.ZipFile) -> str | None:
    """按 container.xml 定位主乐谱文件。"""
    try:
        container = inner.read("META-INF/container.xml").decode("utf-8", "replace")
    except KeyError:
        return None
    m = re.search(r'<rootfile[^>]*full-path=["\']([^"\']+)["\']', container)
    return m.group(1) if m else None


def slug(name: str) -> str:
    s = re.sub(r"[^A-Za-z0-9]+", "_", name).strip("_")
    return s[:60] or "untitled"


def main() -> int:
    max_keep = int(sys.argv[1]) if len(sys.argv) > 1 else 200
    os.makedirs(CORPUS_DIR, exist_ok=True)
    global _log_fp
    _log_fp = open(LOG_PATH, "a", encoding="utf-8")

    kept = discarded_no_harmony = discarded_error = scanned = 0
    try:
        blob = download_zip()
        with zipfile.ZipFile(io.BytesIO(blob)) as repo:
            names = sorted(n for n in repo.namelist() if n.lower().endswith(".mxl"))
            log("仓库内共 %d 个 .mxl，目标保留 %d 首" % (len(names), max_keep))
            for entry in names:
                if kept >= max_keep:
                    break
                scanned += 1
                try:
                    with zipfile.ZipFile(io.BytesIO(repo.read(entry))) as inner:
                        root_name = find_root_score(inner)
                        if root_name is None:
                            raise ValueError("container.xml 缺少 rootfile")
                        xml_bytes = inner.read(root_name)
                    text = xml_bytes.decode("utf-8", "replace")
                    if "<harmony>" not in text:
                        discarded_no_harmony += 1
                        log("丢弃（无 <harmony>）：%s" % entry)
                    else:
                        title = slug(os.path.splitext(os.path.basename(entry))[0])
                        out_name = "%03d_%s.musicxml" % (kept + 1, title)
                        with open(os.path.join(CORPUS_DIR, out_name), "wb") as f:
                            f.write(xml_bytes)
                        kept += 1
                        log("入库 %s（%s，%.1f KB）" % (out_name, entry, len(xml_bytes) / 1024))
                except Exception as exc:  # noqa: BLE001
                    discarded_error += 1
                    log("丢弃（解析失败）：%s —— %s" % (entry, exc))
                time.sleep(POLITE_DELAY)  # 礼貌延时
    finally:
        _log_fp.close()

    print("\n扫描 %d 首：入库 %d，无和弦标记 %d，解析失败 %d" %
          (scanned, kept, discarded_no_harmony, discarded_error))
    print("语料目录 %s，日志 %s" % (CORPUS_DIR, LOG_PATH))
    return 0


if __name__ == "__main__":
    sys.exit(main())
