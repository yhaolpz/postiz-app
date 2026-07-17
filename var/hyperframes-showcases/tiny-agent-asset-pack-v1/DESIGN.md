# Tiny Agent Asset Pack Motion v2

## Visual Identity

Use the approved whiteboard Tiny Agent asset pack as the sole source for the engineer, Tiny Agent, and semantic props. HTML may provide layout, labels, connectors, subtitles, and motion, but must not redraw the supplied raster assets.

## Concept Angle

Treat the whiteboard as an executable Agent diagram: the engineer introduces each idea, the Tiny Agent changes state, and the exact document, tool, result, and memory assets visibly move through the system.

## Layout

- 1080x1920 at 30fps.
- Fixed `Tiny Agent` brand and episode title at the top.
- Main action stage remains inside `y=280-1110`.
- Subtitle box remains inside `x=80-1000, y=1130-1430`.
- No scene counters, progress bars, framework labels, or showcase metadata.
- Character pose swaps use the pack's shared foot registration points.

## Colors

- Board: `#FCFDFC`
- Ink: `#111413`
- Agent blue: `#1597EA`
- Warning red: `#F04438`
- Structural gray: `#D9E1DE`

## Motion

- Pose changes are short registered crossfades without camera movement.
- Props travel along simple two-stage paths and hold long enough to read.
- Connectors draw only after a prop reaches the Agent.
- Retrieval, execution, storage, and recall each have a distinct final state.
- Every scene ends in a readable composition before the next transition.
