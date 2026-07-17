# Tiny Agent Asset Pack v1

Reusable transparent PNG assets for the Tiny Agent HyperFrames video pipeline.

## Inventory

- Human: 6 poses on 512x512 canvases.
- Tiny Agent: 8 poses on 384x512 canvases.
- Props: 15 assets on 320x320 canvases.
- Individual PNGs and normalized sprite sheets are both included.

## Registration

- Human poses share a foot registration point at `(256, 472)`.
- Tiny Agent poses share a foot registration point at `(192, 456)`.
- Props share a center registration point at `(160, 160)`.

Position assets by their registration point when swapping poses. This prevents character jumps even when a pose extends an arm or changes its silhouette.

## Files

- `sprites/`: production PNGs and sprite sheets.
- `manifests/`: dimensions, sprite cells, semantic names, bounds, and anchors.
- `qa/`: contact sheets, manual review, and generated release report.
- `raw/`: chroma-key generation sources retained for regeneration.
- `generation-prompts.md`: source prompts used for the three generated sheets.

## Validation

Run from this directory:

```bash
node qa/validate-assets.mjs
```

The command regenerates manifests and QA reports, then exits non-zero if any automatic or manual release gate fails.
