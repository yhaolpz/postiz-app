# Tiny Agent source-led English publish plan

### 2026-07-16 Thu - Route Before You Solve

- Source: Anthropic, Building effective agents, published 2024-12-19, https://www.anthropic.com/engineering/building-effective-agents
- Tiny point: Routing first classifies an input, then sends it to the specialized prompt, tool, or downstream process that fits that category.
- Hook: What breaks first when one mega-prompt tries to handle every kind of problem?
- Narration: One mega-prompt that handles every problem often handles none well. Anthropic describes routing as a workflow: classify the input first, then send it to the right follow-up prompt, tool, or process. In support, general questions, refunds, and technical failures can take separate paths instead of fighting inside one prompt. Routing can also choose by difficulty: common questions go to a faster, cheaper model, unusual cases to a stronger one. The classifier does not have to be an LLM; rules or a traditional classifier may be steadier when categories are clear. The danger is fuzzy labels. Wrong routing sends the request to the wrong expert. Tiny Rule: route only when categories are clear, classification is reliable, and next steps are meaningfully different. Follow Tiny Agent. Learn one AI agent idea every day.
- On-screen text: Route only when categories are clear, reliable, and meaningfully different.
- Subtitle blocks:
  - One mega-prompt / handles nothing well
  - Step one / classify the input
  - Step two / send it to the right path
  - Example / support tickets split
  - Difficulty / can route too
  - Classifier / not always an LLM
  - Fuzzy labels / wrong expert
  - Tiny Rule / clear, reliable, different
  - One AI agent idea / every day
- Keyframes:
  - A giant messy prompt sheet in the center is being pulled by three problem cards: refund, technical bug, and general question. The engineer looks worried while Tiny Agent tries to hold the sheet together.
  - Three simple question cards move into a central sorting funnel held by Tiny Agent, with clear icon-only categories forming above the funnel.
  - The funnel splits into three clean arrows leading to three different workbenches: prompt desk, tool station, and downstream process lane, with the engineer pointing at the matched path.
  - A customer support desk scene with three counters: general help, refund, and technical issue. Each matching ticket lands at its own counter while Tiny Agent checks them off.
  - A small green fast train carries easy common cards, while a larger blue heavy train carries complex unusual cards. The engineer compares speed and strength.
  - Tiny Agent hands some sorted cards to a simple rule gear and a classic classifier box, showing that the classifier does not have to be an LLM.
  - Two overlapping category circles cause one support ticket to slide toward the wrong counter, with a small red warning cross and the engineer catching the mistake.
  - Three checklist items light up in order: clear categories, reliable classification, different next steps. A routing arrow only turns blue after all three are checked.
  - Engineer and Tiny Agent stand beside a daily calendar and a growing stack of AI agent knowledge cards, friendly thumbs-up, no source cards or citation symbols.
- TikTok caption: Routing works when inputs have clear categories and different next steps. Source: Anthropic, Building effective agents.
- YouTube Shorts title: Route Before You Solve
- Hashtags: `#AIAgents #LLM #Anthropic #Automation #TinyAgent`
