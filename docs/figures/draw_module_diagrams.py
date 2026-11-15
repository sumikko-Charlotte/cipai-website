# -*- coding: utf-8 -*-
"""生成《软件工程详细设计》第 3 章各模块设计图（5 张）。"""
from PIL import Image, ImageDraw, ImageFont
import math

NAVY = (35, 63, 95)
TEXT = (33, 41, 54)
SUB = (92, 106, 122)
BLUE_L, BLUE_B = (232, 240, 249), (170, 195, 222)
GREEN_L, GREEN_B = (233, 244, 236), (166, 201, 177)
ORANGE_L, ORANGE_B = (253, 244, 230), (225, 197, 148)
PURPLE_L, PURPLE_B = (243, 238, 248), (196, 178, 213)
GRAY_L, GRAY_B = (246, 248, 250), (203, 212, 222)

F_REG = "C:/Windows/Fonts/msyh.ttc"
F_BOLD = "C:/Windows/Fonts/msyhbd.ttc"
OUT = "C:/Users/sumik/Desktop/cipai-website/docs/figures/"


def f(size, bold=False):
    return ImageFont.truetype(F_BOLD if bold else F_REG, size)


class Diagram:
    def __init__(self, w, h, title, subtitle=None):
        self.w, self.h = w, h
        self.img = Image.new("RGB", (w, h), "white")
        self.d = ImageDraw.Draw(self.img)
        self.d.text((40, 22), title, font=f(26, True), fill=NAVY)
        if subtitle:
            tw = self.d.textlength(title, font=f(26, True))
            self.d.text((40 + tw + 24, 32), subtitle, font=f(15), fill=SUB)

    def text_center(self, x, y, w, s, font, fill=TEXT):
        tw = self.d.textlength(s, font=font)
        self.d.text((x + (w - tw) / 2, y), s, font=font, fill=fill)

    def panel(self, x, y, w, h, fill, border, label=None, radius=12, width=2):
        self.d.rounded_rectangle([x, y, x + w, y + h], radius=radius, fill=fill, outline=border, width=width)
        if label:
            self.d.text((x + 16, y + 10), label, font=f(16, True), fill=NAVY)

    def box(self, x, y, w, h, title, lines=(), title_size=15, line_size=12, fill="white", border=BLUE_B):
        d = self.d
        d.rounded_rectangle([x, y, x + w, y + h], radius=9, fill=fill, outline=border, width=1)
        total = title_size + 8 + len(lines) * (line_size + 6)
        ty = y + (h - total) / 2 + 2
        self.text_center(x, ty, w, title, f(title_size, True), NAVY)
        ly = ty + title_size + 8
        for ln in lines:
            self.text_center(x, ly, w, ln, f(line_size), SUB)
            ly += line_size + 6

    def arrow(self, x1, y1, x2, y2, color=(120, 138, 158), width=2, both=False, label=None):
        d = self.d
        d.line([x1, y1, x2, y2], fill=color, width=width)
        ang = math.atan2(y2 - y1, x2 - y1 if False else x2 - x1)
        for (px, py, a) in ([(x2, y2, ang)] + ([(x1, y1, ang + math.pi)] if both else [])):
            L, s = 11, 5.5
            d.polygon([(px, py),
                       (px - L * math.cos(a) + s * math.sin(a), py - L * math.sin(a) - s * math.cos(a)),
                       (px - L * math.cos(a) - s * math.sin(a), py - L * math.sin(a) + s * math.cos(a))],
                      fill=color)
        if label:
            mx, my = (x1 + x2) / 2, (y1 + y2) / 2
            d.text((mx + 6, my - 16), label, font=f(11), fill=SUB)

    def save(self, path):
        self.img.save(path, quality=95)
        print("saved", path)


