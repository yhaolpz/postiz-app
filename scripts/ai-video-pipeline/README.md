# AI video pipeline

Generates a vertical AI concept explainer video and optionally sends it to
Postiz Public API for YouTube, TikTok, and Facebook Reels publishing.

The default path no longer has a Canvas renderer fallback:

```text
topic -> script JSON -> generated image keyframes -> fixed title/subtitle overlays ->
PIL fixed-anchor affine zoom + short main-art white dissolves -> local TTS -> FFmpeg MP4 -> QA gates ->
Postiz Public API
```

## Chosen series style

The current direction is `Tiny Agent`: source-led AI Agent explainers for an
overseas TikTok and YouTube Shorts audience. Each video explains one focused
technical idea in 50-60 seconds with a fixed, low-distraction whiteboard
stick-figure look.

Style rules:

- Use the selected `A - whiteboard stick figure` style: clean white background,
  thick black marker linework, sparse blue/red highlights, and simple
  whiteboard diagrams.
- Keep a stable IP: a Chinese software engineer stick figure plus a friendly
  `Tiny Agent` robot. These two characters should appear across the series.
- Match the first published Tiny Agent character scale: the engineer, Tiny
  Agent, and core props should fill most of the main art area, not shrink into
  small icons.
- Keep the top title as `Tiny Agent` and use a large rounded subtitle box
  at the bottom.
- Keep on-screen text in English. Avoid Chinese text except for a tiny signature
  or intentional cultural detail.
- Do not use the previous notebook sketchbook style or the polished colorful
  doodle style as the default.
- Do not draw humans, Tiny Agent, whiteboard scenes, or final keyframes with
  Canvas/SVG/HTML/code. Use generated keyframes or explicitly provided image
  keyframes, then let code handle subtitles, overlays, fixed-anchor light
  pan/zoom, timing, audio, and FFmpeg composition.
- Use per-scene `Subtitle blocks` for the bottom caption box. Do not repeat the
  same formula or on-screen text across every scene.
- End every published episode with the user-value CTA: `Follow Tiny Agent.
  Learn one AI agent idea every day.` Do not use sourcing, citations, production
  process, or a next-episode teaser as the follow reason.

Recommended production flow:

```text
source material -> script -> narration audio -> 8-10 semantic keyframes ->
subtitle/overlay layer -> FFmpeg MP4 -> manual preview ->
Postiz publish
```

For Codex-run Tiny Agent automation, prefer Codex image generation for the
episode keyframes first, then save the approved images under
`var/ai-video-pipeline/provided-keyframes/<date>-<slug>/` and pass that
directory with `--keyframes-dir`. This path has produced the most consistent
engineer and Tiny Agent proportions. The Node runner itself cannot call the
Codex image generation tool directly, so non-Codex unattended runs still need
either pre-generated keyframes or a working `OPENAI_API_KEY`.

If image generation or provided keyframes are unavailable, the runner fails
instead of falling back to Canvas placeholders.

The runner also fails before publishing if any required QA gate fails:

- MP4 must be `1080x1920`, `30fps`, and `45-65s`; target `50-60s`.
- Tiny Agent uses the shared YouTube Shorts/TikTok/Facebook Reels balanced
  layout: all fixed layers are centered at `x=540`, the main art occupies
  `y=300-1110` with an `820x780` maximum, and its content bbox must cover at
  least `68%` of the full canvas width.
- The title baseline is `y=240`. The rounded subtitle box is
  `x=80-1000, y=1130-1430`, with centered `50px` text, `62px` line height, and
  at most two lines. Critical text, faces, and props must not extend below
  `y=1430`.
- Tiny Agent summaries must record `layoutStandard: cross-platform-balanced-v1`.
  `--reuse-video` rejects Tiny Agent videos whose summary is missing this
  release-layout marker, even if their codec and duration otherwise pass.
- MP4 must contain an audio stream, and the video must not run past the audio
  into a silent tail.
