#!/usr/bin/env bash
# Run TruffleHog against full git history. Install: brew install trufflehog
# Usage:
#   ./scripts/secret-scan-trufflehog.sh              # verified + unverified (human-readable)
#   ./scripts/secret-scan-trufflehog.sh --fail       # exit 1 if any *verified* leak (stricter in CI)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if ! command -v trufflehog >/dev/null 2>&1; then
  echo "TruffleHog not found. Install: brew install trufflehog" >&2
  echo "Docs: https://github.com/trufflesecurity/trufflehog" >&2
  exit 1
fi

if [[ "${1:-}" == "--fail" ]]; then
  shift || true
  exec trufflehog git "file://${ROOT}" --results=verified --fail "$@"
else
  exec trufflehog git "file://${ROOT}" --results=verified,unverified,unknown "$@"
fi
