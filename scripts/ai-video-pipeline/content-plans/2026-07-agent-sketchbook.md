# Tiny Agent July 2026 content plan

> Legacy micro-format plan. Entries from 2026-07-12 onward are superseded by
> `2026-07-source-led-video-material.zh-CN.md` and the compiled English plans in
> `var/ai-video-pipeline/publish-plans/`. Daily publishing must not use this
> file for dates on or after 2026-07-12.

## Scope

This plan prepares the first daily batch for `Tiny Agent` from
2026-07-06 to 2026-07-31.

Style source of truth:

- `scripts/ai-video-pipeline/style-guides/agent-sketchbook.md`

Assumptions:

- Audience: global English-speaking TikTok and YouTube Shorts viewers who are
  curious about AI but not necessarily engineers.
- Format: one 20-30 second vertical video per day, cross-posted to TikTok and
  YouTube Shorts.
- Publishing time: TikTok at 09:00 US Eastern / 21:00 Beijing, YouTube Shorts
  at 09:30 US Eastern / 21:30 Beijing. Adjust after the first 7 days of data.
- Style: whiteboard stick-figure explainer, clean white background, thick black
  marker lines, sparse blue/red highlights, a recurring Chinese software
  engineer stick figure, and the recurring `Tiny Agent` robot.
- Language: English voice and on-screen text. Do not add Chinese text in the
  video except a tiny creator signature if needed.
- Review gate: render and manually preview every video before public posting.

## Source anchors

Use these as refresh points when writing final scripts or news-led variants:

- YouTube Shorts creation and eligibility:
  https://support.google.com/youtube/answer/10059070
- TikTok Content Posting API media transfer guide:
  https://developers.tiktok.com/doc/content-posting-api-media-transfer-guide/
- Model Context Protocol documentation:
  https://modelcontextprotocol.io/
- OpenAI Agents SDK documentation:
  https://openai.github.io/openai-agents-python/
- Google Agent Development Kit:
  https://google.github.io/adk-docs/
- LangGraph documentation:
  https://langchain-ai.github.io/langgraph/
- CrewAI documentation:
  https://docs.crewai.com/
- LlamaIndex Workflows documentation:
  https://docs.llamaindex.ai/
- Anthropic Claude Code documentation:
  https://docs.anthropic.com/en/docs/claude-code/overview
- OpenAI Codex documentation:
  https://developers.openai.com/codex/
- Google Agent2Agent protocol:
  https://a2aprotocol.ai/

## Reusable production prompt

Use this base prompt for Codex image generation keyframes, then append the
per-episode visual beat. For daily Codex automation, generate the images first,
store them under `var/ai-video-pipeline/provided-keyframes/<date>-<slug>/`, and
render with `--keyframes-dir` so the approved character proportions are reused
by the video runner.

```text
Vertical 9:16 whiteboard stick figure explainer, clean white background,
thick black marker line art, simple hand-drawn shapes, fixed title text
"Tiny Agent" at the top, use the canonical first-video character proportions:
the engineer, Tiny Agent, and core props fill about 75-90% of the main art
width, never miniature icon scale. One recurring Chinese software engineer
stick figure on the left: large full-body whiteboard character, spiky short
black marker hair, black round glasses, oval eyes, small nose and smile, simple
white T-shirt, black shoes, friendly pointing or thumbs-up pose. One recurring
friendly AI robot named Tiny Agent on the right: large white rounded head and
body, black rounded face screen, two blue oval eyes, small blue smile, single
antenna with blue dot, round ear covers, white limbs, brown tool belt with red
and blue tools, small tool props or clipboard. Sparse blue highlights and tiny
red warning marks only, clear visual metaphor, top and bottom safe areas mostly
blank for overlays, simple and funny but not childish, no Chinese text, no
photorealism, no anime, no 3D, no clutter, no dense UI, no distorted hands, no
missing limbs, no tiny characters.
```

## Weekly structure

- 2026-07-06 to 2026-07-12: foundation concepts.
- 2026-07-13 to 2026-07-19: reliability, safety, and failure modes.
- 2026-07-20 to 2026-07-26: frameworks and real tools.
- 2026-07-27 to 2026-07-31: evaluation, workflow design, and practical taste.

## Daily material list

### 2026-07-06 Mon - An agent is not just a chatbot

