# 旋律的自动伴奏生成 · cipai-website

课题：教材《人工智能程序设计实践》（刘瑞芳 主编，北京邮电大学出版社）第 4 章。
本项目是**前后端分离**形态：前端为纯静态页面（传统 `<script>` 加载、共享全局作用域），后端为 FastAPI 服务（音频分析已真实实现，为后续 AI 音乐生成、诗词词牌服务端化与智能体功能预留接入点）。

---

## 〇、功能全景

**核心链路**：录入旋律 → 调性判定 → HMM 和弦解码 → 风格化伴奏编排 → 实时合成试听 → 导出。

| 模块 | 能力 |
|---|---|
| 录入旋律 | ① 哼唱录音：麦克风采集 → 逐帧音高追踪 → 自动切分音符并量化到节奏网格；录音可**暂存重听**、**存入浏览器本地库（IndexedDB，刷新不丢）**或**导出音频文件**；识别结果旁可一键**跳转到手动编辑**微调。② 导入文件：wav/mp3/m4a/ogg 做音高提取，mid 直接解析音符。③ 手动编辑：钢琴卷帘点格绘入。④ 文字配乐：诗词/歌词/英文 → 依字行腔自动生成旋律（首句动机 + 重复/模进/倒影/变奏，切分/附点/弱起节奏）。 |
| 风格与乐器 | 16 种风格（古典到 8-bit）、每种独立织体音型；和弦/低音两个声部各 6–7 种乐器；A/B 对比试听不换和弦只换音色。 |
| 生成与导出 | 和弦序列可视化（可单个试听）、钢琴卷帘三声部预览、播放/变速；导出 MIDI / WAV / JSON。 |
| 词牌与宫调库 | 100+ 词牌检索（字数/句数/句式匹配）、十七宫调调式情感库、资料库弹窗导航。 |

技术路线一句话：旋律音高序列 → Krumhansl 音级轮廓调性判定 → 隐马尔可夫模型（观测 = 每小节音级加权直方图；状态 = 调内和弦；转移 = 功能和声倾向）→ 维特比全局解码 → 风格化音型编排 → 多振荡器实时合成。

---

## 一、目录结构

```
cipai-website/
├─ start.bat                 一键启动（Windows）：后端 + 前端 + 自动开浏览器
├─ frontend/                 前端（纯静态）
│  ├─ index.html             入口，用 <link> / <script src> 引外部文件
│  ├─ server.js              零依赖静态预览服务器（npm run dev 启动）
│  ├─ package.json           仅声明 dev/start 脚本，无第三方依赖
│  ├─ assets/css/            8 个样式文件
│  ├─ assets/audio/library/  资料库试听音频（含授权信息）
│  └─ src/js/                30 个脚本（00–19 基础链路、20a–20h 文字配乐与资料库、21 绑定、22 API 客户端）
├─ backend/                  后端（FastAPI，分析管线已实现）
│  ├─ app.py                 路由：/api/health、/api/analyze（音频分析）
│  ├─ core/                  与框架无关的纯函数分析管线
│  │  ├─ pitch_detection.py  音频解码 → librosa.pyin 逐帧音高 → 中值滤波 → 音符切分 → 网格量化 → 速度估计
│  │  └─ key_analysis.py     Krumhansl 调性判定 + HMM/维特比和弦序列
│  ├─ services/              未来对接 AI 大模型 / 智能体的服务层（占位）
│  └─ requirements.txt
├─ tools/
│  ├─ build.js               把 frontend/ 合回单文件 → dist/index.html（同时复制试听音频）
│  ├─ test-compose-diversity.js  旋律生成多样性回归测试（前端算法）
│  ├─ test-backend-pipeline.py   后端闭环冒烟测试（合成音频走完整管线 + 真实 HTTP）
│  └─ fetch_library_audio.py 抓取公版 / Creative Commons 音频
└─ dist/                     单文件构建产物与试听音频（不要手改，用 build.js 重新生成）
```

> `dist/index.html` 由 `tools/build.js` 生成；为保留资料库授权录音试听，需与旁边的 `dist/assets/audio/library/` 一起使用。

---

## 二、启动方式

### 一键启动（Windows，推荐）

双击仓库根目录的 `start.bat`：自动探测带 librosa 的 Python → 启动后端（8000）→ 启动前端（7100）→ 3 秒后打开浏览器。停止服务：关掉标题为「伴奏后端」「伴奏前端」的两个最小化窗口即可。

### 手动分别启动

**前端 方式 A（开发/联调）**：

```bash
cd frontend
npm run dev          # 等价于 node server.js，默认 http://127.0.0.1:7100/
npm run dev -- --port 5500   # 换端口
```

