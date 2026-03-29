#!/usr/bin/env bash
# release.sh — bump version, commit everything, tag, and push in one shot
#
# Usage:
#   ./scripts/release.sh patch            # 1.0.0 → 1.0.1
#   ./scripts/release.sh minor            # 1.0.0 → 1.1.0
#   ./scripts/release.sh major            # 1.0.0 → 2.0.0
#   ./scripts/release.sh 1.2.3            # explicit version
#   ./scripts/release.sh patch --dry-run  # preview only, no changes
#   ./scripts/release.sh patch --skip-ci-check
#
# Set FORGEJO_TOKEN env var for authenticated CI status checks.
#
# Workflow:
#   1. Stage your changes however you like (git add ...)
#   2. Run this script — it adds version files, commits everything, tags, and pushes

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# ── Args ──────────────────────────────────────────────────────────────────────
BUMP="${1:-}"
DRY_RUN=false
SKIP_CI_CHECK=false
for arg in "$@"; do
  [[ "$arg" == "--dry-run" ]]       && DRY_RUN=true
  [[ "$arg" == "--skip-ci-check" ]] && SKIP_CI_CHECK=true
done

if [[ -z "$BUMP" || "$BUMP" == "--dry-run" || "$BUMP" == "--skip-ci-check" ]]; then
  echo "Usage: $0 [patch|minor|major|X.Y.Z] [--dry-run] [--skip-ci-check]"
  exit 1
fi

# ── Compute new version ───────────────────────────────────────────────────────
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

# ── Check Forgejo CI status ───────────────────────────────────────────────────
if ! $SKIP_CI_CHECK && ! $DRY_RUN; then
  REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")
  if [[ "$REMOTE_URL" =~ ^https?:// ]]; then
    FORGEJO_BASE=$(echo "$REMOTE_URL" | sed 's|://[^@]*@|://|' | sed 's|\.git$||')
    REPO_PATH="${FORGEJO_BASE#*://*/}"
    FORGEJO_HOST="${FORGEJO_BASE%/$REPO_PATH}"
  elif [[ "$REMOTE_URL" =~ ^git@ ]]; then
    HOST_PART="${REMOTE_URL#git@}"
    FORGEJO_HOST="https://${HOST_PART%%:*}"
    REPO_PATH="${HOST_PART#*:}"
    REPO_PATH="${REPO_PATH%.git}"
  else
    SKIP_CI_CHECK=true
  fi

  if ! $SKIP_CI_CHECK; then
    BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null || echo "main")
    API_URL="${FORGEJO_HOST}/api/v1/repos/${REPO_PATH}/actions/runs?branch=${BRANCH}&limit=1"

    echo "  Checking CI status on ${FORGEJO_HOST}..."
    HTTP_RESPONSE=$(curl -s -w "\n%{http_code}" \
      -H "Accept: application/json" \
      ${FORGEJO_TOKEN:+-H "Authorization: token ${FORGEJO_TOKEN}"} \
      "$API_URL" 2>/dev/null || echo -e "\n000")

    HTTP_BODY=$(echo "$HTTP_RESPONSE" | head -n -1)
    HTTP_CODE=$(echo "$HTTP_RESPONSE" | tail -n 1)

    if [[ "$HTTP_CODE" != "200" ]]; then
      echo "  [ci-check] Could not reach Forgejo API (HTTP $HTTP_CODE)."
      echo "  Set FORGEJO_TOKEN env var or use --skip-ci-check to bypass."
      exit 1
    fi

    CI_STATUS=$(echo "$HTTP_BODY" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
    CI_CONCLUSION=$(echo "$HTTP_BODY" | grep -o '"conclusion":"[^"]*"' | head -1 | cut -d'"' -f4)

    case "$CI_STATUS" in
      completed)
        if [[ "$CI_CONCLUSION" != "success" ]]; then
          echo ""
          echo "  ✗ CI last run: ${CI_CONCLUSION}. Fix before releasing."
          echo "  Use --skip-ci-check to bypass."
          echo ""
          exit 1
        fi
        echo "  ✓ CI is green"
        ;;
      in_progress|waiting|queued)
        echo ""
        echo "  ⚠ CI is still running. Wait for it or use --skip-ci-check."
        echo ""
        exit 1
        ;;
    esac
  fi
fi

if $DRY_RUN; then
  echo "Files to update:"
  echo "  VERSION"
  echo "  vinyl-catalog/src-tauri/Cargo.toml"
  echo "  vinyl-catalog/src-tauri/tauri.conf.json"
  echo "  vinyl-catalog/backend/src/swagger.ts"
  echo "  vinyl-catalog/sidecar/main.py"
  echo ""
  PENDING=$(git status --porcelain | grep -v '^\?\?' | wc -l | tr -d ' ')
  if [[ "$PENDING" -gt 0 ]]; then
    echo "Pending staged/modified files that will be included in the commit:"
    git status --porcelain | grep -v '^\?\?'
  fi
  echo ""
  echo "[dry-run] No changes made."
  exit 0
fi

# ── Confirm ───────────────────────────────────────────────────────────────────
PENDING=$(git status --porcelain | grep -v '^\?\?' | wc -l | tr -d ' ')
if [[ "$PENDING" -gt 0 ]]; then
  echo "Pending changes that will be included in the release commit:"
  git status --porcelain | grep -v '^\?\?'
  echo ""
fi

read -rp "Release v${NEW}? [y/N] " CONFIRM
[[ "$CONFIRM" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 1; }

# ── Update version files ──────────────────────────────────────────────────────

echo "$NEW" > VERSION

sed -i "0,/^version = \"[0-9]*\.[0-9]*\.[0-9]*\"/{s/^version = \"[0-9]*\.[0-9]*\.[0-9]*\"/version = \"${NEW}\"/}" \
  vinyl-catalog/src-tauri/Cargo.toml

tmp="$(mktemp)"
jq --arg v "$NEW" '.version = $v' vinyl-catalog/src-tauri/tauri.conf.json > "$tmp"
mv "$tmp" vinyl-catalog/src-tauri/tauri.conf.json

sed -i "s/version: '[0-9]\+\.[0-9]\+\.[0-9]\+'/version: '${NEW}'/" \
  vinyl-catalog/backend/src/swagger.ts

sed -i "s/version=\"[0-9]\+\.[0-9]\+\.[0-9]\+\"/version=\"${NEW}\"/" \
  vinyl-catalog/sidecar/main.py

# ── Single commit — version files + anything already staged ──────────────────
git add \
  VERSION \
  vinyl-catalog/src-tauri/Cargo.toml \
  vinyl-catalog/src-tauri/tauri.conf.json \
  vinyl-catalog/backend/src/swagger.ts \
  vinyl-catalog/sidecar/main.py

git commit -m "chore: release v${NEW}"
git tag "v${NEW}"

# ── Push branch + tag in one command ─────────────────────────────────────────
echo ""
echo "Pushing..."
git push origin HEAD:refs/heads/main "refs/tags/v${NEW}"

echo ""
echo "Released v${NEW} and pushed."
echo ""
