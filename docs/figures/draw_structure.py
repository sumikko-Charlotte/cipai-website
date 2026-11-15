# -*- coding: utf-8 -*-
"""生成《软件工程概要设计》2.1 节的系统总体结构图。"""
from PIL import Image, ImageDraw, ImageFont

W, H = 1600, 1000
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


def f(size, bold=False):
    return ImageFont.truetype(F_BOLD if bold else F_REG, size)


img = Image.new("RGB", (W, H), "white")
d = ImageDraw.Draw(img)


def text_center(x, y, w, s, font, fill=TEXT):
    tw = d.textlength(s, font=font)
    d.text((x + (w - tw) / 2, y), s, font=font, fill=fill)


def panel(x, y, w, h, fill, border, radius=12, width=2):
    d.rounded_rectangle([x, y, x + w, y + h], radius=radius, fill=fill, outline=border, width=width)


def box(x, y, w, h, title, lines, title_size=15, line_size=12, fill="white", border=BLUE_B):
    d.rounded_rectangle([x, y, x + w, y + h], radius=9, fill=fill, outline=border, width=1)
    total = title_size + 10 + len(lines) * (line_size + 6)
    ty = y + (h - total) / 2 + 2
    text_center(x, ty, w, title, f(title_size, True), NAVY)
    ly = ty + title_size + 10
    for ln in lines:
        text_center(x, ly, w, ln, f(line_size), SUB)
        ly += line_size + 6


def arrow(x1, y1, x2, y2, color=(120, 138, 158), width=2, both=False):
    d.line([x1, y1, x2, y2], fill=color, width=width)
    import math
    ang = math.atan2(y2 - y1, x2 - x1)
    for (px, py, a) in ([(x2, y2, ang)] + ([(x1, y1, ang + math.pi)] if both else [])):
        L, s = 11, 5.5
        d.polygon([(px, py),
                   (px - L * math.cos(a) + s * math.sin(a), py - L * math.sin(a) - s * math.cos(a)),
                   (px - L * math.cos(a) - s * math.sin(a), py - L * math.sin(a) + s * math.cos(a))],
                  fill=color)


# 标题
d.text((40, 24), "图 2-1  系统总体结构", font=f(26, True), fill=NAVY)
d.text((300, 34), "（浏览器端 B/S 前端 + FastAPI 服务端，双实现同源算法）", font=f(15), fill=SUB)

# ---------------- 浏览器端 ----------------
panel(40, 88, 950, 742, (250, 252, 255), NAVY, 14, 2)
d.text((62, 102), "浏览器端  frontend/", font=f(21, True), fill=NAVY)
d.text((64, 134), "纯静态 · 零依赖 · 可离线运行", font=f(13), fill=SUB)

# 表示层
panel(62, 168, 906, 158, BLUE_L, BLUE_B, 10, 1)
d.text((78, 178), "表示层 · 交互与呈现", font=f(16, True), fill=NAVY)
box(78, 208, 390, 100, "旋律录入", ["哼唱录音 · 文件导入", "手动编辑 · 文字配乐"], 15, 12)
box(482, 208, 230, 100, "结果与试听", ["和弦序列 · 钢琴卷帘", "播放/变速 · A-B 对比"], 15, 12)
box(726, 208, 226, 100, "资料库", ["47 词牌 · 17 宫调", "12 曲式 · 授权录音"], 15, 12)

arrow(515, 326, 515, 344)

# 业务层
panel(62, 344, 906, 200, GREEN_L, GREEN_B, 10, 1)
d.text((78, 354), "业务层 · 音乐算法（前后端同源口径）", font=f(16, True), fill=NAVY)
widths = 166
xs = [78, 78 + 178, 78 + 356, 78 + 534, 78 + 712]
titles = ["音高提取", "调性判定", "和弦推导", "伴奏编排", "合成与导出"]
lines = [["分帧自相关", "中值滤波去毛刺", "切分 + 网格量化"],
         ["Krumhansl", "音级轮廓", "24 候选取最大"],
         ["HMM 观测/转移", "维特比全局解码", "每小节一个和弦"],
         ["15 种音型", "和弦 + 低音声部", "风格先验加权"],
         ["Web Audio 合成", "MIDI / WAV", "JSON 事件流"]]
for x, t, ls in zip(xs, titles, lines):
    box(x, 388, widths, 142, t, ls, 15, 11.5)

arrow(515, 544, 515, 562)