# ---------------- 图 3-2 旋律模块 ----------------
g = Diagram(1560, 760, "图 3-2  旋律模块设计图", "（grid 卡片 · 07-piano-roll / 16-import / 17-waveform-pitch / 18-recording）")
g.panel(40, 80, 470, 640, GRAY_L, GRAY_B, "输入来源")
g.box(70, 140, 410, 110, "钢琴卷帘手工编辑", ["点击/拖动 16×15 网格", "行 = MIDI 音高（21~108）", "列 = 节拍步（≤208）"])
g.box(70, 280, 410, 100, "预设样例 PRESETS", ["一键填充旋律"])
g.box(70, 410, 410, 120, "哼唱录音 MediaRecorder", ["麦克风 → webm/ogg Blob", "有效性：解码失败即放弃"])
g.box(70, 560, 410, 120, "文件导入（拖拽/选择）", ["wav / mp3 / midi", "extractNotes / parseMidi"])
g.panel(590, 80, 420, 640, BLUE_L, BLUE_B, "处理核心")
g.box(620, 140, 360, 130, "quickPitch（前端引擎）", ["逐帧自相关音高检测", "17-waveform-pitch.js"])
g.box(620, 300, 360, 130, "服务端引擎（可选）", ["serverAnalyzeAsync", "POST /api/analyze", "pyin + 量化（20s 超时）"])
g.box(620, 460, 360, 120, "音符折算", ["applyDetectedMelody", "loadMelodyFromGrid"])
g.panel(1090, 80, 430, 640, GREEN_L, GREEN_B, "状态与输出")
g.box(1120, 140, 370, 130, "state.grid / state.melody", ["音符序列 {pitch,start,dur}"])
g.box(1120, 300, 370, 120, "钢琴卷帘重绘 syncRoll", ["波形/音高曲线 waveCanvas"])
g.box(1120, 460, 370, 120, "IndexedDB 录音库", ["hum-recordings / recs", "资料库回放"])
for y in (195, 355, 515):
    g.arrow(480, y, 590, y, label=None)
g.arrow(990, 365, 1090, 365)
g.arrow(1305, 270, 1305, 300)
g.arrow(1305, 420, 1305, 460)
g.d.text((480, 690), "录音与合成互斥：资料库录音播放时停止合成预览（20g-library-navigation.js）", font=f(13), fill=SUB)
g.save(OUT + "module-melody.png")

# ---------------- 图 3-3 和弦模块 ----------------
g = Diagram(1560, 780, "图 3-3  和弦模块设计图（HMM + 维特比）", "（08-key-detect.js → 09-hmm-viterbi.js）")
g.panel(40, 80, 340, 300, GRAY_L, GRAY_B, "输入")
g.box(70, 140, 280, 100, "state.melody", ["音符 {midi, start, dur}"])
g.box(70, 260, 280, 90, "STYLES[state.theme]", ["bias 和声倾向 / sev 七和弦概率"])
g.panel(440, 80, 1080, 300, BLUE_L, BLUE_B, "调性判定 08-key-detect.js")
g.box(470, 140, 300, 110, "pitchHistogram", ["按时长加权折叠 12 音级", "归一化直方图"])
g.box(830, 140, 300, 110, "Krumhansl 轮廓", ["KRUMA_MAJ / KRUMA_MIN", "24 个移调候选"])
g.box(1190, 140, 300, 110, "correlate / detectKey", ["皮尔逊相关取最大", "→ key {root, mode}"])
g.arrow(350, 195, 440, 195)
g.arrow(770, 195, 830, 195)
g.arrow(1130, 195, 1190, 195)
g.panel(40, 420, 1480, 250, GREEN_L, GREEN_B, "维特比解码 09-hmm-viterbi.js（每 4 步 = 1 小节）")
g.box(70, 480, 300, 140, "barHistogram", ["小节内音级直方图", "作为观测序列"])
g.box(430, 480, 330, 140, "候选状态 cands", ["DIATONIC 调内 7 和弦", "sev 概率升级 maj7/min7/dom7"])
g.box(820, 480, 340, 140, "打分", ["发射：构成音 +2.0 根音 +0.8", "调内非和弦 −0.45 调外 −1.3", "转移 TRANS ×2.2 + bias ×1.4"])
g.box(1220, 480, 280, 140, "DP + 回溯", ["dp / bp 表", "全局最优路径"])
g.arrow(370, 550, 430, 550)
g.arrow(760, 550, 820, 550)
g.arrow(1160, 550, 1220, 550)
g.panel(40, 700, 1480, 60, ORANGE_L, ORANGE_B)
g.d.text((70, 716), "输出 state.chords：和弦对象数组 {rootPc, type, roman, start, dur}  →  13-result-render.js 渲染和弦卡片 + previewChord 试听", font=f(14, True), fill=TEXT)
g.save(OUT + "module-chord.png")

