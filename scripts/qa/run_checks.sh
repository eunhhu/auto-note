#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

mkdir -p evidence

{
  echo "timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo "cwd=$ROOT_DIR"
  echo "command=rtk bun run test:unit -- --run"
  rtk bun run test:unit -- --run
} > evidence/task-14-hardening.txt 2>&1

if rtk bun run test:e2e -- --project=chromium; then
  echo "e2e=ok" >> evidence/task-14-hardening.txt
else
  echo "e2e=failed" >> evidence/task-14-hardening.txt
fi
