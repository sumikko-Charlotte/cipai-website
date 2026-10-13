#!/usr/bin/env python
"""/api/accompany 冒烟测试：和弦序列 → 服务端伴奏生成（课本 4.4.6）。

用法（在仓库根目录）：
    python tools/test-accompany-api.py

检查项：
    1. /api/health 正常
    2. POST /api/accompany（G 大调 I–V7–I 进行）：engine == "mido"，
       伴奏事件只含 chord/bass 两个声部，音高都在合法 MIDI 范围
    3. 返回的 midi_b64 能被 mido 解析：轨道齐全、tempo 与请求 bpm 一致
    4. 非法音型 / 非法和弦类型返回 422
进程内自起 uvicorn，结束自动关闭，不留后台进程。
"""
from __future__ import annotations

import base64
import io
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND = os.path.join(ROOT, "backend")
sys.path.insert(0, BACKEND)

# G 大调 4 小节：I(2 小节) → V7(1 小节) → I(1 小节)
CHORDS = [
    {"rootPc": 7, "type": "maj", "start": 0, "dur": 8},
    {"rootPc": 2, "type": "dom7", "start": 8, "dur": 4},
    {"rootPc": 7, "type": "maj", "start": 12, "dur": 4},
]


def check(name: str, ok: bool, detail: str = "") -> bool:
    print(("  PASS " if ok else "  FAIL ") + name + (" —— " + detail if detail else ""))
    return ok


def post_json(port: int, payload: dict):
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        "http://127.0.0.1:%d/api/accompany" % port, data=data,
        headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"{}")


def main() -> int:
    ok = True
    port = 8124
    print("== /api/accompany 真实 HTTP（mido 引擎）==")
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app:app", "--host", "127.0.0.1", "--port", str(port)],
        cwd=BACKEND, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    try:
        health = None
        for _ in range(60):
            try:
                with urllib.request.urlopen("http://127.0.0.1:%d/api/health" % port, timeout=1) as r:
                    health = json.loads(r.read())
                break
            except Exception:
                time.sleep(0.5)
        ok &= check("服务启动", health is not None, str(health))

        status, res = post_json(port, {"chords": CHORDS, "pattern": "arpeggio", "bpm": 96})
        ok &= check("请求成功", status == 200, "HTTP %d" % status)
        ok &= check("mido 引擎", res.get("engine") == "mido", str(res.get("engine")))

        events = res.get("events", [])
        voices = sorted(set(e["voice"] for e in events))
        ok &= check("声部 = 和弦 + 低音", voices == ["bass", "chord"], str(voices))
        ok &= check("事件数合理", len(events) > 0, "%d 个" % len(events))
        pitches = [e["pitch"] for e in events]
        ok &= check("音高在 MIDI 范围", all(0 <= p <= 127 for p in pitches),
                    "%d..%d" % (min(pitches), max(pitches)))

        raw = base64.b64decode(res.get("midi_b64", ""))
        ok &= check("MIDI 头", raw[:4] == b"MThd", str(raw[:4]))

        from mido import MidiFile
        mf = MidiFile(file=io.BytesIO(raw))
        ok &= check("MIDI 轨道（tempo + 2 声部）", len(mf.tracks) == 3, "%d 条" % len(mf.tracks))
        tempo = next(m for m in mf.tracks[0] if m.type == "set_tempo")
        bpm_back = round(60000000 / tempo.tempo)
        ok &= check("速度还原 96 BPM", abs(bpm_back - 96) <= 1, "实得 %d" % bpm_back)

        status, _ = post_json(port, {"chords": CHORDS, "pattern": "no-such-pattern"})
        ok &= check("非法音型 → 422", status == 422, "HTTP %d" % status)

        bad = [dict(CHORDS[0], type="weird")]
        status, _ = post_json(port, {"chords": bad, "pattern": "arpeggio"})
        ok &= check("非法和弦类型 → 422", status == 422, "HTTP %d" % status)
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()

    print("== 结果：%s ==" % ("全部通过" if ok else "存在失败项"))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
