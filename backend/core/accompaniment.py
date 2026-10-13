"""伴奏模块（课本 4.4.6）：和弦序列 → 伴奏音型编排 → MIDI 文件。

对应课本要求：服务端用 Python 的 mido 库把和弦序列转换为可播放的
MIDI 文件。音型逻辑与前端 src/js/10-accompaniment-patterns.js 同源，
只生成和弦 / 低音两个声部（旋律由客户端掌握），时间单位为八分音符步。

接口：
    build_accompaniment(chords, pattern, bpm) -> (events, midi_bytes)
"""
from __future__ import annotations

import io
import random
import tempfile

from mido import Message, MetaMessage, MidiFile, MidiTrack, bpm2tempo

# 与前端 00-music-core.js 的 CHORD_TONES 保持一致
CHORD_TONES = {
    "maj": [0, 4, 7], "min": [0, 3, 7], "dim": [0, 3, 6], "aug": [0, 4, 8],
    "sus4": [0, 5, 7], "maj7": [0, 4, 7, 11], "min7": [0, 3, 7, 10],
    "dom7": [0, 4, 7, 10], "m7b5": [0, 3, 6, 10],
}

# 与前端 03-styles.js 各风格 pat 字段对应的全部音型
PATTERNS = {
    "arpeggio", "counterpoint", "ballad", "walking", "power", "block",
    "chug", "funk16", "offbeat", "pulse", "lazy", "chip", "fingerpick",
    "strum", "guzheng",
}

PPQ = 480          # MIDI 分辨率（每拍 tick 数）
EIGHTH = PPQ // 2  # 一个八分音符步 = 240 tick


def _steps(s, d, step):
    """生成 [s, s+d) 内按 step 递增的时间点（整数计数避免浮点漂移）。"""
    n = int(round(d / step))
    return (s + k * step for k in range(n))


