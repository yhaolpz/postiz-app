# Tiny Agent 4D AI fluency — Chinese long-form explainer

## Format

- Canvas: 1920 x 1080, 16:9, 30 fps.
- Target: a complete Chinese explainer that turns four AI fluency abilities into a reusable task loop and scorecard.
- Voice: `zh-CN-YunxiaNeural` at the fixed production rate `+50%` (nominal 1.5x).

## Visual hierarchy

1. The engineer and Tiny Agent remain the recurring subjects, while their scale and position change with the semantic layout.
2. Every substantive chapter opens with a numbered title/value card and closes with a spoken, three-point numbered recap that only repeats covered material.
3. Each body state carries one complete idea or several consecutive sentences; props do not change sentence by sentence.
4. Hero, process, comparison, grid, and focus layouts alternate; mirrorable layouts also alternate their visual axis so characters and evidence do not stay on one side throughout the video.
5. On-screen text is limited to the Tiny Agent brand, one short topic title, subtitles, short prop labels, chapter cards, and substantive chapter names.
6. The edge-to-edge 52 px chapter rail uses actual narration timings and unnumbered chapter labels.
7. The full-video summary hard-cuts at the fixed CTA VTT start to the approved dedicated paper-gray outro; the masthead, summary, subtitles, and chapter rail disappear on that frame.
8. Props are laid out inside their logical container, not from the total scene count. A two-prop group uses equal-sized icons on one baseline, and a non-directional three-prop group forms an equilateral triangle around the container center. Diagonal placement requires directional or causal meaning.
9. Every body scene is constrained to the shared safe area, then translated as one composition toward the perceptual center. Compile-time visible-bounds estimates and rendered-pixel saliency checks must both pass before rendering.
10. The callout owns a separate title lane. Actors, props, connectors, and comparison panels begin at least 24 px below the measured title bottom.
11. Prop entrances come only from explicit narration triggers in `animation-plan.json`. Props that explain one phrase enter together; sequential entrances are reserved for spoken steps, and every beat keeps at least one second of readable hold time.

## Style

- Neutral paper-gray `#ECECEA` board and panels, faint 48 px grid, near-black marker lines, blue structure accents, yellow decisions, and red warnings.
- PingFang SC for Chinese copy; Inter only for the Tiny Agent brand.
- No source label, title underline, subtitle label, dense tables, decorative cards, continuous camera zoom, or slide chrome. Chapter numbers appear only in chapter cards and the bottom rail.
- Body transitions use a 0.48-0.54 second short-distance push plus mask reveal; chapter changes use a restrained 0.74 second bottom-up cover reveal. Every incoming actor, title, panel, and chapter-card element is primed to its hidden start state before the mask begins, then moves monotonically to rest. Outgoing scenes are removed after the reveal instead of fading independently.
- Character entrances use only an 8-10 px rise and opacity change over roughly 0.56 seconds. Per-scene character scale animation is prohibited because the transition mask already provides the primary motion.
- Props and relationships enter at VTT-derived semantic cue points rather than generic fractional timings. Key ideas receive targeted emphasis rather than a whole-scene zoom.
- Connector lines terminate at manifest-derived visible icon bounds; they never run through transparent icon centers, and focus rings are omitted unless they encode a real state.
- Body-scene balance uses the shared target `(960, 470)`, above the full-frame geometric center to account for subtitles and the chapter rail. The source gate allows at most `160 px` horizontal and `100 px` vertical offset; the rendered-pixel gate tightens the horizontal limit to `150 px`.
- The masthead is hidden during chapter cards and chapter recaps so those states remain visually clean.
- The final TTS and VTT are generated before visual timing. Paragraph boundaries, scene boundaries, prop beats, recap points, and the CTA anchor are then written to `timing-map.json` and used to compile the video.
- Narration is the pacing source. There is no background music or decorative sound effect.
- `animation-plan.json` is resolved against the final caption timeline. Missing triggers, duplicate prop assignments, unassigned props, timing-order regressions, and proportional fallback timing are compile errors.
- `pnpm run check:transitions` must report that every actor was primed before content reveal and that no delayed actor `fromTo` remains.
