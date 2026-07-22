# 来源

- 发布机构：Anthropic
- 原文标题：Effective context engineering for AI agents
- 发布日期：2025-09-29
- Canonical URL：https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
- 复用 2026-07-21 正式长视频已核验的来源包。

## 样片使用的结论

- 上下文是一份有限的注意力预算；窗口增长时，新增信息的边际收益会下降。
- 更多上下文可能稀释下一步决策真正需要的信号。
- 目标不是机械缩短提示词，而是保留足够且高信号的最小上下文。
- 可复用产物是六部分高信号包：目标、运行规则、工具地图、标准示例、检索索引和当前状态。

## 边界

样片不主张提示词越短越好，而是对比无差别预加载与足够的高信号上下文加按需检索。