**方式 B**：任意静态服务器，如 `python -m http.server 5500`（在 `frontend/` 目录下）。

**方式 C（最快）**：直接双击 `frontend/index.html`。

前端**不依赖后端也能完整运行**——录音识别、和声、伴奏、导出全部在浏览器本地完成。后端是分析能力的服务端副本与未来的 AI 接入通道。

### 后端

```bash
cd backend
pip install -r requirements.txt
uvicorn app:app --reload --host 127.0.0.1 --port 8000
```

- 交互文档：http://127.0.0.1:8000/docs
- 必须在 `backend/` 目录下启动，否则 `from core import ...` 会失败。
- 依赖 librosa / soundfile / scipy（numpy 随 librosa 带入）；`.webm/.m4a` 等格式优先 soundfile 解码，失败自动回退 ffmpeg（装系统 ffmpeg 或 `pip install imageio-ffmpeg`）。

---

## 三、测试与验证（改完代码必跑）

```bash
node tools/test-compose-diversity.js     # 前端旋律生成：多样性 + 终止式回归（无需浏览器）
python tools/test-backend-pipeline.py    # 后端：合成 WAV 走完整管线 + 真实 HTTP 断言（约 20 秒）
node tools/build.js --check              # 构建前校验引用完整性
```

两个测试都是自包含的：自动起服务、自动关闭，不依赖麦克风与外部环境。全部 PASS 再提交。

---

## 四、前后端接口约定

前端 `frontend/src/js/22-api-client.js` 提供（当前供控制台手动调用，主流程尚未接入后端）：

| 全局函数 | 请求 | 说明 |
|---|---|---|
| `apiHealth()` | `GET /api/health` | 健康检查（`engine` 反映真实引擎是否可用） |
| `apiAnalyzeAudio(fileOrBlob, filename?)` | `POST /api/analyze` | 上传音频（multipart 字段名 `audio`） |
| `apiAnalyzeRecording(blob)` | 同上 | 便捷封装，直接送录音 Blob |

`/api/analyze` 返回示例（真实引擎）：

```json
{
  "key": "G", "mode": "major", "confidence": 0.93,
  "scale": [67, 69, 71, 72, 74, 76, 78],
  "tempo_bpm": 129.2, "notes_detected": 11, "duration_sec": 6.34,
  "chords": [
    {"bar": 0, "symbol": "Am", "degree": "ii", "pitches": [57, 60, 64]},
    {"bar": 2, "symbol": "D7", "degree": "V7", "pitches": [62, 66, 69, 72]},
    {"bar": 3, "symbol": "G", "degree": "I", "pitches": [67, 71, 74]}
  ],
  "engine": "librosa", "elapsed_ms": 4887.7, "filename": "recording.webm", "bytes": 102400
}
```

- `chords` 为 HMM/维特比推导的每小节和弦序列（相邻同和弦已合并，含音级构成 `pitches`）；
- 解码失败（缺 ffmpeg / 格式不支持）返回 422；其他分析异常返回 500。
- 后端地址在 `frontend/src/js/22-api-client.js` 顶部的 `API_BASE`（前后端同源部署时改为 `''`）。

### 资料库试听与音频来源

资料库的试听分两条路：

- **实时合成试听（默认）**：词牌、宫调、以及大部分西方曲式的「试听曲式示例」，都由浏览器用 Web Audio 按该形式的曲式骨架现场合成，不需要任何音频文件。
- **授权录音试听**：西方资料库里有三张卡片额外挂了 Wikimedia Commons 的公版 / CC0 录音 —— 奏鸣曲式（莫扎特第 14 号钢琴奏鸣曲）、主题与变奏（巴赫 c 小调帕萨卡利亚变奏）、十二小节布鲁斯（C 布鲁斯音阶）。这些卡片的按钮文案是「试听授权录音」，点了会在卡片内嵌一个带原生控件的播放器，并展示作者、来源页面与许可条款链接。

录音与文字试听互斥：开始播其中一种会自动停掉另一种；关闭详情弹窗也会停止播放。

音频清单在 `frontend/src/js/20h-library-audio.js`（由抓取脚本生成，勿手改字段名）。使用 Python 标准库重新抓取并更新音频和许可清单：

```bash
python tools/fetch_library_audio.py
```

抓取器只接受公版、CC0 或 CC BY 音频，单个文件不超过 8 MB；不符合许可条件或大小限制的结果会跳过。运行需要可访问 Wikimedia Commons 的网络连接。

> 本地预览时请用 `frontend/server.js` 或任意静态服务器，不要直接双击 `index.html`：播放器需要 HTTP Range 请求才能拖动进度，`server.js` 已实现 206 响应。

