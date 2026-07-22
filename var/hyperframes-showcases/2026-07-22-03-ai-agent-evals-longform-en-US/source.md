# Source

- Publisher: Anthropic
- Title: Demystifying evals for AI agents
- Published: 2026-01-09
- Canonical URL: https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
- Verified for this run: 2026-07-22T03:05:00+08:00

## Confirmed source claims

- Agent evals are harder than single-turn evals because Agents use tools over many turns, modify state, and adapt to intermediate results.
- A task has inputs and success criteria; an attempt is a trial; graders score performance; a transcript records the trajectory; the outcome is the final environment state.
- The model and Agent harness should be evaluated together because instructions, tools, state, and orchestration affect performance.
- Agent evaluation commonly combines code-based, model-based, and human graders, selected by the dimension being measured.
- Capability evals measure what an Agent can do, while regression evals protect behaviors it should continue to perform reliably.
- Non-deterministic behavior requires multiple trials. Pass at k measures whether at least one attempt succeeds; pass to the k measures whether all attempts succeed.
- Initial datasets can start with a few dozen realistic tasks drawn from manual checks, support issues, and real failures.
- Tasks should be unambiguous, balanced, solvable, and paired with a reference solution that verifies the grader.
- Stable, isolated environments reduce correlated failures and prevent shared state from contaminating results.
- Reading transcripts is necessary to distinguish Agent mistakes from ambiguous tasks, harness constraints, or faulty graders.
- Evals complement production monitoring, user feedback, A/B tests, manual transcript review, and systematic human studies.

## Boundaries preserved in the video

- A completion message is not treated as proof; final-state evidence is required when the task changes external state.
- Deterministic graders are preferred for objective checks but are not assumed to cover subjective quality.
- Model graders are not treated as ground truth; they require clear rubrics and human calibration.
- Process grading is used only for essential safety or behavioral constraints, not to force one valid tool path.
- Repeated trials reveal variation but do not remove the need to inspect task quality and environment stability.
- The video adapts the source into an operational acceptance sheet; the exact sheet structure is a Tiny Agent synthesis, not a verbatim Anthropic template.

## Reusable artifact

AI Agent Acceptance Sheet: outcome, task setup, final-state evidence, grader mix, repeated-trial reliability, eval health, exceptions, and release decision.
