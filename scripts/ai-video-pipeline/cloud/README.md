# Tiny Agent Codex Cloud production

Codex Cloud can generate a Tiny Agent project from a GitHub checkout, but it must not publish or access the local Postiz instance. This directory provides the reproducible setup and the production-only runner.

## One-time Cloud environment

1. Connect `yhaolpz/postiz-app` in [Codex Cloud](https://chatgpt.com/codex) and create an environment in [Codex environment settings](https://chatgpt.com/codex/settings/environments).
2. Use the Universal image with Node `22` and Python `3.12` (or newer compatible versions).
3. Paste this setup command into the environment's **Setup script** field:

   ```bash
   bash scripts/ai-video-pipeline/cloud/setup-codex-cloud.sh
   ```

4. Optionally paste this into **Maintenance script**:

   ```bash
   bash scripts/ai-video-pipeline/cloud/maintenance-codex-cloud.sh
   ```

5. Enable **limited agent internet access** for `speech.platform.bing.com` and add the non-secret environment variable `TINY_AGENT_CLOUD_NETWORK_ENABLED=1`. The `edge-tts` production step needs that connection. Do not add Postiz credentials, `DATABASE_URL`, Google OAuth credentials, or a local URL as Cloud secrets.

Cloud setup runs with internet access, but agent commands are offline by default. The runner refuses to start TTS unless the explicit environment switch is present, so a Cloud chat cannot silently turn an offline production job into an online one.

## Run a project

In a Cloud chat, after the new episode's script and project files are ready:

```bash
node scripts/ai-video-pipeline/cloud/run-tiny-agent-longform-cloud.mjs \
  --project var/hyperframes-showcases/<episode-project>
```

The runner validates the active longform profile, creates fresh TTS/VTT, compiles, runs production/layout/HyperFrames checks, renders the MP4, and writes `cloud-production-manifest.json` beside the output. It never imports a Postiz module or calls a social-media API.

## Delivery boundary

1. Download the rendered MP4, VTT, covers, metadata and `cloud-production-manifest.json` from the completed Cloud task.
2. Inspect the local artifacts on the Mac.
3. For English only, use the existing local Postiz flow to publish and verify YouTube.
4. Keep Chinese videos local. Never open, prefill, or upload to a Chinese platform.

## What belongs where

| Stage | Cloud | Local Mac |
| --- | --- | --- |
| Source research, scripts, scene plans, TTS/VTT, QA, rendering | Yes | Optional recovery path |
| Local Postiz, connected IndieSeek YouTube account, publish verification | No | Yes |
| Chinese platform operation | No | No |

Do not configure `POSTIZ_URL`, `DATABASE_URL`, browser-session data, YouTube tokens, or any publishing credential in the Cloud environment. Cloud renders production artifacts; local Postiz remains the only publishing boundary.
