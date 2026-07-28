# Tiny Agent source-led English publish plan

### 2026-07-28 Mon - Tool Use Is Four Decisions

- Source: Toolformer, Language Models Can Teach Themselves to Use Tools, NeurIPS 2023
- Tiny point: Toolformer trains a model to decide whether a tool is needed, which API to call and when, what arguments to pass, and how to use the returned result in later prediction.
- Hook: Knowing an API name is not the same as knowing how to use a tool.
- Narration: Knowing an API name is not the same as knowing how to use a tool. Toolformer studies the full decision, not just the call. First, the model decides whether the question needs an external tool at all. Second, it chooses which API to use and where the call belongs in the text. Third, it produces useful arguments instead of a vague request. For a calendar, that could mean the date, time zone, and event name. Finally, it places the returned result back into the next prediction, where it can actually improve the answer. The paper trained this behavior with a handful of demonstrations for each API, then used self-supervised selection to keep useful calls. So tool ability has four parts: need, choice and timing, arguments, and result use. This is one specific training method, not proof that any model can learn an unfamiliar tool automatically. Tiny Rule: evaluate the whole tool decision, not whether an API call merely happened. Follow Tiny Agent. Tiny Agent helps you get better at using AI.
- On-screen text: Tool Use Is Four Decisions
- Subtitle blocks:
  - Knowing an API name / is not enough
  - Toolformer studies / the full decision
  - First / is a tool needed?
  - Second / which API, and when?
  - Third / generate useful arguments
  - Finally / use the returned result
  - Few demonstrations / self-supervised selection
  - Tiny Rule / evaluate all four decisions
  - Follow Tiny Agent / get better at using AI
- Keyframes:
  - The recurring engineer looks at a row of recognizable tool buttons while Tiny Agent hesitates over which one to press and when; a large question mark conveys that knowing names is insufficient, no readable text.
  - Tiny Agent and the engineer reveal one clear four-stage tool-decision path made of a need gate, a selected tool socket, an argument card, and a returned-result card; simple hand-drawn metaphor, no readable text.
  - A question card reaches a large fork: one branch goes directly to an answer while the other goes toward a single external tool; Tiny Agent actively judges the fork, no readable text.
  - Tiny Agent chooses one correct socket from a calculator, search, translation, and calendar set, then places a small call marker at the right point in a sentence-shaped path; no readable text.
  - A large calendar tool form receives three clear symbolic arguments from Tiny Agent: a date card, a globe-and-clock time-zone icon, and an event card; the engineer rejects a vague empty request, no readable text.
  - A calculator returns one result card, and Tiny Agent inserts it into a visible gap in an answer path so the answer becomes complete; the engineer points to the successfully used result, no readable text.
  - A handful of small example cards enter a self-supervised selection funnel; useful tool-call cards emerge with blue checks while unhelpful calls are filtered away with small red marks, no readable text.
  - One large four-part checklist shows a need gate, a selected tool with timing marker, a filled argument card, and a returned result inserted into an answer; Tiny Agent and the engineer verify the complete decision, no readable text.
  - One large smiling Tiny Agent robot centered in the main art region, waving with one hand and pointing with the other to a single simple blue plus follow symbol; no engineer, no calendar, no source card, no citation symbol, no preview, no additional props, and no text inside the image.
- TikTok caption: Tool use means deciding whether to call, what to call and when, which arguments to pass, and how to use the result. Source: NeurIPS, Toolformer.
- YouTube Shorts title: Tool Use Is Four Decisions
- Hashtags: `#AIAgents #Toolformer #AITools #MachineLearning #TinyAgent`
