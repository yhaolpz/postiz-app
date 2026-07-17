# Tiny Agent Whiteboard Motion System

## Style Prompt

Keep the existing Tiny Agent whiteboard identity intact: generated character art remains the visual source of truth, while motion behaves like a confident editor drawing attention with marker strokes, precise reframing, and short kinetic labels. The result should feel clearer and more alive, never like a SaaS dashboard or a replacement illustration system.

## Concept Angle

Treat each frame as a living whiteboard: the canonical generated drawing stays untouched while marker motion guides the viewer's eye to the idea that matters now.

## Colors

- Board: `#FCFDFC`
- Ink: `#111413`
- Tiny Agent blue: `#1597EA`
- Warning red: `#F04438`
- Soft structural gray: `#D9E1DE`

## Typography

- Headlines and brand: `Montserrat`, weights `700` and `900`
- Captions and production metadata: `IBM Plex Mono`, weights `400` and `700`

## Motion

- Fast marker-like entrances using `expo.out`, `power4.out`, and restrained `back.out(1.4)`.
- Generated art uses one fixed-center `1.000x` to `1.035x` push per scene.
- Scene changes use a short saturated-blue marker wipe; no empty pre-transition frames.
- Titles, captions, progress, and metadata stay independent from art zoom.

## What NOT to Do

- Do not redraw the engineer or Tiny Agent with HTML, SVG, Canvas, or CSS.
- Do not use dark, neon, gradient, glass, or 3D visual language.
- Do not move or scale the caption frame with the generated art.
- Do not add dense UI panels, card grids, or small web-sized labels.
- Do not put critical content below `y=1430`.
