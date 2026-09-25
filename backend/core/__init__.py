"""core —— 与 Web 框架无关的音频分析纯函数。

约定：这里的函数只接收/返回纯 Python 数据（bytes / list / dict），
不 import fastapi，方便单元测试，也方便以后搬到别的服务或做成命令行工具。

模块划分：
    pitch_detection  音频 → 逐帧音高 → 音符段 → 节奏网格
    key_analysis     音符 → 调性 → 和弦序列（Krumhansl + HMM/维特比）
"""
