# Source

- Publisher: Anthropic
- Title: Effective harnesses for long-running agents
- Published: 2025-11-26
- Canonical URL: https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents

## Verified facts

- Long-running agents must bridge discrete context windows, because a fresh session does not automatically remember prior work.
- Anthropic describes a two-part harness: an initializer that prepares the environment and a coding agent that advances one feature at a time while leaving structured updates.
- Their web-app experiment treats a clean handoff as merge-ready code, documented state, and a clear next step.
- The article presents one practical approach for long-running coding agents; it does not establish that this is the best design for every agent, domain, or multi-agent system.