# ---------------- 图 3-4 伴奏模块 ----------------
g = Diagram(1560, 780, "图 3-4  伴奏模块设计图", "（10-accompaniment-patterns.js → 11-synth / 12-playback / 15-export）")
g.panel(40, 80, 360, 640, GRAY_L, GRAY_B, "输入")
g.box(70, 140, 300, 110, "state.melody", ["旋律声部原样并入"])
g.box(70, 280, 300, 110, "state.chords", ["rootPc / type / start / dur"])
g.box(70, 420, 300, 110, "STYLES[state.theme].pat", ["15 种织体标识"])
g.box(70, 560, 300, 120, "乐器选择", ["INSTRUMENTS", "BASS_INSTRUMENTS", "（与风格解耦）"])
g.panel(470, 80, 560, 640, BLUE_L, BLUE_B, "buildAccompaniment() 编排")
g.box(500, 140, 500, 120, "低音声部 bass", ["bp = base − 12", "时长 ≥8 步 → 中点补一记"])
g.box(500, 290, 500, 240, "和弦声部 chord（switch st.pat）", ["arpeggio 琶音 · ballad 抒情 · walking 行走贝斯", "counterpoint 对位 等 15 种分支", "和弦构成音 = CHORD_TONES 音程叠加"], 15, 12.5)
g.box(500, 560, 500, 110, "统一事件流 evs", ["{pitch, start, dur, voice}"])
g.arrow(400, 400, 470, 400)
g.arrow(760, 530, 760, 560)
g.panel(1100, 80, 420, 640, GREEN_L, GREEN_B, "消费与输出")
g.box(1130, 140, 360, 120, "实时播放", ["11-synth playEvent 合成", "12-playback tick / drawRoll"])
g.box(1130, 290, 360, 110, "A/B 对比 abCompare", ["两风格自动接续试听"])
g.box(1130, 430, 360, 120, "导出", ["buildMidiBlob → MIDI", "encodeWav → WAV", "exportJson → JSON"])
g.arrow(1030, 200, 1100, 200)
g.arrow(1030, 350, 1100, 350)
g.arrow(1030, 490, 1100, 490)
g.d.text((470, 740), "播放循环由 requestAnimationFrame 驱动，drawRoll 同步高亮播放列", font=f(13), fill=SUB)
g.save(OUT + "module-accompaniment.png")