---

## 五、前端铁律（改代码前必读）

1. **不是 ES module。** `frontend/src/js/` 下的脚本用传统 `<script src>` 加载，共享全局作用域。不要加 `import/export`。
2. **`frontend/index.html` 里的引用顺序不能乱。** `20x` 系列必须在 `21-bind-init.js` 之前；`22-api-client.js` 固定在最后。
   其中 **`20h-library-audio.js` 必须排在 `20g-library-navigation.js` 之前**：20g 初始化时要读 `LIBRARY_AUDIO` 决定按钮文案，顺序反了不会报错，但三张有录音的卡片会被错判成「试听曲式示例」。
3. **每个源文件首行有 `/* >>> file: 路径 */` 标记**（相对 `frontend/` 目录）。`build.js` 内联时靠剥掉这一行还原单文件。新增文件必须带上这个标记，并同步在 `frontend/index.html` 加引用。
4. **顶层 `function` 声明是全局的**，页面上的内联 `onclick` 依赖这一点。
5. 配色不在 CSS 里：改风格颜色去 `src/js/01-palette.js`（JS 注入 CSS 变量），CSS 文件不要写死颜色。
6. 前端代码是纯函数式全局脚本，可以用 `node --check` 做语法检查，也可以像 `tools/test-compose-diversity.js` 那样 `new Function` 加载后无头测试。

---

## 六、构建单文件

```bash
node tools/build.js                # → dist/index.html
node tools/build.js ../handin.html # → 指定路径
node tools/build.js --check        # 只校验，不写文件
```

改了 `frontend/` 下的任何源码都要重新构建 dist，两个入口（源码目录 / 单文件）保持同步。

---

## 七、源码地图（速查）

| 想改什么 | 文件 |
|---|---|
| 调性判定（Krumhansl） | `frontend/src/js/08-key-detect.js` ↔ `backend/core/key_analysis.py`（`estimate_key`） |
| HMM + 维特比（转移矩阵、观测、候选和弦） | `frontend/src/js/09-hmm-viterbi.js` ↔ `backend/core/key_analysis.py`（`chord_sequence`） |
| 16 种伴奏织体 | `frontend/src/js/10-accompaniment-patterns.js` |
| 音色合成 | `frontend/src/js/11-synth.js` |
| 加风格 | `frontend/src/js/03-styles.js` + `01-palette.js` |
| 加乐器 | `frontend/src/js/02-instruments.js` |
| 哼唱录音 / 音高追踪 / 录音保存 / 手动编辑跳转 | `frontend/src/js/18-recording.js`、`17-waveform-pitch.js` |
| 诗词格律 / 词牌库 / 宫调 | `frontend/src/js/20a-text-kb.js`、`20f-cipai-gongdiao.js` |
| 依字行腔旋律生成（动机/节奏） | `frontend/src/js/20e-compose-melody.js` |
| 资料库弹窗、搜索与录音试听 | `frontend/src/js/20g-library-navigation.js`、`20h-library-audio.js` |
| 后端音高管线 | `backend/core/pitch_detection.py` |
| 后端接口客户端 | `frontend/src/js/22-api-client.js` |

前后端同名的算法刻意保持同一套口径（TRANS 转移表、Krumhansl 轮廓、emission 打分），改一边要同步考虑另一边。

---

## 八、协作约定

- 提交信息格式：`feat: 简述` / `fix: 简述`，一句话说清做了什么。
- **推送前先 `git fetch` 看一眼**（或 `git pull --rebase`），组员会同时往 `main` 推，避免非快进拒绝。
- `__pycache__/`、`*.pyc` 已被 git 忽略，不要强行 `git add` 它们。
- dist 只通过 `tools/build.js` 生成，不要手工编辑。

---

## 九、已知边界 / 待办

- **教材 4.4 的 B/S 闭环尚未完全打通**：后端分析管线已完整（含 `chords` 和弦序列），`/api/analyze` 返回完整分析；但前端主流程（`22-api-client.js` 之外）尚未调用后端。接通后建议做「本地引擎 vs 服务端引擎」A/B 对比作为展示亮点。
- `app.py` 中 `NotImplementedError` 回落 mock 的分支已是死代码（core 已实现），待清理；`requirements.txt` 里的 `pypinyin` 为文本配乐服务端化预留，暂未使用。
- 声调表覆盖 1166 字，未收录字按「平」中性处理；英文重音判定为启发式。
- 和弦推导每小节一个和弦，未做小节内切分。
- `services/generation_service.py`（AI 伴奏生成）仍为占位待实现。