- Title and bottom subtitle overlays must stay fixed between segment start and
  end frames.
- Main art zoom must pass the fixed-center stability check on sampled
  consecutive frames.
- Multi-scene videos must use varied bottom subtitle blocks.
- Main art must pass the character-scale check, so the recurring engineer and
  robot remain close to the first-video proportions.

## Run

For local publishing, Postiz needs the backend, Temporal, and the orchestrator
running. The generator refreshes near-expired local YouTube/TikTok access
tokens before it posts, registers the local Temporal search attributes, and
when `--wait` is used it also starts the matching local workflow if the backend
swallowed a Temporal start error.

The renderer requires `python3` with Pillow available. It uses
`scripts/ai-video-pipeline/render-fixed-zoom.py` for subpixel fixed-anchor zoom;
this avoids the visible jitter caused by integer crop/zoom filters. Scene
changes use a short main-art-only fade through the whiteboard background, while
title and subtitle overlays stay fixed and unblended.

Publishing is attempted per platform. A TikTok token or workflow failure should
not prevent YouTube or Facebook from being queued. If TikTok Direct Post fails
after a post is created, the runner automatically retries TikTok with `UPLOAD`.
If TikTok refresh returns `invalid_grant`, the local integration is marked
`refreshNeeded`; reconnect the TikTok channel in Postiz, then rerun the same
date.

```bash
temporal server start-dev --db-filename var/temporal/dev.db --log-level warn

cd apps/orchestrator
../../node_modules/.bin/dotenv -e ../../.env -- \
  ../../node_modules/.bin/nest start --entryFile=./apps/orchestrator/src/main
```

Generate only:

```bash
pnpm ai-video:run -- --topic "MCP explained with one simple example"
```

Generate a 20-30 second micro lesson:

```bash
pnpm ai-video:run -- --micro --no-llm --topic "AI confidence is not truth"
```

Generate a prototype with a more natural free neural voice:

```bash
pnpm ai-video:run -- \
  --micro \
  --no-llm \
  --topic "An AI agent is not just a chatbot" \
  --tts edge-tts \
  --voice en-US-AnaNeural \
  --rate '+8%' \
  --dry-run
```

Generate the planned video for a specific day:

```bash
node scripts/ai-video-pipeline/run.mjs \
  --plan-file scripts/ai-video-pipeline/content-plans/2026-07-agent-sketchbook.md \
  --date 2026-07-06 \
  --tts edge-tts \
  --voice en-US-AnaNeural \
  --rate '+8%' \
  --dry-run
```

Generate and publish through connected YouTube/TikTok/Facebook channels:

```bash
node scripts/ai-video-pipeline/run.mjs \
  --plan-file scripts/ai-video-pipeline/content-plans/2026-07-agent-sketchbook.md \
  --tts edge-tts \
  --voice en-US-AnaNeural \
  --rate '+8%' \
  --platform all \
  --skip-missing-platforms \
  --post \
  --visibility private \
  --youtube-visibility public \
  --media-mode serve \
  --wait
```

Global `private` still maps TikTok to `SELF_ONLY`. Tiny Agent YouTube uploads
default to `public`, and Tiny Agent Facebook Reels default to `PUBLISHED`; use
`--youtube-visibility`, `AI_VIDEO_YOUTUBE_VISIBILITY`,
`--facebook-reel-state`, or `AI_VIDEO_FACEBOOK_REEL_STATE` to override a single
platform.

Useful publishing switches:

- `--platform both|all|youtube|tiktok|facebook`: limit which connected channel
  receives the post. A comma-separated list such as `youtube,tiktok,facebook`
  is also supported.
- `--micro`: generate a shorter 20-30 second script with one tiny point for
  TikTok and YouTube Shorts testing.
- `--tiktok-method DIRECT_POST|UPLOAD`: `UPLOAD` sends the video to TikTok inbox
  when Direct Post is not available for the app/account.
