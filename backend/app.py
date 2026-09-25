"""旋律的自动伴奏生成 · 后端服务（FastAPI 骨架）。

启动（必须在 backend/ 目录下执行，保证 `from core import ...` 可用）：

    cd backend
    pip install -r requirements.txt
    uvicorn app:app --reload --host 127.0.0.1 --port 8000

接口：
    GET  /              服务信息
    GET  /api/health    健康检查
    POST /api/analyze   上传音频，返回调性/速度等分析结果

当前 core/ 下的算法函数尚未实现（NotImplementedError），
/api/analyze 固定返回 mock 数据；core 实现后无需修改本文件，
返回中的 engine 字段会自动从 "mock" 变成 "librosa"。

交互文档：启动后浏览器打开 http://127.0.0.1:8000/docs
"""
from __future__ import annotations

import logging
import time

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from core import key_analysis, pitch_detection

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


@app.get("/api/health")
async def health() -> dict:
    return {
        "status": "ok",
        "version": app.version,
        "engine": "mock",  # core 实现后可在 analyze 里改为真实引擎名
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
        engine = "librosa"
    except NotImplementedError as exc:
        logger.info("core 尚未实现，返回 mock 数据：%s", exc)
    except Exception:
        logger.exception("音频分析失败")
        raise HTTPException(status_code=500, detail="音频分析失败，详见服务端日志")

    result.update(
        {
            "engine": engine,
            "elapsed_ms": round((time.perf_counter() - t0) * 1000, 1),
            "filename": audio.filename,
            "bytes": len(data),
        }
    )
    return result


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