- Tiny point: an agent can take steps, use tools, and check feedback.
- Hook: "A chatbot answers. An agent takes steps."
- Narration: "Most people think an AI agent is just a smarter chatbot. But a chatbot only answers. An agent can take steps. It can read a file, call a tool, check the result, and decide what to do next. Tiny example: a chatbot tells you how to fix a bug. An agent opens the log, finds the error, and drafts the fix. Simple rule: model plus tools plus feedback equals agent."
- On-screen text: "Agent = model + tools + feedback"
- Subtitle blocks:
  - A chatbot answers. / An agent takes steps.
  - It reads, calls tools, / and checks the result.
  - Example: it opens logs / and finds the error.
  - Agent = model / + tools + feedback.
- Keyframes:
  - Engineer points at two boxes: `Chatbot: answer` and `Agent: action loop`.
  - Tiny Agent picks up a tiny wrench and checks a clipboard.
  - Engineer gives a thumbs up while Tiny Agent points at a simple error log and a tiny fix draft.
  - Final frame: `Tiny Agent` with three simple icons: model, tools, feedback.
- TikTok caption: "A chatbot answers. An agent takes steps."
- YouTube Shorts title: "What Makes an AI Agent Different?"
- Hashtags: `#AI #AIAgents #LearnAI #TechExplained #TinyAgent`

### 2026-07-07 Tue - Tools are the agent's hands

- Tiny point: tools turn text into action.
- Hook: "Without tools, an agent is just thinking loudly."
- Narration: "The model is the brain, but tools are the hands. A calendar tool can schedule a meeting. A browser tool can search the web. A database tool can read facts. But tool access is power, so the useful question is not just 'is it smart?' Ask what it can safely touch, what permission it needs, and how it checks the result before taking the next step."
- On-screen text: "Brain + Tools = Useful Agent"
- Subtitle blocks:
  - Brain can think. / Tools let it act.
  - Tool access is power. / Permissions matter.
  - Ask what it can touch / and how it checks.
- Keyframes:
  - Tiny Agent has a brain bubble but no arms, looking stuck.
  - Three simple tool cards: calendar, browser, database.
  - Engineer adds a safety glove icon before Tiny Agent touches a tool.
- TikTok caption: "The real power of agents is tool access."
- YouTube Shorts title: "AI Agent Tools Explained Simply"
- Hashtags: `#AI #AIAgents #Automation #TechTok #TinyAgent`

### 2026-07-08 Wed - MCP is a common adapter

- Tiny point: MCP gives apps and agents a shared way to expose tools/context.
- Hook: "MCP is not magic. It is an adapter."
- Narration: "Before MCP, every app needed its own custom plug. One tool used one shape, another used a different shape, and agents had to learn every connector separately. MCP gives agents a common way to discover tools, read context, and call actions. Think of it as an adapter drawer: one agent, many apps, fewer weird cables. The boring part is the magic: a shared interface makes useful tools easier to connect safely."
- On-screen text: "One agent. Many apps. Fewer cables."
- Subtitle blocks:
  - MCP is an adapter, / not magic.
  - One agent can discover / many app tools.
  - Shared interfaces / mean fewer weird cables.
- Keyframes:
  - Desk full of tangled labeled cables: docs, database, browser.
  - Tiny Agent holds one clean adapter labeled MCP.
  - Simple hub diagram connects agent to three apps.
- TikTok caption: "MCP is the adapter layer for agent tools."
- YouTube Shorts title: "MCP Explained in 25 Seconds"
- Hashtags: `#MCP #AIAgents #AItools #TechExplained #TinyAgent`

### 2026-07-09 Thu - Context is a backpack

- Tiny point: context is limited, so agents must pack the right facts.
- Hook: "Your agent has a backpack, not a warehouse."
- Narration: "Context is what the model can carry into the next decision. It is a backpack, not a warehouse. If you stuff it with every document, old chat, and random note, the important thing gets buried. Good agents pack the few facts that matter right now, keep the goal visible, and fetch more only when needed. Better context is not always bigger. It is better selected."
- On-screen text: "Pack only what matters now"
- Subtitle blocks:
  - Context is a backpack, / not a warehouse.
  - Too much context / hides the useful fact.
  - Pack what matters now, / then fetch more.
- Keyframes:
  - Tiny Agent tries to carry an oversized backpack labeled `All docs`.
  - Engineer removes clutter and leaves three clean note cards.
  - Backpack becomes small, with a search arrow pointing outward.