- `--tiktok-privacy PUBLIC_TO_EVERYONE|SELF_ONLY|MUTUAL_FOLLOW_FRIENDS|FOLLOWER_OF_CREATOR`:
  override TikTok Direct Post privacy. Tiny Agent plan entries default to
  `PUBLIC_TO_EVERYONE`.
- `--facebook-reel-state DRAFT|PUBLISHED|SCHEDULED`: override the Facebook
  Reels `video_state`. `DRAFT` creates a Page Reel draft and is reported as
  `DRAFT_CREATED`, not as a public Facebook publish.
- `--youtube-visibility public|private|unlisted`: override YouTube visibility
  without changing TikTok or Facebook behavior. Tiny Agent plan entries default
  to YouTube `public`.
- `--youtube-playlist-id`: add uploaded YouTube videos to this playlist ID.
- `--youtube-playlist-title`: find or create a YouTube playlist by title, then
  add uploaded videos to it. Tiny Agent plan entries default to `Tiny Agent`.
- `--youtube-playlist-privacy public|private|unlisted`: privacy used only when
  the playlist needs to be created. The default is `public`.
- `--image-model`: override the OpenAI image model used for generated
  keyframes.
- `--image-quality`: override generated keyframe quality.
- `--keyframes-dir`: use an existing directory of image keyframes instead of
  calling the image model.
- `--keyframe-files`: use a comma-separated list of image keyframes instead of
  calling the image model.
- `--reuse-video`: skip generation and publish an already approved local MP4.
  The runner reads the sibling `summary.json` when available, verifies the MP4
  with `ffprobe`, and keeps the original QA metadata in the new summary.
- `--reuse-summary`: optional summary JSON path for `--reuse-video`; defaults
  to `summary.json` beside the MP4.
- Tiny Agent `summary.json` files include the final `youtubeDescription` and
  fixed `youtubeTrackingUrl` used for YouTube publishing.
- `--skip-missing-platforms`: publish to connected channels and skip channels
  that are not connected yet.
- `--skip-token-refresh`: skip local YouTube/TikTok access-token refresh.
- `--skip-temporal-init`: skip local Temporal search-attribute preflight.
- `--skip-workflow-kick`: skip the local workflow fallback after API post
  creation.

## Configuration

The script loads `.env`, then environment variables, then CLI flags. Useful
variables:

- `POSTIZ_URL`: backend URL, usually `http://localhost:3000`.
- `POSTIZ_API_KEY`: Public API key. If omitted locally, the script reads the
  first organization from `DATABASE_URL`.
- `POSTIZ_YOUTUBE_INTEGRATION_ID`, `POSTIZ_TIKTOK_INTEGRATION_ID`, and
  `POSTIZ_FACEBOOK_INTEGRATION_ID`: optional. If omitted, the first enabled
  matching integrations are used.
- `AI_VIDEO_PLAN_FILE`: optional daily content-plan Markdown file. When set,
  the script reads the entry matching `AI_VIDEO_PLAN_DATE` or today's
  Asia/Shanghai date instead of generating a new script from `--topic`.
- `AI_VIDEO_PLAN_DATE`: optional planned date in `YYYY-MM-DD` format.
- `AI_VIDEO_YOUTUBE_VISIBILITY`: optional YouTube-only visibility override.
  Tiny Agent plan entries default to `public`; TikTok and Facebook still use the
  global visibility mapping unless their own settings are provided.
- `AI_VIDEO_YOUTUBE_PLAYLIST_ID`: optional playlist ID for YouTube uploads.
  When set, it takes precedence over playlist title lookup.
- `AI_VIDEO_YOUTUBE_PLAYLIST_TITLE`: optional playlist title for YouTube uploads.
  Tiny Agent plan entries default to `Tiny Agent` when this is unset.
- `AI_VIDEO_YOUTUBE_PLAYLIST_PRIVACY`: `public`, `private`, or `unlisted`; used
  only when the playlist title is missing and the runner creates it.
