#!/usr/bin/env bash
set -euo pipefail

CHROME="${CHROME:-google-chrome}"
DIR="$(cd "$(dirname "$0")" && pwd)"
OUT="${1:-$DIR/../public/sample-receipt.png}"

"$CHROME" --headless=new --disable-gpu --hide-scrollbars \
  --force-device-scale-factor=2 --window-size=480,560 \
  --screenshot="$OUT" "file://$DIR/sample-receipt.html" >/dev/null 2>&1

echo "sample receipt -> $OUT"