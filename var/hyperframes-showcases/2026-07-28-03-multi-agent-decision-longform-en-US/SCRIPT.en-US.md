### 1 | Introduction

How should AI Agents research in parallel? First, test task fit.

Anthropic draws a useful boundary in its multi-agent research retrospective. Parallelism expands search breadth, but the coordination cost is worthwhile only when independent paths, a valuable result, and enough room for tool use appear together.

In Anthropic’s internal research evaluation, an Opus 4 lead agent with Sonnet 4 subagents outperformed a single Opus 4 agent by 90.2 percent. That number belongs to one internal evaluation, not a promise for every task.

In this episode, we will build a single-versus-multi-agent decision tree. We will test fit, define delegation, size the search, evaluate evidence, and add the recovery controls a production system needs.

This video is packed with practical value to help you become better at using AI. It is a longer episode, so follow and save it for later.

### 2 | Pass the fit gate

The first move is not adding agents. It is deciding whether the problem contains independent exploration paths that deserve parallel work.

Research often fits because an answer may require several directions. Market, technology, user, and risk research can proceed separately before the lead agent compresses them into one conclusion.

Subagents also help when one context window would otherwise hold too many sources, tool results, and working hypotheses. Each path can return a compact, high-signal research summary.

But decomposition creates synchronization when every step depends on the exact state produced by the previous step. Many coding tasks share one codebase and test state, so one continuous agent may fit better.

Economics matters too. In Anthropic’s usage data, agents used about four times the tokens of chat interactions, while multi-agent systems used about fifteen times as many.

That makes multi-agent work sensible for valuable outcomes, expensive mistakes, or questions where search breadth can materially change the answer. It should not add ceremony to a simple request.

Turn the decision into three gates. Can paths run independently? Is one context becoming overloaded? Can the value of the result cover the extra cost? The more gates pass, the stronger the case for parallelism.

Chapter recap. First, look for paths that can progress independently.

Second, be cautious when the task depends on heavily shared state.

Third, reserve the higher cost for high-value outcomes.

### 3 | Write a delegation contract

After the fit gate, the lead agent’s main job is not searching. It is dividing the question into assignments that do not overlap and do not leave gaps.

Every delegation should name an objective and the expected output. Instead of saying research competitors, ask for pricing, target users, and verifiable sources for three named products.

Then declare the allowed tools and source boundary. Naming search, browsing, or databases and prioritizing primary sources keeps subagents from wandering through weak material.

Tell each subagent what not to do as well. Covered regions, time ranges, and result formats should be explicit, or several agents may return the same evidence.

Anthropic describes effective delegation through the objective, output format, tools, sources, and task boundaries. The lead agent should still revise assignments when the first findings change the map.

Broad first and narrow second is often effective. Run a parallel scan for leads, then deepen only the branches that can change the final judgment.

Collect more than conclusions. Require evidence links, important uncertainties, and the reason a path stopped, so the lead agent can decide which findings are safe to merge.

Chapter recap. First, make the objective and output explicit.

Second, specify sources, tools, and boundaries together.

Third, collect evidence and uncertainty, not conclusions alone.

### 4 | Size the effort

Multi-agent does not mean more is always better. Search effort should scale with both question complexity and expected value.

Anthropic’s examples suggest that a simple fact may need one agent and three to ten tool calls. That scale does not require another coordination layer.

A comparison across several targets may use two to four agents, with roughly ten to fifteen tool calls per agent, so each research path reaches useful depth.

Complex research may use more than ten subagents, but that is not a default. The lead agent must see progress, detect duplication, and stop when marginal value falls.

Tool calls can also run in parallel inside one subagent. Anthropic suggests that complex paths often use three to five subagents, with three or more tools running concurrently per agent.

When paths are truly independent, parallel work can cut time by as much as 90 percent on complex queries. The gain comes from overlapping waits, not from making each agent inherently smarter.

Give the decision tree three effort tiers: light, comparison, and deep research. Each tier defines agent count, tool budget, stopping conditions, and the evidence required to escalate.

Chapter recap. First, choose an effort tier from task complexity.

Second, parallel gains come from overlapping independent waits.

Third, stop expanding when marginal value starts to fall.

### 5 | Evaluate quality

Multi-agent paths change dynamically, so evaluation cannot require one fixed sequence of steps.

Start with the result. Are the facts correct? Do citations support the claims? Is the question covered? Are the sources authoritative enough for the decision?

Then inspect whether the process was reasonable. Did the decomposition leave gaps or duplication? Were tool calls useful? Did the lead agent revise its plan when new evidence appeared?

Anthropic uses small-sample human review and criteria for factual accuracy, citations, completeness, source quality, and tool efficiency. The point is to create quality signals people can explain.

If you score only the final answer, a system may get lucky through expensive searching. If you demand one fixed trace, you punish reasonable paths that react to evidence.

A stronger design separates outcome standards from process guardrails. The outcome must pass, while the path may vary as long as it leaves evidence that a reviewer can inspect.

Start with ten real questions for your own system. Compare a single-agent baseline, answer quality, tokens, latency, and failure types before expanding parallel work.

Chapter recap. First, evaluate facts, citations, and coverage.

Second, allow dynamic paths but require an explainable process.

Third, use a real baseline to decide whether parallelism pays.

### 6 | Build for recovery

A research demo that finishes once is not yet a multi-agent system that can recover reliably in production.

Any subagent can time out, lose a tool, or return an empty result. Persist task state so a failure reruns only the affected path instead of restarting the whole tree.

A useful checkpoint records the assignment, owner, current state, evidence location, and next action. After a process restart, the system can resume without treating old output as new evidence.

Observability must cross the whole tree. Trace every delegation, tool call, retry, and synthesis step so you can distinguish search failure, coordination failure, and merge failure.

Deployment should be gradual too. Anthropic describes rainbow deployments that keep old and new versions available so agents already running are not broken by a code change.

The current architecture also has a synchronous bottleneck: the lead agent waits for all subagents before moving on. Async work can be faster, but it adds scheduling, concurrency, and result-merging complexity.

The production checklist is persistent state, path-level retries, end-to-end tracing, gradual deployment, and explicit stopping rules. Speed is an outcome of reliability, not the only goal.

Chapter recap. First, persist state and evidence outside the process.

Second, retry only the failed path and preserve the full trace.

Third, protect production with gradual releases and stopping rules.

### 7 | Summary

Now connect the decision tree. Ask whether paths are independent, whether one context is overloaded, and whether the result can justify the cost. Only then move into delegation, effort sizing, evaluation, and recovery.

Keep a single agent when the task depends on shared state or one agent already completes it reliably. Multi-agent is a task architecture, not a badge of capability.

Before your next deep-research job, draw three candidate paths. Give each one an objective, source boundary, output, and stopping condition. Run them in parallel only if they can truly progress independently.

Follow Tiny Agent and become better at using AI!
