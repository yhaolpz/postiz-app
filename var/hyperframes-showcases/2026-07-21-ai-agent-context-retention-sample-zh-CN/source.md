# 来源

- 机构：Anthropic
- 标题：Effective context engineering for AI agents
- 发布日期：2025-09-29
- 原文：https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
- 复用 2026-07-21 正式长视频工程中已经核验的来源包。

## 样片使用的结论

- 上下文是一笔有限的注意力预算；窗口变长后，边际收益会下降。
- 更多上下文可能稀释下一步决策真正需要的信号。
- 目标不是一味缩短提示词，而是保留最小但充分的高信号上下文。
- 可复用产物是六部分上下文包：目标、运行规则、工具地图、标准示例、检索索引和当前状态。

## 边界

样片不宣称“提示词越短越好”，只比较无差别预加载与充分高信号上下文、按需检索之间的差异。
