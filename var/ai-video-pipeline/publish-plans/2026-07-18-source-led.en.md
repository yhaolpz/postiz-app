# Tiny Agent source-led English publish plan

### 2026-07-18 Sat - When the Workflow Cannot Be Predrawn

- Source: Anthropic, Building effective agents, published 2024-12-19, https://www.anthropic.com/engineering/building-effective-agents
- Tiny point: In the orchestrator-workers pattern, a central LLM dynamically identifies the subtasks required by the specific input, delegates them to workers, and synthesizes their results.
- Hook: What if you cannot list the steps before the work starts?
- Narration: Imagine a task where you cannot list the steps before you start. Anthropic calls one useful pattern orchestrator-workers. A central model first reads the specific task. Then it decides which subtasks are needed, delegates each one to a worker, and synthesizes their results. In coding, the number of files to change and the right edit for each file often become clear only after inspecting the repository. Search works similarly: early evidence can create new questions for the next round. That flexibility is what separates this pattern from ordinary parallelization, where subtasks are predefined. But orchestration can amplify a bad plan, duplicate work, and produce results that are hard to reconcile. Tiny Rule: use orchestrator-workers when subtasks cannot be predicted and the combined result can still be checked against one clear goal. Follow Tiny Agent. Learn one AI agent idea every day.
- On-screen text: Dynamically discover the work. Synthesize it against one clear goal.
- Subtitle blocks:
  - The steps / are unknown at first
  - Orchestrator-workers / plans dynamically
  - Discover, delegate / then synthesize
  - Coding example / files emerge after inspection
  - Search example / evidence creates questions
  - Unlike parallelization / tasks are not predefined
  - A bad plan / can amplify errors
  - Tiny Rule / unpredictable, but verifiable
  - One AI agent idea / every day
- Keyframes:
  - The engineer studies an unfinished workflow sketch whose first few boxes are clear but whose later branches are blank question-mark shapes; Tiny Agent looks ready to help, with no readable labels.
  - One larger coordinator Tiny Agent studies a complex task card in the center while three worker Tiny Agents wait around it with empty task folders; the engineer points to the coordinator.
  - The coordinator Tiny Agent hands three visually different task cards to three workers, while curved arrows return their completed pieces into one central synthesis folder beside the engineer.
  - A repository tree unfolds across a wide whiteboard composition; several different file cards light up only after the engineer and Tiny Agent inspect the tree, showing that the affected files emerge dynamically.
  - Early search evidence cards lead through blue arrows to new magnifying glasses and new question bubbles for a second research round; the engineer follows the expanding path with Tiny Agent.
  - A wide comparison shows three fixed parallel lanes on the left and a coordinator growing different branches from the current input on the right; the engineer highlights the flexible branch side, with icon-only visuals and no text.
  - One mistaken red task card from the coordinator is copied to several workers, creating duplicated papers and conflicting puzzle pieces at the synthesis board; the engineer stops the spread with a warning gesture.
  - Two large blue conditions are both visibly checked: unknown branching work and one clear verification target; the coordinator and workers converge on a single goal board while the engineer gives a thumbs-up.
  - Engineer and Tiny Agent stand beside a daily calendar and a growing stack of AI agent knowledge cards, friendly thumbs-up, no source cards or citation symbols.
- TikTok caption: Orchestrator-workers helps when the required subtasks only become clear after the work begins. A central model discovers, delegates, and synthesizes the work. Use it when the result can still be checked against one clear goal. Source: Anthropic, Building effective agents.
- YouTube Shorts title: When the Workflow Cannot Be Predrawn
- Hashtags: `#AIAgents #LLM #Anthropic #MultiAgent #TinyAgent`
