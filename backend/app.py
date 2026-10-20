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
import json
import logging
import time

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field

from core import accompaniment, key_analysis, pitch_detection, validation_charts

logger = logging.getLogger("accompaniment")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

app = FastAPI(
    title="旋律的自动伴奏生成 API",
    version="0.1.0",
    description="课程项目《人工智能程序设计实践》第 4 章 · 后端音频分析与未来 AI 生成服务"
    "<br>数据验证页（课本 4.3.2，实时渲染）：<a href=\"/validation\">/validation</a>",
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
    return {"service": "accompaniment-api", "version": app.version, "docs": "/docs",
            "validation": "/validation"}


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


_VALIDATION_HTML = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>课本 4.3.2 数据验证</title>
<style>
body{font-family:sans-serif;max-width:1100px;margin:24px auto;padding:0 16px;color:#222}
h1{font-size:22px} h2{font-size:17px;border-bottom:1px solid #ddd;padding-bottom:4px}
.note{background:#f6f8fa;border:1px solid #ddd;border-radius:6px;padding:10px 14px}
img{max-width:100%;border:1px solid #ccc;margin:8px 0}
code{background:#eee;padding:1px 5px;border-radius:3px}
</style>
</head>
<body>
<h1>课本 4.3.2 数据验证 · 和弦矩阵可信度</h1>
<p class="note">本页由后端实时渲染：每次打开都重新读取
<code>backend/core/data/trans_matrix.json</code>（训练脚本重跑后刷新即生效，无需重启）。
当前和弦转移矩阵来源：<b>__SOURCE__</b>（trained = 语料统计矩阵，builtin = 内置 TRANS 表）。
</p>
<h2>1. 转移矩阵「训练 vs 手写」对比热力图</h2>
__TRANS_SECTION__
<h2>2. 和弦-单音分布（课本图 4-7 同款，红色为和弦构成音）</h2>
__EMIS_SECTION__
<h2>3. 向 I 和弦过渡概率（课本图 4-8 同款，大调 I 应与 V 接近或最高）</h2>
__TO_I_SECTION__
<h2>4. 从 I 和弦过渡到各和弦概率（课本图 4-9 同款）</h2>
__FROM_I_SECTION__
<h2>5. 验证结论</h2>
<p class="note">
1）发射矩阵中<b>和弦构成音（红色）的概率普遍最高</b>，说明观测模型能正确识别和弦音；<br>
2）转移矩阵中<b>V → I（五级到一级）概率最高</b>，符合功能和声解决的乐理理论（大调中亦与 V7 → I 终止式一致）；<br>
3）统计口径：__CORPUS__（OpenEWLD 公有领域 leadsheet 语料，经 to_C 归一化后统计，加 1 拉普拉斯平滑）。
</p>
</body></html>
"""

_TRANS_IMG = '<img alt="转移矩阵对比热力图" src="data:image/png;base64,%s">'
_TRANS_FALLBACK = ('<p class="note">热力图不可用：matplotlib 未安装，或 trans_matrix.json 缺失/格式非法。'
                   '请先运行 <code>python tools/train_chord_matrix.py</code> 生成统计矩阵。</p>')
_EMIS_IMG = '<img alt="和弦-单音分布柱状图" src="data:image/png;base64,%s">'
_EMIS_FALLBACK = ('<p class="note">和弦-单音分布图不可用：matplotlib 未安装，或 trans_matrix.json 缺少 '
                  'emission 字段。请重新运行 <code>python tools/train_chord_matrix.py</code>。</p>')
_I_IMG = '<img alt="%s" src="data:image/png;base64,%s">'
_I_FALLBACK = '<p class="note">过渡概率柱状图不可用：matplotlib 未安装，或 trans_matrix.json 缺失/非法。</p>'


def _read_matrix_meta() -> dict | None:
    """实时读 trans_matrix.json 的 meta（语料数量等），缺失/非法返回 None。"""
    try:
        with open(key_analysis._MATRIX_PATH, encoding="utf-8") as f:
            data = json.load(f)
        meta = data.get("meta")
        files = meta.get("files_parsed")
        return {"files": files} if isinstance(meta, dict) and isinstance(files, int) else None
    except (OSError, ValueError, AttributeError):
        return None


@app.get("/validation", response_class=HTMLResponse, summary="课本 4.3.2 数据验证页（实时渲染）")
async def validation() -> str:
    """实时渲染验证图表（热力图/分布图/I 过渡柱状图），内嵌 base64 PNG。"""
    matrix = _read_matrix_meta()
    trans_b64 = validation_charts.png_to_b64(validation_charts.transition_chart_png())
    emis_b64 = validation_charts.png_to_b64(validation_charts.emission_chart_png())
    to_i_b64 = validation_charts.png_to_b64(validation_charts.to_I_chart_png())
    from_i_b64 = validation_charts.png_to_b64(validation_charts.from_I_chart_png())
    corpus_desc = "基于 %s 首真实乐谱统计" % matrix["files"] if matrix else "语料信息不可用"
    return (_VALIDATION_HTML
            .replace("__SOURCE__", key_analysis.matrix_source())
            .replace("__CORPUS__", corpus_desc)
            .replace("__TRANS_SECTION__", _TRANS_IMG % trans_b64 if trans_b64 else _TRANS_FALLBACK)
            .replace("__EMIS_SECTION__", _EMIS_IMG % emis_b64 if emis_b64 else _EMIS_FALLBACK)
            .replace("__TO_I_SECTION__", _I_IMG % ("向 I 和弦过渡概率", to_i_b64) if to_i_b64 else _I_FALLBACK)
            .replace("__FROM_I_SECTION__", _I_IMG % ("从 I 和弦过渡概率", from_i_b64) if from_i_b64 else _I_FALLBACK))


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
