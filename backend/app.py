"""旋律的自动伴奏生成 · 后端服务（FastAPI 骨架）。

启动（必须在 backend/ 目录下执行，保证 `from core import ...` 可用）：

    cd backend
    pip install -r requirements.txt
    uvicorn app:app --reload --host 127.0.0.1 --port 8000

接口：
    GET  /              服务信息
    GET  /api/health    健康检查（engine 字段反映真实引擎是否可用）
    POST /api/analyze   上传音频，返回调性/速度等分析结果
    POST /api/accompany 和弦序列 → 服务端生成伴奏（mido → MIDI，课本 4.4.6）

core/ 已实现真实分析管线（librosa.pyin 音高提取 + Krumhansl 调性判定），
/api/analyze 默认走真实引擎；librosa 不可用时回落 mock，engine 字段相应变化。

交互文档：启动后浏览器打开 http://127.0.0.1:8000/docs
"""
from __future__ import annotations

import base64
import logging
import time

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from core import accompaniment, key_analysis, pitch_detection

logger = logging.getLogger("accompaniment")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

app = FastAPI(
    title="旋律的自动伴奏生成 API",
    version="0.1.0",
    description="课程项目《人工智能程序设计实践》第 4 章 · 后端音频分析与未来 AI 生成服务",
)

# 前端目前用 file:// 直接打开（Origin 为 null）或本地 http 服务，
# 课程演示阶段放开跨域；正式部署时请改成前端实际来源。
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_SUFFIXES = {".wav", ".mp3", ".m4a", ".ogg", ".webm", ".flac"}
MAX_UPLOAD_BYTES = 20 * 1024 * 1024  # 20 MB

# 前端 22-api-client.js 约定的字段名，两边要保持一致
AUDIO_FIELD = "audio"


@app.get("/")
async def root() -> dict:
    return {"service": "accompaniment-api", "version": app.version, "docs": "/docs"}


def _engine_name() -> str:
    """探测真实分析引擎是否可用（librosa 可导入即视为可用）。"""
    try:
        import librosa  # noqa: F401

        return "librosa"
    except ImportError:
        return "mock"


@app.get("/api/health")
async def health() -> dict:
    return {
        "status": "ok",
        "version": app.version,
        "engine": _engine_name(),
        "time": time.strftime("%Y-%m-%d %H:%M:%S"),
    }


@app.post("/api/analyze", summary="上传音频，返回调性等分析结果")
async def analyze(audio: UploadFile = File(..., description="录音或音频文件")) -> dict:
    """接收音频文件，返回调性/速度/音符数等分析结果。

    执行顺序：校验 → 尝试调用 core/ 的真实算法 → 失败(未实现)则回落 mock。
    """
    data = await audio.read()

    suffix = ""
    if audio.filename and "." in audio.filename:
        suffix = "." + audio.filename.rsplit(".", 1)[1].lower()
    if suffix and suffix not in ALLOWED_SUFFIXES:
        raise HTTPException(
            status_code=415,
            detail=f"不支持的音频格式 {suffix}，允许：{sorted(ALLOWED_SUFFIXES)}",
        )
    if not data:
        raise HTTPException(status_code=400, detail="上传内容为空")
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="音频超过 20MB 上限")

    t0 = time.perf_counter()

    # ---- 预留的接入点（core/ 实现后自动生效，无需改这里）----
    # 前后端口径一致：旋律音高 → 音符段 → 调性/和弦
    engine = "mock"
    result: dict = {
        "key": "G",
        "mode": "major",
        "confidence": 0.95,
        "tempo_bpm": 96.0,
        "notes_detected": 32,
        "duration_sec": 12.8,
    }
    try:
        pitch_series = pitch_detection.extract_pitch_series(data, filename=audio.filename)
        notes = pitch_detection.segment_notes(pitch_series)
        estimate = key_analysis.estimate_key(notes)
        result.update(estimate)
        result["notes_detected"] = len(notes)
        result["duration_sec"] = round(pitch_series[-1]["t"], 2) if pitch_series else 0.0
        result["tempo_bpm"] = pitch_detection.estimate_tempo_from_notes(notes)
        grid = pitch_detection.quantize_to_grid(notes, bpm=result["tempo_bpm"])
        result["chords"] = key_analysis.chord_sequence(grid, estimate["key"], estimate["mode"])
        engine = "librosa"
    except ValueError as exc:
        # 解码失败（缺 ffmpeg 或格式不支持）属于客户端问题，返回 422
        raise HTTPException(status_code=422, detail=str(exc))
    except NotImplementedError as exc:
        logger.info("core 尚未实现，返回 mock 数据：%s", exc)
    except Exception:
        logger.exception("音频分析失败")
        raise HTTPException(status_code=500, detail="音频分析失败，详见服务端日志")

    result.update(
        {
            "engine": engine,
            "matrix_source": key_analysis.matrix_source(),
            "elapsed_ms": round((time.perf_counter() - t0) * 1000, 1),
            "filename": audio.filename,
            "bytes": len(data),
        }
    )
    return result


class ChordIn(BaseModel):
    """一个和弦占用网格的区间；start/dur 单位为八分音符步（与前端一致）。"""

    rootPc: int = Field(ge=0, le=11, description="根音音级 0-11（C=0）")
    type: str = Field(description="和弦类型，如 maj/min/dom7")
    start: float = Field(ge=0, description="起始格（八分音符步）")
    dur: float = Field(gt=0, description="时值（八分音符步）")


class AccompanyIn(BaseModel):
    chords: list[ChordIn] = Field(min_length=1)
    pattern: str = Field(default="arpeggio", description="伴奏音型，见 accompaniment.PATTERNS")
    bpm: float = Field(default=96.0, gt=40, lt=240)


@app.post("/api/accompany", summary="和弦序列 → 服务端生成伴奏（MIDI）")
async def accompany(body: AccompanyIn) -> dict:
    """伴奏模块（课本 4.4.6）：接收和弦序列，编排伴奏音型并生成 MIDI。

    返回伴奏事件（前端直接播放）与 base64 编码的 MIDI 文件（可下载）。
    """
    t0 = time.perf_counter()
    chords = [c.model_dump() for c in body.chords]
    try:
        events, midi_bytes = accompaniment.build_accompaniment(chords, body.pattern, body.bpm)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception:
        logger.exception("伴奏生成失败")
        raise HTTPException(status_code=500, detail="伴奏生成失败，详见服务端日志")

    return {
        "engine": "mido",
        "pattern": body.pattern,
        "bpm": body.bpm,
        "voices": ["chord", "bass"],
        "notes": len(events),
        "events": events,
        "midi_b64": base64.b64encode(midi_bytes).decode("ascii"),
        "elapsed_ms": round((time.perf_counter() - t0) * 1000, 1),
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
