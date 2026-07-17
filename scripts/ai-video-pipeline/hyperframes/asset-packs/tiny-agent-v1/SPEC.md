# Tiny Agent Animation Asset Pack v1

## Purpose

Provide clean, reusable raster assets for HyperFrames compositions without cropping characters or props out of completed scene illustrations.

## Visual Contract

- Preserve the approved Tiny Agent whiteboard identity: thick black marker outlines, white fills, sparse blue and red accents.
- Use the same Chinese software engineer and Tiny Agent robot identity across every pose.
- Keep every subject isolated on a transparent background with no floor, shadow, caption, label, scenery, or attached prop unless the asset itself is a prop.
- Keep pose scale, stroke weight, head-to-body ratio, face, clothing, tool belt, and robot proportions stable across cells.
- Leave clear padding around every subject so motion blur, overshoot, and rotation do not clip.

## Sprite Order

### Human - 3 columns x 2 rows

1. `idle`
2. `point-right`
3. `think`
4. `approve`
5. `operate`
6. `surprised`

### Tiny Agent - 4 columns x 2 rows

1. `idle`
2. `search`
3. `receive-tool`
4. `execute`
5. `store-memory`
6. `recall-memory`
7. `success`
8. `failure`

### Props - 5 columns x 3 rows

1. `document`
2. `document-stack`
3. `search`
4. `browser`
5. `api-plug`
6. `database`
7. `memory`
8. `result-card`
9. `branch`
10. `loop`
11. `warning`
12. `success`
13. `error`
14. `tool`
15. `timeout`

## Release Gates

- Exact expected cell count and ordering.
- No duplicate, missing, merged, or clipped subjects.
- Transparent corners and no visible chroma-key fringe.
- Character identity and scale remain consistent across all poses.
- Human and Agent pose swaps preserve a stable foot registration point; props preserve a stable center registration point.
- No generated labels, grid lines, watermarks, scenery, or unrequested objects.
- Every cell has non-empty foreground coverage and sufficient transparent padding.
- Manifest dimensions and cell geometry match the exported PNG files.
- Human, Agent, and prop visual contact sheets pass manual inspection.
