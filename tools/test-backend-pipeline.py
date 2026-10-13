#!/usr/bin/env python
"""后端闭环冒烟测试：合成一段已知旋律的 WAV，走完整条后端管线并断言。

用法（在仓库根目录）：
    python tools/test-backend-pipeline.py

检查项：
    1. extract_pitch_series → segment_notes：切出的音符数与音高正确
    2. estimate_key：G 大调旋律应判 G major（此前前端 bug 的同款校验）
    3. estimate_tempo_from_notes：合成时按 120 BPM，应估在 60~180 合理带
    4. quantize_to_grid + chord_sequence：HMM 输出非空、主音级为 I
    5. /api/analyze（真实 HTTP）：返回 engine == "librosa" 且字段齐全
进程内自起 uvicorn，结束自动关闭，不留后台进程。
"""
from __future__ import annotations

import io
import json
import math
import os
import subprocess
import sys
import time
import urllib.request
import wave

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND = os.path.join(ROOT, "backend")
sys.path.insert(0, BACKEND)

SR = 22050
BPM = 120.0
NOTE_SEC = 60.0 / BPM  # 0.5s，四分音符

# G 大调旋律：G4 A4 B4 D5 B4 A4 G4（四分音符 × 6 + 全音符长音收尾）
MIDI_FREQ = {m: 440.0 * 2 ** ((m - 69) / 12) for m in range(128)}
MELODY = [(67, 4), (69, 1), (71, 1), (74, 1), (71, 1), (69, 1), (67, 2)]  # (midi, 拍数)


def synth_wav_bytes() -> bytes:
    """正弦 + 二次谐波 + 淡入淡出，模拟干净哼唱。"""
    frames = []
    for midi, beats in MELODY:
        dur = beats * NOTE_SEC
        n = int(dur * SR)
        f = MIDI_FREQ[midi]
        t = np.arange(n) / SR
        env = np.minimum(1.0, np.minimum(t / 0.03, (dur - t) / 0.03)).clip(0, 1)
        seg = (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t)) * 0.5 * env
        frames.append(seg)
        frames.append(np.zeros(int(0.03 * SR)))  # 句间小间隙
    y = np.concatenate(frames)
    pcm = (y * 32767).astype("<i2")
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    return buf.getvalue()


def check(name: str, ok: bool, detail: str = "") -> bool:
    print(("  PASS " if ok else "  FAIL ") + name + (" —— " + detail if detail else ""))
    return ok


def main() -> int:
    wav = synth_wav_bytes()
    print("== 1. core 管线（合成 WAV，%.1f KB，G 大调，%d BPM）==" % (len(wav) / 1024, BPM))

    from core import key_analysis, pitch_detection

    series = pitch_detection.extract_pitch_series(wav, filename="synth.wav")
    notes = pitch_detection.segment_notes(series)
    ok = check("音符切分", len(notes) == len(MELODY),
               "期望 %d 个，实得 %d 个" % (len(MELODY), len(notes)))
    if notes:
        got = [n["midi"] for n in notes]
        want = [m for m, _ in MELODY]
        ok &= check("音高正确", got == want, "期望 %s，实得 %s" % (want, got))

    est = key_analysis.estimate_key(notes)
    ok &= check("调性判定", est["key"] == "G" and est["mode"] == "major",
                "实得 %s %s（置信 %.3f）" % (est["key"], est["mode"], est["confidence"]))

    bpm = pitch_detection.estimate_tempo_from_notes(notes)
    ok &= check("速度估计", 60 <= bpm <= 180, "实得 %.1f BPM" % bpm)

    grid = pitch_detection.quantize_to_grid(notes, bpm=bpm)
    chords = key_analysis.chord_sequence(grid, est["key"], est["mode"])
    ok &= check("和弦序列非空", len(chords) > 0, str([c["symbol"] for c in chords]))
    deg = [c["degree"] for c in chords]
    ok &= check("HMM 终止落主和弦", bool(deg) and deg[-1] in ("I", "i"),
                "进行 " + " → ".join(deg))

    print("== 2. /api/analyze 真实 HTTP ==")
    port = 8123
    env = dict(os.environ)
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app:app", "--host", "127.0.0.1", "--port", str(port)],
        cwd=BACKEND, env=env,
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
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
        if health:
            ok &= check("真实引擎可用", health.get("engine") == "librosa", "engine=" + str(health.get("engine")))
            req = urllib.request.Request(
                "http://127.0.0.1:%d/api/analyze" % port, data=wav,
                headers={"Content-Type": "audio/wav"}, method="POST")
            # multipart 表单
            boundary = "----pyboundary"
            body = (
                "--%s\r\nContent-Disposition: form-data; name=\"audio\"; filename=\"synth.wav\"\r\n"
                "Content-Type: audio/wav\r\n\r\n" % boundary
            ).encode() + wav + ("\r\n--%s--\r\n" % boundary).encode()
            req = urllib.request.Request(
                "http://127.0.0.1:%d/api/analyze" % port, data=body,
                headers={"Content-Type": "multipart/form-data; boundary=%s" % boundary}, method="POST")
            with urllib.request.urlopen(req, timeout=60) as r:
                result = json.loads(r.read())
            ok &= check("分析接口", result.get("engine") == "librosa" and result.get("key") == "G",
                        "engine=%s key=%s %s notes=%s bpm=%s" % (
                            result.get("engine"), result.get("key"), result.get("mode"),
                            result.get("notes_detected"), result.get("tempo_bpm")))
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
