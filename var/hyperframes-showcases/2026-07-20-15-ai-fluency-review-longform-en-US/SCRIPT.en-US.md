# Tiny Agent Long-Form Script

## Full Narration Script

### 1 | Introduction

The most dangerous AI output is not always the one that looks obviously wrong. It may be the one that arrives polished, complete, and easy to accept. A clean document, working app, confident analysis, or beautiful dashboard can make the thinking behind it feel finished too.

Anthropic's AI Fluency Index found exactly this tension. In conversations that produced artifacts such as code, documents, and interactive tools, people gave the AI clearer goals, formats, and examples. Yet they were less likely to identify missing context, check facts, or question the model's reasoning.

That does not mean polished output is bad. It means polish removes the rough edges that normally remind us to inspect the work. The better an output looks, the more deliberate the review step must become.

In this video, we will turn that finding into a practical review method. You will learn how to spot the polish trap, use iteration without wandering, set collaboration terms before the answer arrives, inspect the output through evidence and tests, and finish with a five-pass checklist you can reuse on real work.

Keep one sentence in view: the first answer is a draft with production value. It may be useful, impressive, and even correct, but none of those qualities removes the need to verify what you are about to use.

### 2 | The Polish Trap

Start with the pattern Anthropic observed. The report analyzed nine thousand eight hundred thirty substantive, multi-turn Claude conversations and measured eleven collaboration behaviors that could be seen inside the chat. Artifact-producing conversations made up twelve point three percent of the sample.

When people were building an artifact, they became more directive. Goal clarification rose by fourteen point seven percentage points. Specifying a format rose by fourteen point five points. Providing examples rose by thirteen point four points, and iteration rose by nine point seven points.

But the evaluation side moved in the opposite direction. Identifying missing context fell by five point two percentage points. Fact checking fell by three point seven points. Asking the model to explain the basis for its reasoning fell by three point one points.

Why might this happen? A polished artifact looks closer to completion, so the user may treat appearance as evidence. Some artifact tasks also reward function or aesthetics more than factual precision. And some users may be testing the code, sharing the draft, or reviewing it elsewhere, where the study cannot see their evaluation.

Those explanations matter because the findings are correlational, not causal. The study does not prove that polished output makes people less critical. It shows a reliable enough association to create a useful warning: completion cues can arrive before evaluation is complete.

Use polish as a trigger, not a verdict. When an output looks finished, pause before praising or publishing it. Ask what claim, assumption, dependency, or consequence is hardest to see from the surface.

First, polished presentation can arrive before critical evaluation is complete.

Second, artifact conversations show more direction but less visible checking.

Third, use polish as a review trigger rather than proof of quality.

### 3 | Iteration

The strongest positive pattern in the report was iteration and refinement. Eighty five point seven percent of the sampled conversations built on earlier exchanges instead of accepting one response and moving immediately to a new task.

Those iterative conversations displayed two point six seven additional fluency behaviors on average, compared with one point three three in conversations without iteration. They were five point six times more likely to question the model's reasoning and four times more likely to identify missing context.

Again, association is not causation. More careful users may naturally write longer conversations, and complex tasks may demand more turns. Still, iteration gives you a practical structure for doing the evaluation that a polished first answer can suppress.

Treat the first output as a hypothesis and a working draft. Do not restart with a completely new prompt unless the direction is fundamentally wrong. Point to one claim, one section, or one decision and ask what assumptions support it, what evidence is missing, or what alternative would change the recommendation.

Make each follow-up do a different job. One turn can clarify the goal. Another can expose missing context. A third can test the strongest claim against evidence. A fourth can compare options under the same criteria. This creates progress instead of a loop of cosmetic rewrites.

Stop iterating when the acceptance criteria are met, the remaining uncertainty is visible, and the next action belongs outside the chat. More turns are not automatically more fluent. The goal is a better decision, not a longer transcript.

First, treat the first response as a starting point instead of a finish line.

Second, give each follow-up one distinct evaluation job.

Third, stop when acceptance criteria and remaining uncertainty are explicit.

### 4 | Set the Terms

Iteration works better when the collaboration has rules. Anthropic found that only thirty percent of conversations told Claude how the user wanted it to interact. Most people specified the task but left challenge, explanation, and uncertainty behavior implicit.

Set those terms before the first answer. Tell the AI to push back when an assumption conflicts with evidence. Ask it to name missing inputs before filling gaps. Require a brief rationale and the sources or observations that support consequential claims.