- `AI_VIDEO_IMAGE_MODEL`: image model for generated keyframes, default
  `gpt-image-1.5`.
- `AI_VIDEO_IMAGE_QUALITY`: image quality for generated keyframes, default
  `medium`.
- `AI_VIDEO_KEYFRAMES_DIR`: optional directory containing pre-generated
  `.png`, `.jpg`, `.jpeg`, or `.webp` keyframes. Files are sorted by name and
  copied into the run directory.
- `AI_VIDEO_KEYFRAME_FILES`: optional comma-separated list of keyframe image
  files. This takes precedence over `AI_VIDEO_KEYFRAMES_DIR`.
- `AI_VIDEO_REUSE_VIDEO`: optional local MP4 path to publish without
  regenerating video, audio, or keyframes.
- `AI_VIDEO_REUSE_SUMMARY`: optional summary JSON path used with
  `AI_VIDEO_REUSE_VIDEO`.
- `AI_VIDEO_TTS_PROVIDER`: `say`, `edge-tts`, or `openai`. `say` is free on
  macOS; `edge-tts` uses `uvx edge-tts` by default and is the recommended
  prototype voice for `Tiny Agent`.
- `AI_VIDEO_TTS_VOICE`: voice name for the selected TTS provider.
- Archived Chinese and English `edge-tts` samples and selection instructions live in `scripts/ai-video-pipeline/voice-catalogs/edge-tts/`.
- `AI_VIDEO_TTS_RATE`: speech rate. For `edge-tts`, use values like `+8%`; for
  macOS `say`, use numeric words per minute like `188`.
- `AI_VIDEO_EDGE_TTS_COMMAND`: command used to run `edge-tts`, default `uvx`.
- `AI_VIDEO_MEDIA_MODE`: `serve` or `upload`. Use `serve` for local immediate
  publishing when the frontend upload host is not running. Use `upload` for a
  deployed Postiz instance with publicly reachable media URLs.
- `AI_VIDEO_PLATFORM`: `both`, `all`, `youtube`, `tiktok`, `facebook`, or a
  comma-separated list such as `youtube,tiktok,facebook`.
- `AI_VIDEO_TIKTOK_METHOD`: `DIRECT_POST` or `UPLOAD`.
- `AI_VIDEO_TIKTOK_PRIVACY`: TikTok privacy level for Direct Post. Tiny Agent
  automation defaults to `PUBLIC_TO_EVERYONE`.
- `AI_VIDEO_FACEBOOK_REEL_STATE`: `DRAFT`, `PUBLISHED`, or `SCHEDULED`.
  Tiny Agent automation defaults to `PUBLISHED`; set this to `DRAFT` only for
  draft-safe Facebook tests.
- `AI_VIDEO_SKIP_MISSING_PLATFORMS`: set to `true` to publish to connected
  channels and skip channels that are not connected yet.
- `AI_VIDEO_SKIP_TOKEN_REFRESH`: set to `true` to skip local access-token
  refresh.
- `AI_VIDEO_SKIP_TEMPORAL_INIT`: set to `true` to skip local Temporal
  initialization.
- `AI_VIDEO_SKIP_WORKFLOW_KICK`: set to `true` to rely only on the backend to
  start workflows.

Outputs are written under `var/ai-video-pipeline/runs/`.

## Codex daily automation

The preferred source of truth for daily posting is Codex automation, not Postiz
calendar scheduling. Codex should generate the day's video from the content
plan, then call Postiz for immediate delivery to YouTube, TikTok, and Facebook
Reels.

Current rollout:

1. YouTube Tiny Agent uploads publish as `public` after the local MP4 QA gates
   pass, are added to the `Tiny Agent` playlist, and include the fixed tracking
   URL `https://indieseek.co/?utm_source=youtube&utm_campaign=tiny_agent` in the
   description. TikTok and Facebook captions do not include this URL.
