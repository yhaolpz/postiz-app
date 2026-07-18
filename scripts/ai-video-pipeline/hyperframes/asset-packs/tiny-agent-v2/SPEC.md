# Tiny Agent Asset Pack v2 Specification

## Scope

Increase the durable visual vocabulary without coupling assets to one episode. The queued long-form topics inform coverage, while filenames and semantics remain useful for future research, product, operations, safety, memory, evaluation, and multi-agent content.

## Direction contract

- `left`: gesture, gaze, and body target the viewer's left.
- `right`: gesture, gaze, and body target the viewer's right.
- `front`: action remains readable without depending on either side.
- Direction is explicit metadata in `manifests/human.json` and `manifests/agent.json`; scene generation must not infer direction from filenames alone.

## Prop families

1. Context and knowledge: documents, media, code, data, and memory.
2. Tools and channels: terminal, email, chat, calendar, forms, dashboards, repositories, and integrations.
3. Workflow structure: tasks, branches, loops, queues, pipelines, handoffs, progress, dependencies, and agent topology.
4. Evidence and evaluation: results, tests, scorecards, citations, comparisons, trends, and targets.
5. Risk, decision, and reuse: approval, permissions, privacy, prompt injection, human gates, uncertainty, archiving, forgetting, skills, and teams.

## Release gates

- Exact inventory: 30 human, 40 Agent, and 75 prop PNGs.
- Stable canvas, alpha, transparent corners, padding, coverage, and registration anchors.
- Left/right labels match the visible direction from the viewer's perspective.
- Front-facing poses do not accidentally point to one side.
- Character identities, clothing/body construction, line weight, accent colors, and scale remain stable.
- Props remain legible at contact-sheet scale and avoid episode-specific text or branding.
- Every generated prop must retain at least `0.08` alpha coverage inside the central icon-body region; accent dots and underlines alone are an automatic failure.
- User approval of all three contact sheets was recorded on 2026-07-17; production may use v2 while preserving v1 as a fallback.
- Scene builders must load individual PNG paths and anchors from manifests, validate all selected ids before compilation, and never depend on sprite-sheet cell positions.
