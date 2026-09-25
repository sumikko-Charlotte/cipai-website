"""services —— 对接外部 AI / 大模型的业务服务层。

与 core/ 的区别：core 是本地确定性算法（librosa、HMM）；
services 调外部模型或需要网络、密钥、异步任务。

规划中的模块：
    generation_service  AI 伴奏 / AI 音乐生成（对接大模型或本地生成模型）
    ci_service          诗词词牌分析的服务端版（可复用前端 20a/20d 的知识库）
    agent_service       智能体编排（分析 → 生成 → 自评 → 修订的多步流程）
"""
