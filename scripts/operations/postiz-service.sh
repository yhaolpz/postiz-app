#!/bin/zsh
# Local launchd entry point. No credentials are copied out of the existing .env.
set -eu
export PATH=/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin
cd /Volumes/SSD/Workspace/postiz-app
case "${1:-}" in
  temporal)
    exec /opt/homebrew/bin/temporal server start-dev --db-filename /Volumes/SSD/Workspace/postiz-app/var/temporal/dev.db --ip 127.0.0.1
    ;;
  backend|orchestrator|frontend)
    while ! /usr/bin/nc -z 127.0.0.1 5432 >/dev/null 2>&1 || ! /usr/bin/nc -z 127.0.0.1 6379 >/dev/null 2>&1 || ! /opt/homebrew/bin/temporal operator cluster health --address 127.0.0.1:7233 >/dev/null 2>&1; do
      sleep 5
    done
    if [[ "$1" == orchestrator ]]; then
      export ORCHESTRATOR_PORT=3012
    fi
    exec /opt/homebrew/bin/pnpm run "start:prod:$1"
    ;;
  *) print -u2 'Expected temporal, backend, orchestrator, or frontend'; exit 64 ;;
esac
