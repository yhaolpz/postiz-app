# Tiny Agent Programmable Motion v1

## Visual Identity

Preserve the approved Tiny Agent whiteboard style. The existing generated engineer and robot remain the character source of truth. HyperFrames may crop, compose, move, mask, and crossfade those raster poses, but must not redraw either character.

## Concept Angle

Treat the whiteboard as an executable diagram: the characters react while documents, tools, and memory visibly move through the Agent.

## Layout

- 1080x1920, 30fps.
- Fixed top brand and episode title.
- Main action stage stays inside `y=300-1110`.
- Subtitle box stays inside `y=1130-1430`.
- No scene numbers, framework labels, showcase metadata, or progress UI.

## Colors

- Board: `#FCFDFC`
- Ink: `#111413`
- Agent blue: `#1597EA`
- Warning red: `#F04438`
- Structural gray: `#D9E1DE`

## Motion

- Pose swaps use short masked crossfades.
- Documents follow two-stage arcs and settle into the Agent.
- Tools travel to a stable port; the connector draws after contact.
- Memory cards enter a persistent bank and produce a retained-state result.
- Motion is synchronized to the existing VTT cue boundaries.
