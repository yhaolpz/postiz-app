# Tiny Agent Asset Pack QA

- Status: **PASS**
- Assets: 29
- Checks: 214/214 passed
- Generated: 2026-07-17T09:33:43.310Z

## Automatic Gates

| Set | Sheet | Assets | Registration |
| --- | --- | ---: | --- |
| Human | 1536x1024 | 6 | feet (256, 472) |
| Tiny Agent | 1536x1024 | 8 | feet (192, 456) |
| Props | 1600x960 | 15 | center (160, 160) |

All dimension, alpha, corner, padding, coverage, registration, and chroma-residue checks passed.

## Manual Visual Gates

- **PASS** `human-pose-identity`: All six poses use the same character identity, clothing, line weight, scale, and grounded foot baseline.
- **PASS** `agent-pose-identity`: All eight poses preserve the same robot body, face screen, antenna, tool belt, colors, and grounded foot baseline.
- **PASS** `pose-readability`: Every human and Tiny Agent pose is visually distinct at contact-sheet scale.
- **PASS** `prop-readability`: All fifteen props are distinct, recognizable, and use the shared whiteboard visual language.
- **PASS** `visual-cleanliness`: No visible labels, watermarks, scenery, grid lines, clipped subjects, merged cells, or chroma fringe.

## Contact Sheets

- `human-contact-sheet.png`
- `agent-contact-sheet.png`
- `props-contact-sheet.png`
