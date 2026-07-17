# Tiny Agent 2026 年 7 月来源证据表

## 结论

2026-07-12 至 2026-07-31 的内容改为“来源驱动”：先从原始资料中拆出可验证的小结论，再生成旁白、画面和字幕。通用工程判断至少标注适用边界；论文结论只描述论文实际提出和验证的机制，不外推为所有 Agent 的普遍能力。

## 来源与可用结论

| ID | 来源 | 类型与版本 | 已确认结论 | 可拆分内容 | 表达边界 |
|---|---|---|---|---|---|
| S1 | [Anthropic: Building effective agents](https://www.anthropic.com/engineering/building-effective-agents) | 官方工程文章，2024-12-19 | 优先简单、可组合的模式；区分固定路径 workflow 与动态决策 agent；文章给出 prompt chaining、routing、parallelization、orchestrator-workers、evaluator-optimizer，并强调环境反馈和停止条件 | 7/12-7/19，共 8 集 | 这是 Anthropic 基于客户和自身实践的工程建议，不表述为理论定律 |
| S2 | [OpenAI: A practical guide to building agents](https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/) | 官方工程指南，当前网页版本核对于 2026-07-12 | Agent 适合复杂判断、难维护规则和非结构化数据；基础由 model、tools、instructions 构成；工具可分 data、action、orchestration；优先单 Agent；run 必须有退出条件 | 7/20-7/25，共 6 集 | 仅把 OpenAI 的经验表述为工程建议；产品特有接口不扩大为行业标准 |
| S3 | [ReAct: Synergizing Reasoning and Acting in Language Models](https://react-lm.github.io/) | ICLR 2023 原始论文项目页 | 推理轨迹与任务动作交替；动作从知识库或环境取得新信息，推理据此更新计划 | 7/26 | 不把 ReAct 简化成隐藏思维链展示，也不声称所有 Agent 都使用 ReAct |
| S4 | [Reflexion: Language Agents with Verbal Reinforcement Learning](https://papers.neurips.cc/paper_files/paper/2023/hash/1b44b878bb782e6954cd888628510e90-Abstract-Conference.html) | NeurIPS 2023 主会论文 | 使用语言反馈和 episodic memory 改善后续尝试，不需要更新模型权重 | 7/27 | 只讲论文机制和实验语境，不表述为 Agent 会永久、可靠地自我进化 |
| S5 | [Toolformer: Language Models Can Teach Themselves to Use Tools](https://proceedings.neurips.cc/paper/2023/hash/d842425e4bf79ba039352da0f658a906-Abstract-Conference.html) | NeurIPS 2023 主会论文 | 模型学习决定调用哪个 API、何时调用、传什么参数，以及如何使用返回结果 | 7/28 | 这是特定训练方法的研究贡献，不等于今天任意模型都会自动学会新工具 |
| S6 | [NIST CAISI: Strengthening AI Agent Hijacking Evaluations](https://www.nist.gov/news-events/news/2025/01/technical-blog-strengthening-ai-agent-hijacking-evaluations) | 美国 NIST/CAISI 技术文章，2025-01-17 | Agent hijacking 属于间接提示注入；根因之一是可信内部指令与不可信外部数据缺少清晰分离 | 7/29 | 不承诺单一提示词可以根治；重点讲信任边界、权限约束和持续评测 |
| S7 | [MCP Architecture 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25/architecture/index) | MCP 最新规范版本，页面标注 latest | Host 负责授权、策略和上下文聚合；每个 client 与一个 server 保持隔离连接；server 不应看到完整对话或其他 server | 7/30 | 只解释规范架构与设计原则，不把 MCP 描述成自动提供安全保证 |
| S8 | [MCP Tools 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25/server/tools) | MCP 最新规范版本，页面标注 latest | Tool 由模型发现和调用，但应用应保留人工拒绝能力；敏感操作应确认；server 应验证输入、做访问控制、限流和输出清理 | 7/31 | SHOULD 与 MUST 分开表达；“应有人可拒绝”不说成协议强制弹窗 |

## 选题映射

| 来源包 | 日期 | 拆分逻辑 |
|---|---|---|
| S1 Anthropic | 7/12-7/19 | 总原则、workflow/agent 区别、augmented LLM、chaining、routing、parallelization、orchestrator-workers、evaluator-optimizer |
| S2 OpenAI | 7/20-7/25 | 适用场景、三个基础组件、三类工具、单 Agent 优先、何时拆分、退出条件 |
| S3-S5 论文 | 7/26-7/28 | ReAct、Reflexion、Toolformer 各讲一个原始研究贡献 |
| S6 安全 | 7/29 | 间接提示注入与 Agent hijacking |
| S7-S8 MCP | 7/30-7/31 | 上下文隔离、工具调用与人工控制 |

## 内容准出边界

- 每集只承载一个来源结论；同一篇文章允许拆成多集，但不能重复同一句话换标题。
- 旁白中的事实判断必须能回指到来源表；自拟场景统一作为“示例”表达。
- 每集必须包含一个适用边界或反例，避免把厂商经验说成普遍定律。
- 画面只负责解释当下语义，不新增旁白里没有出现的技术结论。
- 视频描述保留来源名称、标题、版本或发布日期和链接。
- 发布前重新打开来源页面，检查版本、标题和关键结论是否变化。