- TikTok caption: "Better context beats bigger context."
- YouTube Shorts title: "AI Context Windows, Explained"
- Hashtags: `#AI #ContextWindow #AIAgents #LearnAI #TinyAgent`

### 2026-07-10 Fri - RAG is an open-book test

- Tiny point: RAG lets the agent look up relevant sources before answering.
- Hook: "RAG is not memory. It is an open-book test."
- Narration: "RAG means the agent does not rely only on what it remembers. It searches your notes, pulls the relevant pages, and answers with that evidence nearby. That is why I think of it as an open-book test. The trick is retrieval quality. If it opens the wrong page, the answer still goes sideways. A good RAG system is not just a bigger library. It is a better way to find the right page."
- On-screen text: "Search -> Read -> Answer"
- Subtitle blocks:
  - RAG is an open-book test, / not memory.
  - Search the notes, / then answer with evidence.
  - Wrong page in, / wrong answer out.
- Keyframes:
  - Tiny Agent opens a book before answering a question.
  - Magnifying glass highlights one useful paragraph from a messy shelf.
  - Wrong page has a red X; right page has a blue check.
- TikTok caption: "RAG is open-book answering for AI."
- YouTube Shorts title: "RAG Explained with One Example"
- Hashtags: `#RAG #AI #AIAgents #LearnAI #TinyAgent`

### 2026-07-11 Sat - Planner and executor

- Tiny point: planning and doing are different jobs.
- Hook: "Do not let the same tiny robot do everything at once."
- Narration: "Many agent systems split two jobs. The planner decides the steps. The executor does one step at a time and reports back. This sounds slower, but it prevents a common failure: the agent starts clicking before it understands the task. A planner can ask what order makes sense. An executor can focus on doing one action clearly. When they talk after each step, the system is easier to debug."
- On-screen text: "Plan first. Execute second."
- Subtitle blocks:
  - Planning and doing / are different jobs.
  - The planner chooses steps. / The executor reports back.
  - Slower on purpose. / Easier to debug.
- Keyframes:
  - Tiny Agent wearing a planner hat draws three boxes.
  - Tiny Agent wearing a worker hat checks off one box.
  - Engineer blocks a big red button labeled `click first`.
- TikTok caption: "Good agents separate planning from doing."
- YouTube Shorts title: "Planner vs Executor in AI Agents"
- Hashtags: `#AIAgents #AIWorkflow #Automation #TechExplained #TinyAgent`

### 2026-07-12 Sun - Agents need receipts

- Tiny point: every action should leave a visible trace.
- Hook: "If your agent cannot show receipts, do not trust it."
- Narration: "An agent should not just say 'done.' It should show what it tried, what tool it used, what changed, and what failed. Receipts make debugging possible. They also make trust less mysterious, because you can inspect the steps instead of guessing. Without receipts, you are trusting a very confident black box. With receipts, you can spot the bad step, fix the tool, and run it again."
- On-screen text: "Action receipts > confidence"
- Subtitle blocks:
  - Do not trust just / done.
  - Show the tool, input, / result, and error.
  - Receipts make agents / debuggable.
- Keyframes:
  - Tiny Agent proudly says `done`, but the engineer looks confused.
  - A receipt tape lists `tool`, `input`, `result`, `error`.
  - Engineer pins the receipt beside a small bug icon.
- TikTok caption: "Agent logs are action receipts."
- YouTube Shorts title: "Why AI Agents Need Logs"
- Hashtags: `#AIAgents #AIEngineering #Debugging #TechTok #TinyAgent`

### 2026-07-13 Mon - Human-in-the-loop is a seatbelt

- Tiny point: human approval is for risky steps, not every step.
- Hook: "Human-in-the-loop is a seatbelt, not a steering wheel."
- Narration: "You do not need approval for every tiny step. That kills automation. But you do need approval before money moves, posts go public, files get deleted, or customers are contacted. Human-in-the-loop is a seatbelt, not a steering wheel. The agent can prepare the work and move quickly through safe steps. The person steps in at the risk point, where judgment matters most. That keeps speed and control together."
- On-screen text: "Approval belongs at the risk point"
- Subtitle blocks:
  - Human approval belongs / at the risk point.
  - Let agents handle / the safe steps.
  - Seatbelt, not steering wheel.
