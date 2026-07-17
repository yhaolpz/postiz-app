# Tiny Agent source-led English publish plan

### 2026-07-15 Wed - Prompt Chaining

- Source: Anthropic, Building effective agents, published 2024-12-19, https://www.anthropic.com/engineering/building-effective-agents
- Tiny point: Prompt chaining breaks a task into a fixed sequence of LLM calls, where each step uses the previous output and optional programmatic checks can stop bad intermediate results.
- Hook: If one prompt keeps failing, maybe the model is not weak. Maybe the task is too big.
- Narration: If one prompt keeps failing, maybe the model is not weak. Maybe the task is too big. Prompt chaining breaks the work into fixed small steps, where each model call passes its output to the next one. That means every call solves one smaller problem that is easier to inspect. You can also add a code gate between steps. If the outline misses a required point, the chain stops before writing the full article. A simple example: first draft the article outline, then check that it covers the requirements, then write the final text. The tradeoff is more calls and more waiting, but the path is clearer and mistakes are easier to locate. If the next step depends on an unknown result, a fixed chain becomes rigid. Tiny Rule: use prompt chaining when the steps are stable, and each step has a clear check. Follow Tiny Agent. Learn one AI agent idea every day.
- On-screen text: Use prompt chaining when the steps are stable and each step is checkable.
- Subtitle blocks:
  - Too much in one prompt / is easy to break
  - Fixed small steps / pass output forward
  - One model call / one smaller problem
  - Add a code gate / between steps
  - Outline / check / final text
  - More waiting / clearer failures
  - Unknown next steps / make chains rigid
  - Tiny Rule / stable steps + clear checks
  - One AI agent idea / every day
- Keyframes:
  - Tiny Agent and the engineer face one oversized overloaded task sheet covered with tangled requirements, question marks, and warning marks, showing that one prompt is carrying too much.
  - The huge task sheet is cut into three neat cards connected by clear arrows from left to right, with Tiny Agent handing each output card to the next step.
  - Three small stair steps show one focused problem at a time: extract, judge, generate; the engineer checks each step with a simple clipboard.
  - A clean code gate sits between two steps; a wrong intermediate card is stopped by a red light while a correct card passes through.
  - An outline card enters a checklist box, receives green checks for required points, and unfolds into a finished article page after the check passes.
  - A slightly longer clock appears beside a precise error locator beam pointing to the second step, balancing extra waiting with clearer debugging.
  - A rigid fixed chain reaches an unknown fork and gets stuck, while Tiny Agent pauses and looks at several unpredictable path signs.
  - A Tiny Rule checklist lights up two items at once: stable steps and clear checks; the engineer and Tiny Agent connect the chain only after both are checked.
  - Engineer and Tiny Agent stand beside a daily calendar and a growing stack of AI agent knowledge cards, friendly thumbs-up, no source cards or citation symbols.
- TikTok caption: Prompt chaining turns one overloaded prompt into stable, checkable steps. Source: Anthropic, Building effective agents.
- YouTube Shorts title: Prompt Chaining
- Hashtags: `#AIAgents #PromptEngineering #Anthropic #Automation #TinyAgent`
