#!/usr/bin/env bash
set -euo pipefail

SRC="$(cd "$(dirname "$0")/skill" && pwd)"
DEST="${HOME}/.claude/skills/design-spec"

mkdir -p "$(dirname "$DEST")"
if [ -e "$DEST" ] && [ ! -L "$DEST" ]; then
  echo "Backing up existing $DEST -> ${DEST}.bak"
  rm -rf "${DEST}.bak"
  mv "$DEST" "${DEST}.bak"
fi
rm -rf "$DEST"
cp -R "$SRC" "$DEST"
echo "Installed design-spec skill to $DEST"
echo "Contents:"
ls "$DEST"