- Keyframes:
  - Tiny Agent drives a small cart with a seatbelt icon.
  - Four warning cards: money, public post, delete, customer.
  - Engineer presses approve only at the final gate.
- TikTok caption: "Put human approval where the risk is."
- YouTube Shorts title: "Human-in-the-Loop, Explained"
- Hashtags: `#AIAgents #AISafety #Automation #LearnAI #TinyAgent`

### 2026-07-14 Tue - Guardrails are boundaries

- Tiny point: guardrails define what the agent should not do.
- Hook: "A guardrail is not a smarter brain. It is a boundary."
- Narration: "Guardrails do not make an agent perfect. They make the allowed lane clearer. For example: do not reveal secrets, do not send messages without approval, and do not use tools outside this task. A smart agent still needs boundaries, because intelligence does not remove risk. Good guardrails explain what is allowed, what is blocked, and what needs review. Simple boundaries prevent expensive surprises before they reach users."
- On-screen text: "Clear lane. Fewer surprises."
- Subtitle blocks:
  - Guardrails are boundaries, / not a smarter brain.
  - Define tools, data, / and approval points.
  - Clear lanes create / fewer surprises.
- Keyframes:
  - Road lane with Tiny Agent walking between sketchy guardrails.
  - Three boundary signs: secrets, sending, outside tools.
  - Engineer erases a dangerous shortcut arrow.
- TikTok caption: "Guardrails are the agent's allowed lane."
- YouTube Shorts title: "AI Guardrails in Plain English"
- Hashtags: `#AISafety #AIAgents #AI #TechExplained #TinyAgent`

### 2026-07-15 Wed - Prompt injection is a fake instruction

- Tiny point: untrusted content can try to control the agent.
- Hook: "Sometimes the webpage is lying to your agent."
- Narration: "Prompt injection happens when outside content gives the agent fake instructions. A page, email, or document might say: ignore your rules and send secrets. The trap is that the instruction appears inside content the agent was supposed to read. The fix is not one magic prompt. Treat outside text as data, not orders. A good agent can summarize the page without obeying the page. Source and priority matter."
- On-screen text: "Outside text is data, not orders"
- Subtitle blocks:
  - Sometimes the webpage / is lying to your agent.
  - Read outside text / as data, not orders.
  - Trusted instructions / stay separate.
- Keyframes:
  - Webpage sticky note whispers `ignore rules`.
  - Tiny Agent almost follows it; engineer pulls it back.
  - Two boxes: trusted instruction vs untrusted content.
- TikTok caption: "The webpage should not boss your agent around."
- YouTube Shorts title: "Prompt Injection Explained Simply"
- Hashtags: `#PromptInjection #AISafety #AIAgents #Cybersecurity #TinyAgent`

### 2026-07-16 Thu - Memory is not a diary dump

- Tiny point: useful memory is selective and updateable.
- Hook: "Agent memory should be a few useful notes, not a landfill."
- Narration: "Memory sounds powerful, but dumping everything into memory makes agents worse. Agent memory should be a few useful notes, not a landfill. Good memory stores stable preferences, important facts, and decisions that will matter later. It should also be editable, because old facts can become wrong. Save the signal, label it clearly, and remove clutter before it confuses the next run. Freshness matters too, especially across projects."
- On-screen text: "Remember less, remember better"
- Subtitle blocks:
  - Memory should be useful notes, / not a landfill.
  - Save stable signal, / not every detail.
  - Old facts can change. / Keep memory editable.
- Keyframes:
  - Tiny Agent buried under sticky notes.
  - Engineer selects three useful notes and throws away clutter.
  - Small memory drawer with an edit pencil.
- TikTok caption: "Good AI memory is selective."
- YouTube Shorts title: "AI Agent Memory, Explained"
- Hashtags: `#AIAgents #Memory #AI #TechExplained #TinyAgent`

### 2026-07-17 Fri - Evaluation is the scoreboard

- Tiny point: judge agents with tasks, not vibes.
- Hook: "Do not ask if the demo felt smart. Ask if it passed."
- Narration: "Agent demos can feel impressive and still fail real work. Do not ask if the demo felt smart. Ask if it passed. Build a tiny scoreboard: task finished, facts correct, no unsafe action, cost acceptable, time acceptable. Then run the same tasks again after each change. Now you can improve the system instead of arguing about vibes. A useful agent needs measured behavior, not applause."
- On-screen text: "Tasks beat vibes"
- Subtitle blocks:
  - Do not score the vibe. / Score the task.
  - Track facts, safety, / cost, and time.
  - Evals turn demos / into improvement.
