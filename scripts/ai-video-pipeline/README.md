# AI video pipeline

Generates a vertical AI concept explainer video and optionally sends it to
Postiz Public API for YouTube, TikTok, and Facebook Reels publishing.

The default path has no video model dependency:

```text
topic -> script JSON -> Canvas frames -> local TTS -> FFmpeg MP4 -> Postiz Public API
```

## Chosen series style

The current direction is `Agent Sketchbook`: short AI Agent explainers for an
overseas TikTok and YouTube Shorts audience. Each video should explain one tiny
technical idea in 20-30 seconds with a fixed, low-distraction sketchbook look.

Style rules:

- Use a notebook / hand-drawn doodle style: warm paper background, black ink
  linework, sparse teal or yellow highlights, and simple arrows or diagrams.
- Keep a stable IP: a Chinese software engineer doodle plus a small `Tiny
  Agent` robot. These two characters should appear across the series.
- Keep on-screen text in English. Avoid Chinese text except for a tiny signature
  or intentional cultural detail.
- Do not use the polished colorful doodle style as the default. It can distract
  from the explanation unless the illustration quality is exceptional.
- For production videos, do not draw humans directly with Canvas. Use generated
  keyframes or reusable illustration assets, then let code handle subtitles,
  overlays, light pan/zoom, timing, audio, and FFmpeg composition.

Recommended production flow:

```text
topic/news -> script -> narration audio -> 2-3 keyframes for review ->
full keyframes -> subtitle/overlay layer -> FFmpeg MP4 -> manual preview ->
Postiz publish
```

The current Canvas renderer is still useful for mechanical smoke tests,
publishing checks, and layout experiments. It is not the final visual standard
for `Agent Sketchbook` production output.

## Run

For local publishing, Postiz needs the backend, Temporal, and the orchestrator
running. The generator refreshes near-expired local YouTube/TikTok access
tokens before it posts, registers the local Temporal search attributes, and
when `--wait` is used it also starts the matching local workflow if the backend
swallowed a Temporal start error.

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
  --voice en-US-BrianNeural \
  --rate '+8%' \
  --dry-run
```

Generate the planned video for a specific day:

```bash
node scripts/ai-video-pipeline/run.mjs \
  --plan-file scripts/ai-video-pipeline/content-plans/2026-07-agent-sketchbook.md \
  --date 2026-07-06 \
  --tts edge-tts \
  --voice en-US-BrianNeural \
  --rate '+8%' \
  --dry-run
```

Generate and publish through connected YouTube/TikTok/Facebook channels:

```bash
node scripts/ai-video-pipeline/run.mjs \
  --plan-file scripts/ai-video-pipeline/content-plans/2026-07-agent-sketchbook.md \
  --tts edge-tts \
  --voice en-US-BrianNeural \
  --rate '+8%' \
  --platform all \
  --skip-missing-platforms \
  --post \
  --visibility private \
  --media-mode serve \
  --wait
```

`private` maps to YouTube `private`, TikTok `SELF_ONLY`, and Facebook Reel
`DRAFT`. Use `--visibility public` only after reviewing the rendered MP4.

Useful publishing switches:

- `--platform both|all|youtube|tiktok|facebook`: limit which connected channel
  receives the post. A comma-separated list such as `youtube,tiktok,facebook`
  is also supported.
- `--micro`: generate a shorter 20-30 second script with one tiny point for
  TikTok and YouTube Shorts testing.
- `--tiktok-method DIRECT_POST|UPLOAD`: `UPLOAD` sends the video to TikTok inbox
  when Direct Post is not available for the app/account.
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
- `AI_VIDEO_TTS_PROVIDER`: `say`, `edge-tts`, or `openai`. `say` is free on
  macOS; `edge-tts` uses `uvx edge-tts` by default and is the recommended
  prototype voice for `Agent Sketchbook`.
- `AI_VIDEO_TTS_VOICE`: voice name for the selected TTS provider.
- `AI_VIDEO_TTS_RATE`: speech rate. For `edge-tts`, use values like `+8%`; for
  macOS `say`, use numeric words per minute like `188`.
- `AI_VIDEO_EDGE_TTS_COMMAND`: command used to run `edge-tts`, default `uvx`.
- `AI_VIDEO_MEDIA_MODE`: `serve` or `upload`. Use `serve` for local immediate
  publishing when the frontend upload host is not running. Use `upload` for a
  deployed Postiz instance with publicly reachable media URLs.
- `AI_VIDEO_PLATFORM`: `both`, `all`, `youtube`, `tiktok`, `facebook`, or a
  comma-separated list such as `youtube,tiktok,facebook`.
- `AI_VIDEO_TIKTOK_METHOD`: `DIRECT_POST` or `UPLOAD`.
- `AI_VIDEO_FACEBOOK_REEL_STATE`: `DRAFT`, `PUBLISHED`, or `SCHEDULED`.
  The automation defaults to `DRAFT` while the channel is still being reviewed.
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

Recommended rollout:

1. First 7 days: generate the planned video and publish only as private/draft
   where the platform allows it. Manually preview the MP4 before public release.
2. After the visual/audio/factual checks are consistently clean, switch the
   automation to public posting.

The automation command should use the plan file and the current Asia/Shanghai
date. For an immediate private Postiz run:

```bash
node scripts/ai-video-pipeline/run.mjs \
  --plan-file scripts/ai-video-pipeline/content-plans/2026-07-agent-sketchbook.md \
  --tts edge-tts \
  --voice en-US-BrianNeural \
  --rate '+8%' \
  --platform all \
  --skip-missing-platforms \
  --post \
  --visibility private \
  --media-mode serve \
  --wait
```

Use `--visibility public` only after the daily output quality is stable.

## Current platform notes

- YouTube requires a valid connected channel token. If Postiz returns
  `Token expired or invalid`, reconnect the YouTube channel in the dashboard and
  rerun the same command.
- TikTok Direct Post may be rejected for unaudited public accounts. In the
  current local account/app, TikTok returns
  `unaudited_client_can_only_post_to_private_accounts` while the account is
  public, even with `SELF_ONLY`. Direct Post did succeed after temporarily
  switching the TikTok account to private and posting with
  `--tiktok-method DIRECT_POST --visibility private`.
- If the TikTok account must remain public and the app is still unaudited, use
  `--tiktok-method UPLOAD --visibility private` to send the generated video to
  TikTok inbox first, then finish publishing in TikTok.
- `--media-mode serve` is only for immediate local publishing while this process
  is alive. For scheduled future posts, use a deployed/public media URL or a
  working Postiz upload host.
- Facebook Reels are published through a connected Facebook Page. Meta's Reels
  API is Page-scoped, not personal-profile scoped. The provider uses the
  official `video_reels` flow when `post_type` is `reel`.
