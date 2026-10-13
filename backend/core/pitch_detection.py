"""音频音高分析。

管线（与前端浏览器端保持同一套口径，便于前后端结果对照）：

    音频字节 → 解码（soundfile；.webm/.m4a 等失败时回退 ffmpeg 转码）
            → 转单声道、重采样到 22050 Hz
            → librosa.pyin 逐帧基频（fmin=80, fmax=800）
            → 插值 + 中值滤波去毛刺
            → 按音高稳定性切分音符段
            → 量化到 16 分音符网格

对照的前端实现（口径参考，勿改前端）：
    frontend/src/js/17-waveform-pitch.js   逐帧音高提取
    frontend/src/js/18-recording.js        录音 → 音符切分 → 量化
    frontend/src/js/16-import.js           音频文件解码入口

所有函数都是纯函数：入参 bytes/list/dict，出参 list/dict，不碰文件系统。
"""
from __future__ import annotations

import io
import logging
import shutil
import subprocess

import numpy as np

logger = logging.getLogger("accompaniment")

PYIN_FMIN = 80.0   # 哼唱基频下限（Hz）
PYIN_FMAX = 800.0  # 哼唱基频上限（Hz）
FRAME_LENGTH = 2048
HOP_LENGTH = 512


def _find_ffmpeg() -> str | None:
    """依次找系统 ffmpeg 和 imageio-ffmpeg 自带的静态二进制。"""
    exe = shutil.which("ffmpeg")
    if exe:
        return exe
    try:
        import imageio_ffmpeg  # 可选兜底，pip install imageio-ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return None


