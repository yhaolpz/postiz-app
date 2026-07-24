#!/usr/bin/env bash
# Optional Codex Cloud maintenance script. Paste this command into the
# environment's maintenance-script field.
set -euo pipefail

export PATH="$HOME/.local/bin:$PATH"
corepack enable
corepack prepare pnpm@10.6.1 --activate

# A resumed cache may predate a lockfile change. Fetch only; production runs
# remain explicit through run-tiny-agent-longform-cloud.mjs.
pnpm fetch --frozen-lockfile
pnpm dlx --package hyperframes@0.7.68 hyperframes --version
