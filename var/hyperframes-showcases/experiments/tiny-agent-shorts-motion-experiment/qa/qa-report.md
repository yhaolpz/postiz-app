# Tiny Agent Shorts Motion Experiment — QA

Status: **PASS**

## Locked baseline

- One English script, one `en-US-AnaNeural` `+20%` narration master, and one VTT master are shared byte-for-byte by A/B/C.
- `+20%` is the locked motion-experiment baseline only. Production Shorts use `+30%` from the next run and must regenerate both narration and VTT.
- Narration master: 38.808 seconds; all rendered MP4s: 38.848 seconds, including the normal AAC mux boundary.
- Realtime captions: 9 source cues compiled to 16 display cues, no more than 2 lines, minimum display time 1.048 seconds.
- Story structure: 7 content phases plus the fixed CTA phase.
- Fixed CTA begins at 33.468 seconds: `Follow Tiny Agent. Tiny Agent helps you get better at using AI.`

## Automated checks

All three variants passed HyperFrames strict runtime, lint, layout, frame-boundary, motion-continuity, and contrast checks with 0 errors and 0 warnings. Asset-plan validation passed against the active `tiny-agent-v2` pack.

`ffprobe` confirmed for every MP4:

- H.264 video, 1080×1920, 30 fps.
- AAC stereo audio, 48 kHz.
- 38.848-second duration, inside the 30–45 second experiment range.

## Visual checks

- Full-resolution semantic frames and 270×480 phone previews are readable and uncropped.
- Content title and realtime captions stay inside the current safe areas.
- No face, subtitle, key prop, or conclusion text appears below y=1430.
- Background is the longform-aligned `#ECECEA` neutral paper-gray; primary ink remains `#111413`.
- The last content frame at 33.433 seconds still shows the lesson. The 33.500-second frame is already the dedicated CTA page, with the episode title removed and the complete follow heading, smiling Tiny Agent, and benefit line present.

## Evidence

- Source keyframe contact sheets: `../contact-sheets/`
- Rendered MP4 contact sheets: `a-rendered-contact-sheet.png`, `b-rendered-contact-sheet.png`, `c-rendered-contact-sheet.png`
- Machine-readable results: `qa-report.json`

No video was uploaded, scheduled, or published. The production automation only received the separately requested long-term rule updates for `+30%`, realtime captions, `#ECECEA`, and the fixed CTA; no A/B/C experiment implementation, content plan, archive, or active asset pack was connected to production.