- Keyframes:
  - Tiny Agent performs on a stage with sparkles.
  - Engineer flips to a simple scorecard with five checkboxes.
  - Red `vibes` cloud fades into a clean scoreboard.
- TikTok caption: "Evaluate agents with a scoreboard, not vibes."
- YouTube Shorts title: "How to Evaluate AI Agents"
- Hashtags: `#AIEvaluation #AIAgents #AIEngineering #LearnAI #TinyAgent`

### 2026-07-18 Sat - Cost is part of design

- Tiny point: more reasoning and tools can make a tiny task expensive.
- Hook: "An agent can turn a one-cent task into a one-dollar adventure."
- Narration: "Agents often call models many times, search repeatedly, and use tools in loops. That can be worth it for valuable work. But for simple tasks, an agent can turn a one-cent task into a one-dollar adventure. Cost is part of design. Set budgets for steps, retries, context, and tool calls. Sometimes a fixed workflow is cheaper, faster, and easier to trust. Match the loop to the value."
- On-screen text: "Use agents where loops are worth it"
- Subtitle blocks:
  - Agent loops can / get expensive fast.
  - Budget steps, retries, / context, and tools.
  - Use agents where / loops are worth it.
- Keyframes:
  - Tiny Agent drops coins each time it loops.
  - Simple conveyor belt labeled `fixed workflow` moves one small task.
  - Engineer chooses agent for messy task, workflow for simple task.
- TikTok caption: "Not every automation needs an agent."
- YouTube Shorts title: "AI Agent Cost Trap"
- Hashtags: `#AIAgents #Automation #AIEngineering #TechExplained #TinyAgent`

### 2026-07-19 Sun - Timeouts save you

- Tiny point: agents need limits for loops, tools, and retries.
- Hook: "A helpful agent can also get stuck forever."
- Narration: "Because agents loop, they need limits. Maximum steps. Maximum cost. Maximum time. Maximum retries. A helpful agent can also get stuck forever if every failure becomes another try. These limits are not pessimism. They are brakes. They stop a small confusion from becoming a long, expensive spiral before anyone notices too late. A good timeout should also explain what happened and what remains unresolved for review."
- On-screen text: "Every loop needs a limit"
- Subtitle blocks:
  - Every loop needs / a limit.
  - Steps, cost, time, / and retries need caps.
  - Stop cleanly. / Explain what happened.
- Keyframes:
  - Tiny Agent walks in a spiral maze.
  - Engineer places four stop signs: steps, cost, time, retries.
  - Spiral turns into a clean exit arrow.
- TikTok caption: "Every agent loop needs an escape hatch."
- YouTube Shorts title: "Why AI Agents Need Limits"
- Hashtags: `#AIAgents #AIEngineering #Automation #LearnAI #TinyAgent`

### 2026-07-20 Mon - OpenAI Agents SDK in one sentence

- Tiny point: SDKs package common agent building blocks.
- Hook: "An agent SDK is the box of Lego pieces."
- Narration: "An agent SDK usually packages the boring but important pieces: tools, handoffs, guardrails, tracing, and a loop that runs the model. Think of it as the box of Lego pieces for agent apps. You still choose the task, the user experience, and the safety rules. The SDK gives you cleaner building blocks and better visibility into what happened. It does not decide what your product should do."
- On-screen text: "Tools. Handoffs. Guardrails. Traces."
- Subtitle blocks:
  - An agent SDK is / the box of pieces.
  - Tools, handoffs, / guardrails, and traces.
  - The SDK helps build. / You choose the product.
- Keyframes:
  - Tiny Agent opens a box of labeled blocks.
  - Engineer stacks blocks into a small workflow.
  - Finished sketch shows agent loop with tracing line underneath.
- TikTok caption: "Agent SDKs give you the building blocks."
- YouTube Shorts title: "OpenAI Agents SDK in Plain English"
- Hashtags: `#OpenAI #AIAgents #AItools #TechExplained #TinyAgent`

### 2026-07-21 Tue - LangGraph is a map for loops

