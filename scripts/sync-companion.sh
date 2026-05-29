#!/usr/bin/env bash
# Pulls the latest @ux-companion/comments widget from netSkope/ux-companion
# and drops it at public/ux-companion.js. Run this before committing if the
# widget might have new changes you want to ship.
#
# Requires: git, and read access to netSkope/ux-companion.

set -euo pipefail

REPO_URL="https://github.com/netSkope/ux-companion.git"
WIDGET_PATH_IN_REPO="packages/comments/dist/widget.iife.js"
DEST="public/ux-companion.js"

tmpdir="$(mktemp -d -t ux-companion-sync-XXXXXX)"
trap 'rm -rf "$tmpdir"' EXIT

echo "→ Fetching latest widget from $REPO_URL"
git clone --depth 1 --quiet "$REPO_URL" "$tmpdir"

src="$tmpdir/$WIDGET_PATH_IN_REPO"
if [ ! -f "$src" ]; then
  echo "✗ Expected file not found in repo: $WIDGET_PATH_IN_REPO" >&2
  exit 1
fi

if [ -f "$DEST" ] && cmp -s "$src" "$DEST"; then
  echo "✓ public/ux-companion.js is already up to date."
  exit 0
fi

mkdir -p "$(dirname "$DEST")"
cp "$src" "$DEST"
echo "✓ Updated $DEST ($(wc -c < "$DEST" | tr -d ' ') bytes)."
echo "  Remember to commit the change."
