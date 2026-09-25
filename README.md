# 旋律的自动伴奏生成 · cipai-website

课题：教材《人工智能程序设计实践》（刘瑞芳 主编，北京邮电大学出版社）第 4 章。
本项目是**前后端分离**形态：前端为纯静态页面（传统 `<script>` 加载、共享全局作用域），后端为 FastAPI 骨架，为后续 AI 音乐生成、诗词词牌服务端化与智能体功能预留接入点。

---

## 一、目录结构

```
cipai-website/
├─ frontend/                 前端（纯静态，双击即可跑）
│  ├─ index.html             入口，用 <link> / <script src> 引外部文件
│  ├─ assets/css/            7 个样式文件
│  └─ src/js/                28 个脚本文件（00–21 原有 + 22 API 客户端）
├─ backend/                  后端（FastAPI 骨架）
│  ├─ app.py                 路由：/api/health、/api/analyze（音频分析）
│  ├─ core/                  与框架无关的音频分析纯函数（待实现）
│  │  ├─ pitch_detection.py  音频 → 逐帧音高 → 音符段 → 节奏网格
│  │  └─ key_analysis.py     调性判定 + HMM/维特比和弦序列
│  ├─ services/              未来对接 AI 大模型 / 智能体的服务层（占位）
│  └─ requirements.txt
├─ tools/
│  └─ build.js               把 frontend/ 合回单文件 → dist/index.html
└─ dist/                     构建产物目录
```

> 旧版单文件交付物仍可用：`dist/index.html`（由 `tools/build.js` 生成）。

---

## 二、启动方式

### 前端

**方式 A（最快）**：直接双击 `frontend/index.html`。

**方式 B（推荐，配合后端联调）**：

```bash
cd frontend
python -m http.server 5500
# 浏览器打开 http://127.0.0.1:5500
```

前端**不依赖后端也能完整运行**——录音识别、和声、伴奏、导出全部在浏览器本地完成。后端只是给未来的服务端分析/AI 功能预留通道。

### 后端

```bash
cd backend
pip install -r requirements.txt
uvicorn app:app --reload --host 127.0.0.1 --port 8000
```

- 交互文档：http://127.0.0.1:8000/docs
- 必须在 `backend/` 目录下启动，否则 `from core import ...` 会失败。
- `python-multipart` 是 FastAPI 处理文件上传的必需依赖，已写入 requirements.txt。

---

## 三、前后端接口约定

前端 `frontend/src/js/22-api-client.js` 提供：

| 全局函数 | 请求 | 说明 |
|---|---|---|
| `apiHealth()` | `GET /api/health` | 健康检查 |
| `apiAnalyzeAudio(fileOrBlob, filename?)` | `POST /api/analyze` | 上传音频（multipart 字段名 `audio`） |
| `apiAnalyzeRecording(blob)` | 同上 | 便捷封装，直接送录音 Blob |

`/api/analyze` 返回示例（当前为 mock，`engine: "mock"`）：

```json
{
  "key": "G", "mode": "major", "confidence": 0.95,
  "tempo_bpm": 96.0, "notes_detected": 32, "duration_sec": 12.8,
  "engine": "mock", "elapsed_ms": 0.4, "filename": "recording.webm", "bytes": 102400
}
```

**接入方式**：`core/pitch_detection.py` 与 `core/key_analysis.py` 的骨架函数实现后，`app.py` 里预留的调用点会自动生效，返回值自动切到 `engine: "librosa"`，**不需要改 `app.py` 和前端**。

后端地址改在哪：`frontend/src/js/22-api-client.js` 顶部的 `API_BASE`（前后端同源部署时改为 `''`）。

---

## 四、前端铁律（改代码前必读）

1. **不是 ES module。** `frontend/src/js/` 下的脚本用传统 `<script src>` 加载，共享全局作用域。不要加 `import/export`。
2. **`frontend/index.html` 里的引用顺序不能乱。** `20x` 系列（文字配乐）必须在 `21-bind-init.js` 之前；`22-api-client.js` 固定在最后。
3. **每个源文件首行有 `/* >>> file: 路径 */` 标记**（相对 `frontend/` 目录）。`build.js` 内联时靠剥掉这一行还原单文件。新增文件必须带上这个标记，并同步在 `frontend/index.html` 加引用。
4. **顶层 `function` 声明是全局的**，页面上有内联 `onclick="applyCiPai(...)"` / `onclick="previewGong(...)"` 依赖这一点。
5. 配色不在 CSS 里：改风格颜色去 `src/js/01-palette.js`（JS 注入 CSS 变量），CSS 文件不要写死颜色。

## 五、构建单文件

```bash
node tools/build.js                # → dist/index.html
node tools/build.js ../handin.html # → 指定路径
node tools/build.js --check        # 只校验，不写文件
```

---

## 六、源码地图（速查）

| 想改什么 | 文件 |
|---|---|
| 调性判定（Krumhansl） | `src/js/08-key-detect.js` |
| HMM + 维特比（转移矩阵、观测、候选和弦） | `src/js/09-hmm-viterbi.js` |
| 16 种伴奏织体 | `src/js/10-accompaniment-patterns.js` |
| 音色合成 | `src/js/11-synth.js` |
| 加风格 | `src/js/03-styles.js` + `01-palette.js` |
| 加乐器 | `src/js/02-instruments.js` |
| 诗词格律 / 词牌库 | `src/js/20a-text-kb.js`、`20f-cipai-gongdiao.js` |
| 依字行腔旋律生成 | `src/js/20e-compose-melody.js` |
| 后端接口客户端 | `src/js/22-api-client.js` |

完整说明见 git 历史或旧版 README（本项目重构前的版本）。

---

## 七、已知边界 / 待办

- 后端 `/api/analyze` 目前返回 mock（core 未实现）；实现时按 core/ 里各 docstring 的提示用 librosa/pyin 落地。
- 教材 4.4 要求的"前端调后端出和弦→返回渲染"闭环尚未打通：当前前端自己的 HMM 已经全流程可用，后端实现后建议做"本地引擎 vs 服务端引擎"的 A/B 对比作为展示亮点。
- 声调表覆盖 1166 字，未收录字按「平」中性处理；英文重音判定为启发式。
- 和弦推导目前每小节一个和弦，未做小节内切分。
