#!/usr/bin/env bash
set -euo pipefail

SRC="$(cd "$(dirname "$0")/skill" && pwd)"
DEST="${HOME}/.claude/skills/design-spec"
# Backups live OUTSIDE ~/.claude/skills so they are never loaded as a second skill.
BACKUP_DIR="${HOME}/.claude/.design-spec-backups"

if [ -e "$DEST" ] && [ ! -L "$DEST" ]; then
  mkdir -p "$BACKUP_DIR"
  BACKUP="${BACKUP_DIR}/design-spec-$(date +%Y%m%d-%H%M%S)"
  # Never mv onto an existing path: mv would nest the backup inside it.
  suffix=1
  while [ -e "$BACKUP" ]; do
    BACKUP="${BACKUP_DIR}/design-spec-$(date +%Y%m%d-%H%M%S)-${suffix}"
    suffix=$((suffix + 1))
  done
  echo "Backing up existing $DEST -> $BACKUP"
  mv "$DEST" "$BACKUP"
  # Keep the 3 most recent backups; prune the rest.
  ls -1d "${BACKUP_DIR}"/design-spec-* 2>/dev/null | sort -r | tail -n +4 | while read -r old; do
    echo "Pruning old backup $old"
    rm -rf "$old"
  done
fi

mkdir -p "$(dirname "$DEST")"
rm -rf "$DEST"
cp -R "$SRC" "$DEST"
echo "Installed design-spec skill to $DEST"
echo "Contents:"
ls "$DEST"
