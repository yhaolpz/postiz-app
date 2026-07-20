---
colors:
  canvas: "#ECECEA"
  surface: "#ECECEA"
  ink: "#111413"
  accent: "#117ABD"
  danger: "#D93B3B"
  quiet: "#D8DAD5"
typography:
  display: "Arial Black, Arial, sans-serif"
  body: "Arial, Helvetica, sans-serif"
  mono: "SFMono-Regular, Menlo, Consolas, monospace"
spacing:
  side_safe: 80
  title_bottom: 300
  art_top: 300
  art_bottom: 1110
  caption_top: 1130
  caption_bottom: 1430
components:
  border: "4px solid #111413"
  radius: "32px"
  shadow: "10px 10px 0 rgba(17,20,19,0.12)"
---

## Overview

Tiny Agent native-motion Short experiment. The frame preserves the current whiteboard brand but uses stronger temporal development than the production keyframe pan/zoom baseline.

## The frame

- Canvas is always `1080x1920`, `#ECECEA`, matching the longform neutral paper-gray theme.
- Content title stays within `x=80-1000, y=0-300`; normal stages use `Make Agent Tasks Executable`.
- Main action stays within `x=80-1000, y=300-1110`.
- Realtime subtitle box stays within `x=80-1000, y=1130-1430` and displays at most two lines.
- Nothing critical appears below `y=1430`.

## Visual language

Use thick `#111413` marker-like borders, full-strength `#117ABD` for the current focal state, and scarce `#D93B3B` for ambiguity or failure. Use active Tiny Agent v2 PNG assets for brand characters and semantic props; do not redraw the character in HTML or SVG.

## Motion language

Reveal information on the narration cue using a single paused GSAP timeline. Prefer long-tail `power3` settles, continuous subject identity, and velocity-matched internal handoffs. Do not use autoplay, CSS animation, infinite loops, breathing cards, or late drifting camera moves.

## CTA

At exactly `33.468s`, hard-cut to the dedicated CTA page. Hide the episode title. Show `Follow Tiny Agent`, one large smiling Tiny Agent, and the complete line `Tiny Agent helps you get better at using AI.`.
