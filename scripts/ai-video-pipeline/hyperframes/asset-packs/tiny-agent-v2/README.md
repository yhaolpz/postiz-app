# Tiny Agent Asset Pack v2

Expanded whiteboard asset pack for Tiny Agent long-form videos. This is the active production pack. `tiny-agent-v1` remains available only as a compatibility fallback.

## Inventory

- Human: 30 poses (`5x` the v1 count), including explicit left, right, and front-facing actions.
- Tiny Agent: 40 poses (`5x` the v1 count), including directional execution and front-facing reasoning, evaluation, recovery, and coordination states.
- Props: 75 assets (`5x` the v1 count), grouped into context, tools, workflow, evaluation, and risk/reuse families.
- Total: 145 production PNGs plus normalized sprite sheets.

## Registration

- Human: 512x512, foot registration `(256, 472)`.
- Tiny Agent: 384x512, foot registration `(192, 456)`.
- Props: 320x320, center registration `(160, 160)`.

The scene builder must load individual asset paths from the manifests and choose a pose by semantic action plus viewer-relative direction. If content is on the left, use a `left` pose; if content is on the right, use a `right` pose; when direction is irrelevant or the layout may change, prefer a `front` pose. Do not infer direction by mirroring a PNG, and do not rely on sprite-sheet cell positions.

Future long-form projects prepare this pack with:

```bash
node scripts/ai-video-pipeline/hyperframes/prepare-tiny-agent-assets.mjs --project <project-directory>
```

Build scripts should use `scripts/ai-video-pipeline/hyperframes/tiny-agent-assets.mjs` to load manifests and validate every `scene-plan.json` asset id before compiling HTML.

## Build and QA

```bash
node tools/normalize-characters.mjs
node tools/build-props.mjs
node tools/build-sheets.mjs
node qa/validate-assets.mjs
```

Reference contact sheets:

- `qa/human-contact-sheet.png`
- `qa/agent-contact-sheet.png`
- `qa/props-contact-sheet.png`
- `qa/report.md`

The user approved this pack on 2026-07-17. Automatic QA includes a dedicated icon-body check so decorative dots and underlines cannot pass as complete props. Automatic and manual gates must both remain `PASS` before the active registry points to it.