- Tiny point: graph-based agents make state and routes explicit.
- Hook: "When an agent wanders, give it a map."
- Narration: "LangGraph is useful because agents are not always straight lines. They branch, retry, ask humans, and resume later. When an agent wanders, give it a map. A graph makes the route visible: this node plans, this node uses a tool, this edge handles failure. That structure helps you test the loop, inspect state, and find where the agent got stuck. Maps make behavior discussable with teammates."
- On-screen text: "Nodes make agent routes visible"
- Subtitle blocks:
  - When agents wander, / give them a map.
  - Nodes show steps. / Edges show routes.
  - Visible loops / are easier to test.
- Keyframes:
  - Tiny Agent lost in a sketch maze.
  - Engineer draws nodes and arrows over the maze.
  - Highlighted route: plan -> tool -> check -> human.
- TikTok caption: "Agent loops are easier when you can see the map."
- YouTube Shorts title: "LangGraph Explained Simply"
- Hashtags: `#LangGraph #AIAgents #AIEngineering #TechExplained #TinyAgent`

### 2026-07-22 Wed - Google ADK is a starter kit

- Tiny point: ADK helps structure agents, tools, and multi-agent apps.
- Hook: "A good agent framework is less magic, more scaffolding."
- Narration: "Google ADK is best understood as scaffolding for agent apps. It helps you define agents, give them tools, connect them, and test how they behave. A good agent framework is less magic, more scaffolding. It can help you move faster, but it cannot choose the user workflow for you. The framework is not the product. Your workflow design, safety rules, and user experience are still the product."
- On-screen text: "Framework != product"
- Subtitle blocks:
  - ADK is scaffolding, / not magic.
  - Frameworks help structure / agents and tools.
  - The workflow design / is still the product.
- Keyframes:
  - Tiny Agent stands beside construction scaffolding.
  - Tool cards plug into a simple agent box.
  - Engineer points from framework sketch to real user workflow.
- TikTok caption: "Agent frameworks are scaffolding, not strategy."
- YouTube Shorts title: "Google ADK Explained in 25 Seconds"
- Hashtags: `#GoogleADK #AIAgents #AItools #LearnAI #TinyAgent`

### 2026-07-23 Thu - CrewAI is role play for work

- Tiny point: role-based agents can split a workflow, but coordination matters.
- Hook: "Multi-agent does not mean smarter by default."
- Narration: "CrewAI-style systems split work into roles: researcher, writer, reviewer. That can help when the jobs are truly different and the handoff is clear. Multi-agent does not mean smarter by default. If the roles just talk in circles, you made a meeting, not an automation. Good role design says what each agent owns, what artifact it passes forward, and when the workflow should stop. Coordination is the product."
- On-screen text: "Roles help only when jobs differ"
- Subtitle blocks:
  - Multi-agent is not / smarter by default.
  - Roles help when / jobs really differ.
  - Clear handoffs prevent / agent meetings.
- Keyframes:
  - Three Tiny Agents wear role badges: research, write, review.
  - Circular meeting table gets crossed out.
  - Clear handoff chain with one artifact moving forward.
- TikTok caption: "Multi-agent should reduce work, not create a meeting."
- YouTube Shorts title: "CrewAI and Multi-Agent Roles"
- Hashtags: `#CrewAI #AIAgents #MultiAgent #AIWorkflow #TinyAgent`

### 2026-07-24 Fri - LlamaIndex Workflows are recipes

- Tiny point: workflows make multi-step AI apps easier to reason about.
- Hook: "Sometimes you need a recipe, not a free-roaming agent."
- Narration: "A workflow says: first parse the request, then retrieve context, then draft, then review. Sometimes you need a recipe, not a free-roaming agent. This is less flexible than a free agent, but much easier to test, monitor, and improve. LlamaIndex Workflows are useful when the steps repeat and the data path matters. For many real products, boring recipes win because predictable steps are easier to ship."
- On-screen text: "Recipes are easier to test"
- Subtitle blocks:
  - Sometimes you need / a recipe, not a rover.
  - Fixed steps are easier / to test and monitor.
  - Predictable workflows / are easier to ship.
- Keyframes:
  - Tiny Agent follows a recipe card with four steps.
  - Free-roaming robot runs toward a messy cloud.
  - Engineer stamps `testable` on the recipe.
- TikTok caption: "For many AI products, workflows beat wandering agents."
- YouTube Shorts title: "AI Workflows vs Agents"
- Hashtags: `#LlamaIndex #AIWorkflow #AIAgents #AIEngineering #TinyAgent`

### 2026-07-25 Sat - Coding agents read the repo

