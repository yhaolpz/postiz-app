# Source Review

- Publisher: OpenAI
- Canonical URL: https://openai.com/index/why-language-models-hallucinate/
- Published: 2025-09-05
- Official title: Why language models hallucinate
- Paper: Why Language Models Hallucinate, Kalai et al., 2025-09-04
- Verified for this run: 2026-07-23 Asia/Shanghai

## Confirmed findings

- Hallucinations are plausible but false statements, not merely awkward wording.
- Pretraining learns language distributions without a dependable true-or-false label for every statement. Rare arbitrary facts therefore remain difficult to recover from patterns alone.
- Accuracy-only evaluation rewards guessing because a lucky answer can earn credit while an abstention cannot.
- The cited SimpleQA comparison shows why accuracy and error rate must be read together: a small accuracy gain can coexist with a much larger error rate and much lower abstention.
- The proposed mitigation is to penalize confident errors more than appropriate uncertainty and to change mainstream evaluation incentives, not only add a separate hallucination benchmark.
- Some questions are inherently unavailable, ambiguous, or otherwise unanswerable. Appropriate uncertainty, clarification, or abstention is therefore a valid behavior.

## Boundaries

- The source explains statistical causes and evaluation incentives; it does not claim that every hallucination has one cause.
- The operational checklist in this video is a practical synthesis for AI Agent use. It is not presented as a verbatim OpenAI framework.
- Confidence labels in the video are qualitative. The source does not justify arbitrary numeric confidence for every task.
- The SimpleQA figures are a specific evaluation example and are not generalized into universal model rankings.