def _load_audio(audio_bytes: bytes) -> tuple[np.ndarray, int]:
    """把音频字节解码为 (单声道 float32 数组, 采样率)。

    优先 soundfile（wav/ogg/flac/mp3 等 libsndfile 支持的格式）；
    失败则回退 ffmpeg 转码成内存中的 wav。两种都失败抛 ValueError。
    """
    import soundfile as sf

    try:
        data, sr = sf.read(io.BytesIO(audio_bytes), dtype="float32", always_2d=True)
    except Exception:
        exe = _find_ffmpeg()
        if not exe:
            raise ValueError(
                "无法解码该音频：系统未安装 ffmpeg，"
                "且未安装 imageio-ffmpeg（pip install imageio-ffmpeg）"
            )
        proc = subprocess.run(
            [exe, "-v", "error", "-i", "pipe:0", "-f", "wav", "-ac", "1", "pipe:1"],
            input=audio_bytes,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        if proc.returncode != 0 or not proc.stdout:
            raise ValueError("ffmpeg 解码失败：" + proc.stderr.decode("utf-8", "replace")[:200])
        data, sr = sf.read(io.BytesIO(proc.stdout), dtype="float32", always_2d=True)

    mono = data.mean(axis=1) if data.ndim > 1 else data
    return np.asarray(mono, dtype=np.float32), int(sr)


def extract_pitch_series(
    audio_bytes: bytes,
    filename: str | None = None,
    sr: int = 22050,
) -> list[dict]:
    """从音频字节流提取逐帧音高序列。

    参数：
        audio_bytes: 上传的音频原始字节
        filename:    原始文件名（仅用于日志；解码按内容自动识别）
        sr:          目标采样率，默认 22050（与前端一致）

    返回：
        [{"t": 0.00, "freq": 220.0, "midi": 57, "rms": 0.03}, ...]
        t 为秒，freq 为 Hz（无声帧 freq=None），midi 为最近的 MIDI 音高号
    """
    import librosa

    y, orig_sr = _load_audio(audio_bytes)
    if orig_sr != sr:
        y = librosa.resample(y, orig_sr=orig_sr, target_sr=sr)

    f0, _, _ = librosa.pyin(
        y,
        fmin=PYIN_FMIN,
        fmax=PYIN_FMAX,
        sr=sr,
        frame_length=FRAME_LENGTH,
        hop_length=HOP_LENGTH,
    )

    # 中值滤波去毛刺：先对 NaN 段做线性插值，滤波后再 mask 回无声帧
    n = len(f0)
    valid = ~np.isnan(f0)
    if valid.sum() >= 3:
        idx = np.arange(n)
        filled = np.interp(idx, idx[valid], f0[valid])
        filtered = _median_filter(filled, size=5)
        f0 = np.where(valid, filtered, np.nan)

    rms = librosa.feature.rms(y=y, frame_length=FRAME_LENGTH, hop_length=HOP_LENGTH)[0]
    times = librosa.times_like(f0, sr=sr, hop_length=HOP_LENGTH)

    frames: list[dict] = []
    for i in range(n):
        freq = f0[i]
        frames.append(
            {
                "t": round(float(times[i]), 3),
                "freq": None if np.isnan(freq) else round(float(freq), 2),
                "midi": None if np.isnan(freq) else int(round(librosa.hz_to_midi(freq))),
                "rms": round(float(rms[min(i, len(rms) - 1)]), 4),
            }
        )
    return frames


def _median_filter(x: np.ndarray, size: int = 5) -> np.ndarray:
    from scipy.ndimage import median_filter

    return median_filter(x, size=size, mode="nearest")


def segment_notes(
    pitch_series: list[dict],
    min_dur: float = 0.08,
    pitch_tol_semitones: float = 0.8,
) -> list[dict]:
    """把逐帧音高序列切成音符段。

    参数：
        pitch_series:       extract_pitch_series 的返回值
        min_dur:            最短音符时长（秒），短于则丢弃（过滤抖动）
        pitch_tol_semitones: 同一音符内允许的音高波动（半音数）

    返回：
        [{"start": 0.12, "end": 0.44, "midi": 60, "freq_mean": 261.6}, ...]
    """
    dt = _frame_dt(pitch_series)
    runs: list[list[dict]] = []
    current: list[dict] = []

    def close_run() -> None:
        nonlocal current
        if current:
            runs.append(current)
            current = []

    for frame in pitch_series:
        midi = frame["midi"]
        if midi is None:
            close_run()
            continue
        if current:
            ref = np.median([f["midi"] for f in current])
            if abs(midi - ref) > pitch_tol_semitones:
                close_run()
        current.append(frame)
    close_run()

    notes: list[dict] = []
    for run in runs:
        start = run[0]["t"]
        end = run[-1]["t"] + dt
        if end - start < min_dur:
            continue
        freqs = [f["freq"] for f in run if f["freq"]]
        midis = [f["midi"] for f in run if f["midi"] is not None]
        if not freqs or not midis:
            continue
        notes.append(
            {
                "start": round(start, 3),
                "end": round(end, 3),
                "midi": int(round(float(np.median(midis)))),
                "freq_mean": round(float(np.mean(freqs)), 2),
            }
        )
    return notes


def _frame_dt(pitch_series: list[dict]) -> float:
    if len(pitch_series) >= 2:
        return float(pitch_series[1]["t"] - pitch_series[0]["t"])
    return HOP_LENGTH / 22050.0


def quantize_to_grid(
    notes: list[dict],
    bpm: float = 90.0,
    grid: int = 16,
) -> list[dict]:
    """把音符段量化到节奏网格（供和弦分析按拍组织观测）。

    参数：
        notes: segment_notes 的返回值
        bpm:   速度；调用方可先用 estimate_tempo_from_notes 估计
        grid:  每小节格数（16 = 十六分音符网格，与前端一致）

    返回：
        [{"beat": 0, "grid": 3, "midi": 60, "dur_grids": 2}, ...]
        beat/grid 从 0 起算；grid 为拍内格号（0~grid/4-1）
    """
    if not notes or bpm <= 0:
        return []
    beat_sec = 60.0 / bpm
    grid_sec = beat_sec * 4.0 / grid

    out: list[dict] = []
    for note in sorted(notes, key=lambda n: n["start"]):
        start_g = int(round(note["start"] / grid_sec))
        dur_g = max(1, int(round((note["end"] - note["start"]) / grid_sec)))
        out.append(
            {
                "beat": start_g // (grid // 4),
                "grid": start_g % (grid // 4),
                "midi": int(note["midi"]),
                "dur_grids": dur_g,
            }
        )
    return out


def estimate_tempo_from_notes(notes: list[dict], fallback: float = 90.0) -> float:
    """由音符起音间隔估计速度（BPM）。

    哼唱没有稳定节拍时结果仅供参考；间隔太少或离群太严重则返回 fallback。
    """
    if len(notes) < 3:
        return fallback
    onsets = sorted(n["start"] for n in notes)
    intervals = [b - a for a, b in zip(onsets, onsets[1:]) if 0.15 <= b - a <= 2.0]
    if not intervals:
        return fallback
    median_sec = float(np.median(intervals))
    bpm = 60.0 / median_sec
    # 倍速/半速归一：人常按 60~180 的体感速度哼
    while bpm < 60:
        bpm *= 2
    while bpm > 180:
        bpm /= 2
    return round(bpm, 1)
