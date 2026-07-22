# Source

- Publisher: Anthropic
- Title: Effective context engineering for AI agents
- Published: 2025-09-29
- Canonical URL: https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
- Verified for this run: 2026-07-21T03:06:00+08:00

## Confirmed source claims

- Context engineering extends prompt engineering from wording instructions to curating the full token state available during inference.
- Context is finite and has diminishing marginal returns; Anthropic describes an attention budget and cites context-rot behavior as context grows.
- Effective context seeks the smallest set of high-signal tokens that still supports the desired behavior. Minimal does not necessarily mean short.
- System prompts should sit between brittle hard-coded logic and vague high-level guidance.
- Tools should be self-contained, unambiguous, token-efficient, robust to error, and minimally overlapping.
- A small set of diverse canonical examples is preferable to a long laundry list of edge cases.
- Agents can retrieve context just in time through lightweight references such as file paths, stored queries, and links, enabling progressive disclosure.
- Hybrid retrieval can preload stable essentials while allowing the agent to explore changing or detailed material on demand.
- Long-horizon work can use compaction, structured note-taking, and specialized sub-agent architectures, chosen according to task characteristics.

## Boundaries preserved in the video

- The source does not claim that shorter prompts are always better; sufficient instructions and evidence still belong in context.
- Just-in-time retrieval trades speed for focus and requires good tools and navigation heuristics.
- Compaction can lose subtle but later-critical details, so early tuning should favor recall before aggressive precision.
- The examples describe agent-system design patterns, not universal guarantees for every model, product, or task.

## Reusable artifact

Minimum High-Signal Context Pack: outcome, operating rules, tool map, canonical examples, retrieval index, and working state.
