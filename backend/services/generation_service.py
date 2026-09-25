"""AI 音乐生成服务（占位，待实现）。

未来三个方向的挂载点，接口先定下来，路由层可以直接依赖：

 1. AI 伴奏生成：调用音乐生成大模型 API，或本地部署的开源模型
    （如 MusicGen / 符号域 Transformer），输入旋律 + 风格，输出伴奏 MIDI。
 2. 诗词词牌配乐：把前端 20a/20d/20e 的词牌匹配 + 依字行腔逻辑
    搬到服务端，换更大规模的格律数据库。
 3. 智能体：把"分析 → 生成 → 试听评分 → 修订"编排成多步智能体流程。

所有函数保持纯数据进出（dict / list / bytes），不直接依赖 FastAPI。
"""
from __future__ import annotations


def generate_accompaniment(
    melody: list[dict],
    key: str,
    mode: str,
    style: str,
    instrument: str | None = None,
) -> dict:
    """按旋律与风格生成伴奏（AI 路线，区别于 core/ 的规则/HMM 路线）。

    参数：
        melody:     旋律音符 [{"start": 0, "dur": 2, "midi": 60}, ...]
        key / mode: 调性（estimate_key 的结果）
        style:      风格标识（与前端 16 种风格的 key 对齐，如 "jazz"）
        instrument: 可选，指定伴奏乐器

    返回：
        {"chords": [...], "accompaniment": [...], "model": "...", "meta": {...}}

    实现建议：
        先用本地规则/HMM 跑通闭环（core/ 已有骨架），
        再把本函数作为 AI 增强入口，做 A/B 对比就是现成的答辩亮点。
    """
    raise NotImplementedError("generation_service.generate_accompaniment 尚未实现")