2. Facebook Tiny Agent Reels publish as Page Reels with `video_state=PUBLISHED`.
3. TikTok Tiny Agent videos use Direct Post with `PUBLIC_TO_EVERYONE`. Public
   Direct Post failures are reported as failures and do not fall back to the
   inbox upload flow.

Every daily render must use the `cross-platform-balanced` release layout from
`scripts/ai-video-pipeline/style-guides/agent-sketchbook.md`. The approved
baseline is `var/ai-video-pipeline/runs/2026-07-11-cross-platform-balanced-preview-v2/video.mp4`.
Do not restore the older left-shifted safe-zone experiment or the old subtitle
box at `y=1530-1800`.

The automation should use the current Asia/Shanghai date and the matching entry
from `content-plans/2026-07-source-led-video-material.zh-CN.md`. It compiles that
review material into an English daily runner plan, preserving the verified
claim while using the fixed user-value CTA. Codex automation then generates and
inspects the day's 8-10 semantic keyframes, saves them as provided keyframes,
and runs Postiz publishing with that directory:

```bash
node scripts/ai-video-pipeline/run.mjs \
  --plan-file var/ai-video-pipeline/publish-plans/<YYYY-MM-DD>-source-led.en.md \
  --date <YYYY-MM-DD> \
  --keyframes-dir var/ai-video-pipeline/provided-keyframes/<YYYY-MM-DD-slug> \
  --tts edge-tts \
  --voice en-US-AnaNeural \
  --rate '+8%' \
  --platform all \
  --skip-missing-platforms \
  --post \
  --visibility private \
  --youtube-visibility public \
  --tiktok-method DIRECT_POST \
  --tiktok-privacy PUBLIC_TO_EVERYONE \
  --facebook-reel-state PUBLISHED \
  --media-mode serve \
  --wait
```

Keep the global visibility private only as a compatibility default for any
non-overridden platform; use platform-specific visibility/state/privacy flags
for public YouTube, TikTok, and Facebook delivery.

If a future run has already been manually approved, the daily automation can
skip regeneration and publish the approved MP4 directly:

```bash
node scripts/ai-video-pipeline/run.mjs \
  --plan-file var/ai-video-pipeline/publish-plans/YYYY-MM-DD-source-led.en.md \
  --date YYYY-MM-DD \
  --reuse-video var/ai-video-pipeline/runs/<approved-run>/video.mp4 \
  --platform all \
  --skip-missing-platforms \
  --post \
  --visibility private \
  --youtube-visibility public \
  --tiktok-method DIRECT_POST \
  --tiktok-privacy PUBLIC_TO_EVERYONE \
  --facebook-reel-state PUBLISHED \
  --media-mode serve \
  --wait
```

## Current platform notes

- YouTube requires a valid connected channel token. If Postiz returns
  `Token expired or invalid`, reconnect the YouTube channel in the dashboard and
  rerun the same command.
- TikTok Direct Post now defaults to public for Tiny Agent. If TikTok returns an
  app, account, token, or policy error, report that error and do not treat
  `UPLOAD` inbox delivery as a public publish.
- `--tiktok-method UPLOAD --visibility private` remains available only as a
  manual inbox/draft recovery path.
- If TikTok token refresh fails with `invalid_grant`, the refresh token has been
  revoked or expired. Reconnect TikTok in Postiz before retrying; Direct Post and
  Upload both require a valid access token.
- `--media-mode serve` is only for immediate local publishing while this process
  is alive. For scheduled future posts, use a deployed/public media URL or a
  working Postiz upload host.
- Facebook Reels are published through a connected Facebook Page. Meta's Reels
  API is Page-scoped, not personal-profile scoped. The provider uses the
  official `video_reels` flow when `post_type` is `reel`.
- When `AI_VIDEO_FACEBOOK_REEL_STATE` is `DRAFT`, Meta creates a draft Reel and
  may still return a Reel ID. The runner reports this as `DRAFT_CREATED`; it is
  not visible as a public Reel until it is finished/published in Meta or rerun
  with `PUBLISHED`.