# 数据层
panel(62, 562, 906, 152, ORANGE_L, ORANGE_B, 10, 1)
d.text((78, 572), "数据层 · 浏览器本地", font=f(16, True), fill=NAVY)
dw = 210
for i, (t, ls) in enumerate([
        ("全局 state", ["旋律 / 调性 / 和弦", "播放事件 / 引擎标记"]),
        ("IndexedDB", ["hum-recordings", "recs（录音 Blob）"]),
        ("静态知识库", ["词牌 · 宫调 · 声调", "韵部 · 曲式说明"]),
        ("音频资源", ["assets/audio/library", "9.4 MB 授权录音"])]):
    box(78 + i * (dw + 12), 602, dw, 94, t, ls, 14.5, 11.5)

d.text((78, 744), "核心功能全部在前端完成：服务端不可达时自动降级为本地引擎，功能不中断。",
       font=f(13), fill=SUB)
d.text((78, 770), "前端 30 个脚本共享全局作用域，按 index.html 中的固定顺序加载。",
       font=f(13), fill=SUB)

# ---------------- 服务端 ----------------
panel(1050, 168, 510, 662, PURPLE_L, PURPLE_B, 14, 2)
d.text((1066, 182), "服务端  backend/", font=f(21, True), fill=NAVY)
d.text((1068, 214), "FastAPI · 无状态 · 纯函数管线", font=f(13), fill=SUB)

panel(1066, 248, 478, 150, "white", PURPLE_B, 10, 1)
d.text((1082, 262), "REST 接口", font=f(16, True), fill=NAVY)
for i, s in enumerate(["GET    /                 根信息", "GET    /api/health       引擎可用性", "POST   /api/analyze      音频 → 调性/和弦", "GET    /validation       数据验证页(课本4.3.2)", "POST   /api/accompany    和弦 → 伴奏 MIDI"]):
    d.text((1082, 288 + i * 22), s, font=f(11.5), fill=TEXT)

panel(1066, 416, 478, 196, "white", PURPLE_B, 10, 1)
d.text((1082, 430), "core/ 纯函数分析管线", font=f(16, True), fill=NAVY)
for i, (a, b) in enumerate([("pitch_detection.py", "pyin 音高 → 音符 → 量化"),
                            ("key_analysis.py", "Krumhansl + HMM/维特比"),
                            ("accompaniment.py", "15 音型 → mido MIDI")]):
    d.text((1082, 462 + i * 46), a, font=f(12.5, True), fill=TEXT)
    d.text((1082, 480 + i * 46), b, font=f(11.5), fill=SUB)

panel(1066, 630, 478, 110, "white", PURPLE_B, 10, 1)
d.text((1082, 644), "运行依赖", font=f(14, True), fill=NAVY)
d.text((1082, 672), "librosa · soundfile · numpy", font=f(11.5), fill=SUB)
d.text((1082, 696), "mido · imageio-ffmpeg · scipy", font=f(11.5), fill=SUB)

# 前后端连线
arrow(990, 444, 1050, 444, (120, 138, 158), 2, True)
d.text((995, 414), "HTTP", font=f(11), fill=SUB)
d.text((995, 458), "JSON", font=f(11), fill=SUB)

# ---------------- 构建与交付 ----------------
panel(40, 852, 1520, 108, GRAY_L, GRAY_B, 12, 1)
d.text((62, 866), "构建与交付", font=f(16, True), fill=NAVY)
d.text((62, 894), "tools/build.js", font=f(12.5, True), fill=TEXT)
d.text((62, 916), "剥离文件首行标记 → 合并为单文件", font=f(11.5), fill=SUB)

d.text((400, 890), "frontend/src", font=f(12.5), fill=TEXT)
d.text((400, 914), "30 脚本 + 8 样式", font=f(11.5), fill=SUB)
arrow(512, 900, 596, 900, (120, 138, 158), 2)
d.text((600, 884), "dist/index.html", font=f(13, True), fill=TEXT)
d.text((600, 908), "单文件 233 KB，双击即用", font=f(11.5), fill=SUB)
arrow(800, 900, 884, 900, (120, 138, 158), 2)
d.text((888, 884), "dist/assets/audio", font=f(13, True), fill=TEXT)
d.text((888, 908), "9.4 MB 授权录音（Range 请求）", font=f(11.5), fill=SUB)

d.text((1210, 878), "两种交付形态共用同一套源码：", font=f(11.5), fill=SUB)
d.text((1210, 900), "① frontend/ 直接运行（开发/答辩调试）", font=f(11.5), fill=SUB)
d.text((1210, 922), "② dist/ 单文件（提交/分发）", font=f(11.5), fill=SUB)

img.save("C:/Users/sumik/Desktop/cipai-website/docs/figures/system-structure.png", quality=95)
print("saved", img.size)