def build_accompaniment(chords, pattern, bpm):
    """和弦序列 → 伴奏事件列表 + MIDI 字节。

    chords: [{"rootPc": 0-11, "type": CHORD_TONES 键, "start": 八分步, "dur": 八分步}]
    返回 (events, midi_bytes)；events 元素为 {"pitch","start","dur","voice"}。
    """
    if pattern not in PATTERNS:
        raise ValueError(f"未知伴奏音型 {pattern!r}，支持：{sorted(PATTERNS)}")
    evs = []
    for ch in chords:
        ctype = ch["type"]
        if ctype not in CHORD_TONES:
            raise ValueError(f"未知和弦类型 {ctype!r}")
        base = 48 + int(ch["rootPc"])
        tones = CHORD_TONES[ctype]
        up = [base + 12 + iv for iv in tones]
        s, d = float(ch["start"]), float(ch["dur"])
        bp = base - 12

        evs.append({"pitch": bp, "start": s, "dur": min(d, 4), "voice": "bass"})
        if d >= 8:
            evs.append({"pitch": bp, "start": s + d / 2, "dur": d / 2, "voice": "bass"})

        if pattern == "arpeggio":
            seq = [0, 1, 2, 1, 0, 1, 2, 1, 2, 1, 0, 1, 2, 1, 2, 1]
            for i, t in enumerate(_steps(s, d, 1)):
                evs.append({"pitch": up[seq[i % 16]], "start": t, "dur": 1.4, "voice": "chord"})

        elif pattern == "counterpoint":
            for k, t in enumerate(_steps(s, d, 1)):
                pitch = up[k % len(up)] if k % 2 == 0 else base + 12 + tones[k % len(tones)]
                evs.append({"pitch": pitch, "start": t, "dur": 1.6, "voice": "chord"})

        elif pattern == "ballad":
            wide = up + [base + 24 + iv for iv in tones]
            for i, t in enumerate(_steps(s, d, 2)):
                evs.append({"pitch": wide[i % len(wide)], "start": t, "dur": 2.8, "voice": "chord"})
                evs.append({"pitch": wide[(i + 2) % len(wide)], "start": t + .5, "dur": 2.4, "voice": "chord"})

        elif pattern == "walking":
            for t in _steps(s, d, 4):
                for p in up:
                    evs.append({"pitch": p, "start": t, "dur": 1.3, "voice": "chord"})
                for p in up:
                    evs.append({"pitch": p, "start": t + 2.66, "dur": 1.1, "voice": "chord"})
            sc = [0, 3, 5, 7, 10]
            for t in _steps(s, d, 2):
                evs.append({"pitch": base - 12 + random.choice(sc), "start": t, "dur": 1.7, "voice": "bass"})

        elif pattern == "power":
            for t in _steps(s, d, 2):
                for p in up:
                    evs.append({"pitch": p, "start": t, "dur": 1.75, "voice": "chord"})
            evs.append({"pitch": bp, "start": s, "dur": 1, "voice": "bass"})
            evs.append({"pitch": bp, "start": s + 2, "dur": 1, "voice": "bass"})

        elif pattern == "block":
            for t in _steps(s, d, 1):
                for p in up:
                    evs.append({"pitch": p, "start": t, "dur": .85, "voice": "chord"})
                evs.append({"pitch": bp, "start": t, "dur": .85, "voice": "bass"})

        elif pattern == "chug":
            for k, t in enumerate(_steps(s, d, .5)):
                evs.append({"pitch": bp, "start": t, "dur": .45, "voice": "bass"})
                if k % 2 == 0:
                    for p in up:
                        evs.append({"pitch": p, "start": t, "dur": 1.7, "voice": "chord"})

        elif pattern == "funk16":
            pat = [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1]
            for k, t in enumerate(_steps(s, d, .5)):
                if pat[k % 16]:
                    evs.append({"pitch": up[k % len(up)], "start": t, "dur": .45, "voice": "chord"})
            for t in _steps(s, d, 1):
                evs.append({"pitch": bp + (12 if random.random() < .3 else 0), "start": t + .5, "dur": .6, "voice": "bass"})

        elif pattern == "offbeat":
            for t in _steps(s, d, 2):
                for p in up:
                    evs.append({"pitch": p, "start": t + 1, "dur": 1.1, "voice": "chord"})
                evs.append({"pitch": bp, "start": t, "dur": 1.6, "voice": "bass"})

        elif pattern == "pulse":
            for t in _steps(s, d, 2):
                for p in up:
                    evs.append({"pitch": p, "start": t, "dur": .95, "voice": "chord"})
            for k, t in enumerate(_steps(s, d, 1)):
                evs.append({"pitch": bp if int(round(t)) % 4 == 0 else bp + 12, "start": t, "dur": .8, "voice": "bass"})

        elif pattern == "lazy":
            for t in _steps(s, d, 4):
                for p in up:
                    evs.append({"pitch": p, "start": t, "dur": 2.6, "voice": "chord"})
                for p in up:
                    evs.append({"pitch": p, "start": t + 2.7, "dur": 1.9, "voice": "chord"})
            for t in _steps(s, d, 2):
                evs.append({"pitch": bp, "start": t + .3, "dur": 1.8, "voice": "bass"})

        elif pattern == "chip":
            seq = tones + [iv + 12 for iv in tones]
            for i, t in enumerate(_steps(s, d, .5)):
                evs.append({"pitch": base + 12 + seq[i % len(seq)], "start": t, "dur": .42, "voice": "chord"})
            for t in _steps(s, d, 1):
                evs.append({"pitch": bp, "start": t, "dur": .8, "voice": "bass"})

        elif pattern == "fingerpick":
            seq = [0, 2, 1, 2]
            for k, t in enumerate(_steps(s, d, 1)):
                if k % 4 == 0:
                    evs.append({"pitch": bp, "start": t, "dur": 1.5, "voice": "bass"})
                else:
                    evs.append({"pitch": up[seq[k % 4]], "start": t, "dur": 1.5, "voice": "chord"})

        elif pattern == "strum":
            pat = [1, 0, 1, 1, 0, 1, 1, 0]
            for k, t in enumerate(_steps(s, d, 1)):
                if pat[k % 8]:
                    for j, p in enumerate(up):
                        evs.append({"pitch": p, "start": t + j * .045, "dur": 1.3, "voice": "chord"})
            for t in _steps(s, d, 2):
                evs.append({"pitch": bp, "start": t, "dur": 1.6, "voice": "bass"})

        elif pattern == "guzheng":
            pts = [base + 12 + iv for iv in [0, 2, 4, 7, 9]]
            seq = [0, 1, 2, 3, 4, 3, 2, 1]
            for i, t in enumerate(_steps(s, d, 1)):
                evs.append({"pitch": pts[seq[i % 8]], "start": t, "dur": 1.2, "voice": "chord"})

    evs.sort(key=lambda e: (e["start"], 0 if e["voice"] == "bass" else 1))
    return evs, _to_midi(evs, bpm)


def _to_midi(events, bpm):
    """伴奏事件 → 标准 MIDI 文件字节（两个轨道：Chords / Bass）。"""
    mf = MidiFile(ticks_per_beat=PPQ)
    meta = MidiTrack()
    meta.append(MetaMessage("set_tempo", tempo=bpm2tempo(bpm), time=0))
    meta.append(MetaMessage("time_signature", numerator=4, denominator=4, time=0))
    mf.tracks.append(meta)

    for name, program, voice, vel in (("Chords", 0, "chord", 74), ("Bass", 32, "bass", 84)):
        tr = MidiTrack()
        tr.append(MetaMessage("track_name", name=name, time=0))
        tr.append(Message("program_change", program=program, time=0))
        msgs = []
        for e in events:
            if e["voice"] != voice:
                continue
            pitch = max(0, min(127, int(round(e["pitch"]))))
            on = int(round(e["start"] * EIGHTH))
            off = int(round((e["start"] + e["dur"]) * EIGHTH))
            msgs.append((on, 1, Message("note_on", note=pitch, velocity=vel, time=0)))
            msgs.append((off, 0, Message("note_off", note=pitch, velocity=0, time=0)))
        msgs.sort(key=lambda m: (m[0], m[1]))
        last = 0
        for tick, _order, m in msgs:
            m.time = max(0, tick - last)
            tr.append(m)
            last = tick
        tr.append(MetaMessage("end_of_track", time=0))
        mf.tracks.append(tr)

    with tempfile.NamedTemporaryFile(suffix=".mid", delete=False) as tmp:
        path = tmp.name
    mf.save(path)
    with open(path, "rb") as f:
        data = f.read()
    import os
    os.unlink(path)
    return data