Also define how uncertainty should appear. The AI can separate established facts, interpretations, and open questions. It can state confidence, show which input would change the conclusion, and stop when a missing permission or source would make continued work unsafe.

Then define acceptance. A draft is not done because it has all the requested sections. It is done when it matches the audience, respects the constraints, supports important claims, passes the relevant tests, and makes unresolved items visible.

These instructions do not require a giant prompt. A compact collaboration contract can fit in four lines: challenge weak assumptions, surface missing context, support important claims, and mark uncertainty. Add task-specific acceptance criteria underneath.

The contract changes the relationship. Instead of asking the AI to sound confident, you ask it to make confidence inspectable. Instead of rewarding immediate completion, you reward an output that helps you see where judgment is still required.

First, tell the AI when to challenge assumptions and ask for context.

Second, require visible grounds, uncertainty, and stop conditions.

Third, define acceptance in terms of evidence and use rather than completeness.

### 5 | Inspect the Work

Now inspect the artifact itself. Begin with goal fit. Restate the decision or outcome in one sentence, then ask whether every major section contributes to it. A polished detour is still a detour.

Next, inspect gaps. What information did the AI not have? Which assumptions were inferred from generic patterns? What stakeholder, timeframe, region, dataset, dependency, or constraint could change the result? Make the missing context a visible list.

Then inspect grounds. For factual claims, open the source and check relevance, date, method, and wording. For recommendations, separate evidence from interpretation. For calculations, reproduce the key numbers. For code, trace the risky path instead of trusting the demo.

After that, exercise the output. Run the code. Try the workflow with an edge case. Compare the summary against the source. Ask a colleague from the affected team to review the draft. Evaluation that happens outside the chat is still part of AI fluency, even though the study could not observe it.

Finally, inspect consequences. The report measured only eleven of twenty four framework behaviors because responsibility, disclosure, and downstream use often happen outside the interface. Someone must still decide whether the result is safe, appropriate, and ready to release.

The review depth should match the stakes. A brainstorming sketch may need a quick gap check. A customer promise, financial model, production change, or legal analysis needs traceable evidence, real tests, and a named human owner.

First, confirm that the artifact serves the actual goal and constraints.

Second, verify missing context, evidence, calculations, and behavior through appropriate tests.

Third, match review depth to stakes and keep a named human owner.

### 6 | Review Loop

Combine the method into one High-Quality Collaboration Turn Checklist. It has five passes: Goal, Gaps, Grounds, Test, and Owner. Use it whenever an AI output looks ready enough to tempt immediate acceptance.

Pass one is Goal. Write the intended decision, audience, and acceptance criteria beside the output. Mark any section that does not help that goal or that quietly changes the scope.

Pass two is Gaps. List missing inputs, inferred assumptions, unresolved conflicts, and uncertainty. Ask the AI which missing item is most likely to change the result, then obtain that input or preserve the limitation.

Pass three is Grounds. Trace important claims to evidence, calculations, rules, or observable behavior. Distinguish what the source establishes from what the AI or reviewer infers. Confidence must be earned claim by claim.

Pass four is Test. Exercise the deliverable in the environment where it will be used. Run, compare, sample, simulate, or review it with the affected people. A functional-looking artifact becomes trustworthy only after relevant failure modes have been tried.

Pass five is Owner. Record who accepts the remaining risk, who can approve release, and what signal would require rollback or revision. The checklist ends with a decision, not with another request for prettier wording.

First, check Goal and Gaps before refining the presentation.

Second, check Grounds and Test before trusting the result.

Third, finish with an Owner who can accept, revise, or stop the work.

### 7 | Summary

A polished AI output is useful because it can accelerate real work. It is risky when appearance convinces us that judgment is no longer needed.

First, remember the warning in Anthropic's data: artifact conversations showed more direction and iteration, but less visible checking of context, facts, and reasoning.

Second, treat the first output as a starting point. Use focused follow-ups to expose assumptions, strengthen evidence, compare alternatives, and make uncertainty explicit.

Third, set the collaboration terms in advance. Ask for challenge, context, grounds, uncertainty, and acceptance criteria instead of confident completion alone.

Finally, run the five-pass checklist: Goal, Gaps, Grounds, Test, and Owner. If any pass is vague, the work may look finished, but the collaboration turn is not finished yet.

Follow Tiny Agent. Tiny Agent helps you get better at using AI.