# ---------------- 图 3-5 文字配乐与资料库模块 ----------------
g = Diagram(1560, 760, "图 3-5  文字配乐与资料库模块设计图", "（20a~20h 流水线 + 资料库三栏）")
g.panel(40, 80, 900, 420, BLUE_L, BLUE_B, "文字谱曲流水线（三种模式：词牌 / 中文歌词 / 英文歌词）")
g.box(70, 140, 240, 130, "20c 文本解析", ["stripPunct / splitClauses", "extractTitle / splitSections", "syllEn / stressEn"])
g.box(350, 140, 240, 130, "20b 声韵标注", ["TONE_MAP 平仄", "RHYME_MAP 韵部", "toneOf / isPing / isZe"])
g.box(630, 140, 280, 130, "20d 格律分析", ["matchCiPai（51 条词牌）", "rhymeGroupsOf 押韵", "analyzeCi/LyricZh/EnMode"])
g.box(200, 330, 320, 130, "20e 自动谱曲", ["scalePoolOf 选音池", "motifPhrase 动机 + 模进", "rhythmFor 平仄定节奏"])
g.box(580, 330, 300, 130, "写入编辑器", ["state.grid 填充", "→ 进入和弦/伴奏流程"])
g.arrow(310, 205, 350, 205)
g.arrow(590, 205, 630, 205)
g.arrow(770, 270, 520, 330)
g.arrow(520, 460, 660, 460)
g.panel(990, 80, 530, 420, GREEN_L, GREEN_B, "资料库（20f / 20g / 20h）")
g.box(1020, 140, 220, 120, "词牌库", ["renderCiPaiLib", "previewCiPai / applyCiPai"])
g.box(1260, 140, 230, 120, "宫调库（84 组合）", ["renderGongLib", "previewGong"])
g.box(1020, 290, 220, 120, "示例音频", ["LIBRARY_AUDIO", "playLibraryRecording"])
g.box(1260, 290, 230, 120, "宫调详情", ["showGongDetail", "曲式说明"])
g.arrow(1130, 260, 1130, 290)
g.arrow(1370, 260, 1370, 290)
g.panel(40, 540, 1480, 160, ORANGE_L, ORANGE_B, "知识库数据（20a / 20b 内置常量，只读）")
g.box(70, 590, 330, 90, "CI_PAI 51 条", ["句式 / 字数 / 平仄谱"])
g.box(440, 590, 330, 90, "GONG_DIAO 84 组合", ["五声调式 × 宫音系统"])
g.box(810, 590, 330, 90, "TONE_SRC / RHYME_SRC", ["汉字 → 声调 / 韵部"])
g.box(1180, 590, 310, 90, "SCALES / MODES5", ["中西音阶 / 五声调式"])
g.save(OUT + "module-text.png")

# ---------------- 图 3-6 服务端分析模块 ----------------
g = Diagram(1560, 760, "图 3-6  服务端分析模块设计图（可选增强）", "（FastAPI app.py → core/ 纯函数管线）")
g.panel(40, 80, 380, 300, GRAY_L, GRAY_B, "入口（app.py 路由）")
g.box(70, 140, 320, 100, "POST /api/analyze", ["multipart 音频文件"])
g.box(70, 260, 320, 90, "POST /api/accompany", ["chords + pattern + bpm"])
g.panel(470, 80, 480, 640, BLUE_L, BLUE_B, "core/pitch_detection.py")
g.box(500, 140, 420, 110, "_load_audio 解码", ["soundfile / ffmpeg 兜底"])
g.box(500, 280, 420, 120, "extract_pitch_series", ["librosa pyin 逐帧", "fmin=65 · fmax=1046", "_median_filter 平滑"])
g.box(500, 430, 420, 120, "segment_notes → quantize_to_grid", ["连续同类帧聚段", "16 分音符网格量化", "estimate_tempo_from_notes"])
g.panel(1000, 80, 520, 380, GREEN_L, GREEN_B, "core/key_analysis.py")
g.box(1030, 140, 220, 120, "estimate_key", ["chroma 直方图", "Krumhansl 相关"])
g.box(1280, 140, 210, 120, "load_trans_matrix", ["trans_matrix.json", "trained / builtin"])
g.box(1030, 290, 460, 120, "chord_sequence", ["发射与前端同构", "转移用统计矩阵（对数分钳位 −8）"])
g.arrow(420, 195, 1000, 380)
g.arrow(950, 300, 1000, 300)
g.panel(1000, 500, 520, 220, PURPLE_L, PURPLE_B, "输出与其他")
g.box(1030, 550, 220, 140, "JSON 响应", ["engine / key / tempo", "notes / chords", "matrix_source"])
g.box(1280, 550, 210, 140, "其他", ["accompaniment.py", "→ mido MIDI", "/validation 图表页"])
g.arrow(1250, 620, 1280, 620)
g.d.text((40, 740), "matrix_source=trained：统计矩阵（corpus 语料经 tools/train_chord_matrix.py 训练）；缺失/非法时自动回落内置 TRANS 并标注 builtin", font=f(13), fill=SUB)
g.save(OUT + "module-server.png")