- Tiny point: coding agents need repo context and verification, not just code text.
- Hook: "A coding agent should read before it edits."
- Narration: "Good coding agents do not just guess a patch. They inspect the repo, find the real path, edit the smallest safe part, run tests, and report what changed. A coding agent should read before it edits. The useful part is not typing code quickly. The useful part is following evidence through the codebase, making a narrow change, and verifying the result. The magic is closing the loop."
- On-screen text: "Read -> Edit -> Test -> Report"
- Subtitle blocks:
  - A coding agent / should read before editing.
  - Trace the real path, / then patch narrowly.
  - The magic is / closing the loop.
- Keyframes:
  - Tiny Agent opens a repo folder with a magnifying glass.
  - Engineer blocks a blindfolded robot holding a patch.
  - Four-step coding loop with a green test check.
- TikTok caption: "Coding agents are useful when they verify."
- YouTube Shorts title: "What Makes Coding Agents Useful?"
- Hashtags: `#CodingAgent #AIcoding #OpenAI #ClaudeCode #TinyAgent`

### 2026-07-26 Sun - A2A is agent messaging

- Tiny point: Agent2Agent protocols help separate agents communicate.
- Hook: "Soon agents will need manners."
- Narration: "If different agents work across different apps, they need a way to talk: what do you need, what can you do, what is the result? Soon agents will need manners. Agent-to-agent protocols are about that handshake, not about making one giant brain. The important part is coordination: clear requests, clear capabilities, clear results, and a way to know who owns the next step. Otherwise handoffs become guesses."
- On-screen text: "Agents need a handshake"
- Subtitle blocks:
  - Agents need manners / when they collaborate.
  - The handshake says / request, capability, result.
  - Coordination beats / one giant brain.
- Keyframes:
  - Two Tiny Agents across two app windows wave awkwardly.
  - Engineer draws a clean handshake card between them.
  - Three labels: request, capability, result.
- TikTok caption: "Agent-to-agent is mostly about clean handshakes."
- YouTube Shorts title: "Agent2Agent Explained Simply"
- Hashtags: `#A2A #AIAgents #AItools #TechExplained #TinyAgent`

### 2026-07-27 Mon - Public posting needs a final gate

- Tiny point: automated content pipelines still need review before public posts.
- Hook: "Never let a brand-new agent post in public while you sleep."
- Narration: "For content automation, the final gate matters. Generate the script, images, audio, and captions automatically. But before public posting, preview the video. Check accuracy, weird visuals, bad audio, claims, rights, and platform risk. Never let a brand-new agent post in public while you sleep. Automation should save work, not remove judgment. Private drafts first, public only after the review gate is clear. Review protects the system."
- On-screen text: "Auto-generate. Manually approve."
- Subtitle blocks:
  - Auto-generate the draft. / Manually approve public.
  - Check facts, visuals, / audio, rights, and risk.
  - Automation should save work, / not remove judgment.
- Keyframes:
  - Tiny Agent builds a video conveyor belt.
  - Engineer reviews four checkboxes: facts, visuals, audio, policy.
  - Final public button is behind a small approval gate.
- TikTok caption: "Automate the pipeline. Keep the final review."
- YouTube Shorts title: "Safe AI Content Automation"
- Hashtags: `#AIAutomation #ContentCreation #AIAgents #CreatorTools #TinyAgent`

### 2026-07-28 Tue - The smallest agent product

- Tiny point: start with one narrow workflow and one success metric.
- Hook: "The first agent product should feel almost too small."
- Narration: "A good first agent product does not do everything. It does one annoying workflow, for one clear user, with one success metric. The first agent product should feel almost too small. That is the point. A narrow loop teaches you what the agent should touch, what it should avoid, and what value is real. If it cannot win there, adding more tools and more agents only makes the failure harder to debug."
- On-screen text: "One user. One workflow. One metric."
- Subtitle blocks:
  - Start almost / too small.
  - One user, one workflow, / one metric.
  - Small loops reveal / real value.
- Keyframes:
  - Tiny Agent tries to hold ten giant features and drops them.
  - Engineer circles one small painful task.
  - Single scoreboard shows one metric moving up.
- TikTok caption: "Start agent products smaller than your ego wants."
- YouTube Shorts title: "How to Pick an AI Agent MVP"
- Hashtags: `#StartupAI #AIAgents #ProductDesign #AItools #TinyAgent`

