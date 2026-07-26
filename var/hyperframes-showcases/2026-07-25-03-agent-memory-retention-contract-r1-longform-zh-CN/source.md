# 来源记录

- 机构：Microsoft Research
- 标题：PlugMem: Transforming raw agent interactions into reusable knowledge
- 发布日期：2026-03-10
- 原文：https://www.microsoft.com/en-us/research/blog/from-raw-interaction-to-reusable-knowledge-rethinking-memory-for-ai-agents/

## 本期采用的已核实事实

- 长交互记录会混入与当前任务无关的细节，检索会变慢且不稳定。
- PlugMem 将对话、文档和网页会话等交互转为结构化知识单元：事实与可复用技能。
- 它包含结构化转换、任务对齐检索和压缩为可行动指引三个环节。
- 原文在长多轮对话、跨多篇 Wikipedia 找事实和网页浏览决策三类基准中比较同一模块，报告其性能优于比较对象且使用更少记忆 token。
- 这些是基准证据，不保证适用于所有生产 Agent；本期的保留、提炼、遗忘表属于基于该思路的实践解释。
