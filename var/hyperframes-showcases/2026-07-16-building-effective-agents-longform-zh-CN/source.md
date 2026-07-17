# Source verification

- Publisher: Anthropic
- Canonical title: Building effective agents
- Canonical URL: https://www.anthropic.com/engineering/building-effective-agents
- Published: 2024-12-19
- Verified: 2026-07-16, Asia/Shanghai

## Confirmed source claims

- Successful production systems commonly favor simple, composable patterns over unnecessarily complex frameworks.
- Workflows follow predefined code paths; agents dynamically choose their own steps and tools.
- Agentic systems trade latency and cost for task performance, so complexity should increase only when measured outcomes justify it.
- Retrieval, tools, and memory form the augmented-LLM building block.
- The source describes prompt chaining, routing, parallelization, orchestrator-workers, and evaluator-optimizer workflows.
- Autonomous agents depend on environmental ground truth, stopping conditions, guardrails, and clear tool interfaces.
- Anthropic recommends simple design, transparent planning, and careful agent-computer interface design.

## Fact boundaries

- The architecture ladder and source examples are grounded in Anthropic's article.
- The expense-report, incident-response, refund, and risk-tier scenarios are explanatory applications, not reported Anthropic customer results.
- The `0.9^10` reliability illustration is arithmetic used to explain compounding risk; it is not a measured result from the source.
