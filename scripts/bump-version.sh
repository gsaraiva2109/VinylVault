#!/usr/bin/env bash
# bump-version.sh — bump version files without committing or tagging.
#
# Use this when you want the version bump inside your feature commit.
# Use release.sh instead for a separate, atomic release commit + tag.
#
# Usage:
#   ./scripts/bump-version.sh patch        # 1.0.0 → 1.0.1
#   ./scripts/bump-version.sh minor        # 1.0.0 → 1.1.0
#   ./scripts/bump-version.sh major        # 1.0.0 → 2.0.0
#   ./scripts/bump-version.sh 1.2.3        # explicit version
#   ./scripts/bump-version.sh patch --dry-run

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

BUMP="${1:-}"
DRY_RUN=false
for arg in "$@"; do
  [[ "$arg" == "--dry-run" ]] && DRY_RUN=true
done

if [[ -z "$BUMP" || "$BUMP" == "--dry-run" ]]; then
  echo "Usage: ./scripts/bump-version.sh [patch|minor|major|X.Y.Z] [--dry-run]"
  exit 1
fi

CURRENT="$(cat VERSION)"
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"

case "$BUMP" in
  major) NEW="$((MAJOR + 1)).0.0" ;;
  minor) NEW="${MAJOR}.$((MINOR + 1)).0" ;;
  patch) NEW="${MAJOR}.${MINOR}.$((PATCH + 1))" ;;
  [0-9]*)
    if ! [[ "$BUMP" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
      echo "Error: '$BUMP' is not a valid semver (expected X.Y.Z)"
      exit 1
    fi
    NEW="$BUMP"
    ;;
  *)
    echo "Error: bump type must be patch, minor, major, or X.Y.Z"
    exit 1
    ;;
esac

echo ""
echo "  ${CURRENT}  →  ${NEW}  (${BUMP})"
echo ""

if $DRY_RUN; then
  echo "[dry-run] No changes made."
  exit 0
fi

# ── Update version files ──────────────────────────────────────────────────────

echo "$NEW" > VERSION

sed -i "0,/^version = \"[0-9]*\.[0-9]*\.[0-9]*\"/{s/^version = \"[0-9]*\.[0-9]*\.[0-9]*\"/version = \"${NEW}\"/}" \
  desktop/src-tauri/Cargo.toml

tmp="$(mktemp)"
jq --arg v "$NEW" '.version = $v' desktop/src-tauri/tauri.conf.json > "$tmp"
mv "$tmp" desktop/src-tauri/tauri.conf.json

sed -i "s/version: '[0-9]\+\.[0-9]\+\.[0-9]\+'/version: '${NEW}'/" \
  api/src/swagger.ts

sed -i "s/version=\"[0-9]\+\.[0-9]\+\.[0-9]\+\"/version=\"${NEW}\"/" \
  desktop/sidecar/main.py

for pkg_json in web/package.json desktop/package.json api/package.json; do
  if [ -f "$pkg_json" ]; then
    tmp="$(mktemp)"
    jq --arg v "$NEW" '.version = $v' "$pkg_json" > "$tmp"
    mv "$tmp" "$pkg_json"
  fi
done

# ── Done ──────────────────────────────────────────────────────────────────────

echo "Updated to v${NEW}. Stage and commit:"
echo ""
echo "  git add VERSION \\"
echo "    desktop/src-tauri/Cargo.toml \\"
echo "    desktop/src-tauri/tauri.conf.json \\"
echo "    api/src/swagger.ts \\"
echo "    desktop/sidecar/main.py \\"
echo "    web/package.json \\"
echo "    desktop/package.json \\"
echo "    api/package.json"
echo ""
echo "  # Then tag to trigger CI/CD:"
echo "  git tag v${NEW}"
echo "  git push origin HEAD:refs/heads/main \"refs/tags/v${NEW}\""
