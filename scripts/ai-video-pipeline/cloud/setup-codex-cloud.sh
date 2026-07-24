#!/usr/bin/env bash
# Paste `bash scripts/ai-video-pipeline/cloud/setup-codex-cloud.sh` into the
# setup-script field of the repository's Codex Cloud environment.
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive
export PATH="$HOME/.local/bin:$PATH"

if ! command -v apt-get >/dev/null 2>&1; then
  echo "Codex Cloud setup requires an apt-based universal image." >&2
  exit 1
fi

apt-get update
apt-get install -y --no-install-recommends \
  ffmpeg \
  imagemagick \
  librsvg2-bin \
  python3-pip \
  python3-venv

corepack enable
corepack prepare pnpm@10.6.1 --activate

# The video build invokes `uvx edge-tts` and pinned HyperFrames releases.
# Install the launchers while setup has network access, then cache their tools.
python3 -m pip install --user --upgrade uv
uv tool install edge-tts

pnpm dlx --package hyperframes@0.7.68 hyperframes --version

# HyperFrames checks use Chromium through Playwright. The browser dependency is
# deliberately installed in setup, not lazily while the agent is rendering.
pnpm dlx playwright@1.55.0 install --with-deps chromium

cat >> "$HOME/.bashrc" <<'EOF'
export PATH="$HOME/.local/bin:$PATH"
EOF

echo "Codex Cloud Tiny Agent runtime is ready."