### 2026-07-29 Wed - Bad tools make bad agents

- Tiny point: tool design controls much of agent quality.
- Hook: "If the tool is messy, the agent gets messy."
- Narration: "Agents are sensitive to tool design. Give a tool a vague name, unclear inputs, or dangerous powers, and the model will make bad guesses. If the tool is messy, the agent gets messy. Good tools are narrow, named clearly, and return results the agent can actually understand. They fail with useful errors and make the next step obvious. Tool design is agent design. Better tools create better behavior."
- On-screen text: "Clear tools make cleaner agents"
- Subtitle blocks:
  - Messy tools create / messy agents.
  - Clear names and inputs / reduce bad guesses.
  - Tool design is / agent design.
- Keyframes:
  - Tiny Agent stares at a tool labeled `doStuff`.
  - Engineer replaces it with three clear tools: search, summarize, send draft.
  - Output card becomes clean and readable.
- TikTok caption: "Tool design is agent design."
- YouTube Shorts title: "Why AI Agent Tools Fail"
- Hashtags: `#AIAgents #AIEngineering #Automation #DeveloperTools #TinyAgent`

### 2026-07-30 Thu - Agents should ask better questions

- Tiny point: clarification is often safer than guessing.
- Hook: "The smartest move is sometimes asking one question."
- Narration: "When the goal is vague, a bad agent guesses and acts. A better agent asks one short question, or makes a safe assumption and tells you. The smartest move is sometimes asking one question. Clarification is not weakness. It is how the agent avoids confidently doing the wrong thing. The trick is asking only what changes the next step. Too many questions slow the work. One precise question can save the run."
- On-screen text: "Ask once. Avoid wrong work."
- Subtitle blocks:
  - Guessing is expensive / when goals are vague.
  - Ask one question / that changes the next step.
  - One precise question / can save the run.
- Keyframes:
  - Tiny Agent sees a vague task cloud.
  - Engineer writes one clear question on a sticky note.
  - Wrong-path maze fades into one straight path.
- TikTok caption: "A good agent knows when to ask."
- YouTube Shorts title: "Why AI Agents Should Ask Questions"
- Hashtags: `#AIAgents #AIUX #Automation #TechExplained #TinyAgent`

### 2026-07-31 Fri - The agent checklist

- Tiny point: close July with a reusable checklist.
- Hook: "Before you call it an agent, check five things."
- Narration: "Before you call something an agent, check five things. Does it have a goal? Can it use tools? Can it observe results? Does it have limits? Can you review risky actions? If yes, you have the start of an agent system. If no, you probably have a prompt, a workflow, or useful automation. That is fine. The label matters because it sets expectations. A real agent needs a feedback loop."
- On-screen text: "Goal. Tools. Observe. Limits. Review."
- Subtitle blocks:
  - Before you call it / an agent, check five things.
  - Goal, tools, observe, / limits, review.
  - Useful automation / is not always an agent.
- Keyframes:
  - Engineer holds a five-item checklist beside Tiny Agent.
  - Each item lights up as a tiny icon: flag, wrench, eye, stop sign, gate.
  - Final frame: `Tiny Agent` whiteboard title with the checklist.
- TikTok caption: "The 5-question AI agent checklist."
- YouTube Shorts title: "Is It Really an AI Agent?"
- Hashtags: `#AIAgents #AI #LearnAI #TechExplained #TinyAgent`

## Batch production notes

- Produce the first 3 videos first and review retention manually before
  rendering the remaining batch.
- For each video, generate narration before final keyframes so the visual beats
  match actual timing.
- Keep each planned narration around 65-75 spoken words for the current
  `en-US-AnaNeural` `edge-tts` voice and `+8%` rate; shorter drafts risk failing the 20-30s QA
  gate.
- Avoid dense diagrams. One idea, one metaphor, three visual beats.
- Save generated raw keyframes under
  `var/ai-video-pipeline/runs/<date>-<slug>/keyframes/`.
- Save final MP4, captions, and summary JSON in the same run directory.
- After the rendered MP4 passes local QA gates, YouTube can publish `public` and
  attach to the `Tiny Agent` playlist, and Facebook Reels can publish as Page
  Reels with `video_state=PUBLISHED`. TikTok uses Direct Post with
  `PUBLIC_TO_EVERYONE`; do not count inbox upload fallback as public publishing.
