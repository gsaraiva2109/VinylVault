#!/usr/bin/env bash
# release.sh — bump version across all manifests, commit, and tag
#
# Usage:
#   ./scripts/release.sh patch            # 1.0.0 → 1.0.1
#   ./scripts/release.sh minor            # 1.0.0 → 1.1.0
#   ./scripts/release.sh major            # 1.0.0 → 2.0.0
#   ./scripts/release.sh 1.2.3            # explicit version
#   ./scripts/release.sh patch --dry-run  # preview only, no changes
#   ./scripts/release.sh patch --skip-ci-check  # skip Forgejo CI status check

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
  # Parse Forgejo URL + repo from git remote
  REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")
  # Supports: https://forgejo.example.com/owner/repo.git
  #           git@forgejo.example.com:owner/repo.git
  if [[ "$REMOTE_URL" =~ ^https?:// ]]; then
    # Strip credentials if present (https://user:token@host/...)
    FORGEJO_BASE=$(echo "$REMOTE_URL" | sed 's|://[^@]*@|://|' | sed 's|\.git$||')
    REPO_PATH="${FORGEJO_BASE#*://*/}"
    FORGEJO_HOST="${FORGEJO_BASE%/$REPO_PATH}"
  elif [[ "$REMOTE_URL" =~ ^git@ ]]; then
    HOST_PART="${REMOTE_URL#git@}"
    FORGEJO_HOST="https://${HOST_PART%%:*}"
    REPO_PATH="${HOST_PART#*:}"
    REPO_PATH="${REPO_PATH%.git}"
  else
    echo "  [ci-check] Could not parse remote URL, skipping CI check."
    SKIP_CI_CHECK=true
  fi

  if ! $SKIP_CI_CHECK; then
    BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null || echo "main")
    API_URL="${FORGEJO_HOST}/api/v1/repos/${REPO_PATH}/actions/runs?branch=${BRANCH}&limit=1"

    echo "  Checking CI status on ${FORGEJO_HOST}..."
    HTTP_RESPONSE=$(curl -s -w "\n%{http_code}" \
      -H "Accept: application/json" \
      "$API_URL" 2>/dev/null || echo -e "\n000")

    HTTP_BODY=$(echo "$HTTP_RESPONSE" | head -n -1)
    HTTP_CODE=$(echo "$HTTP_RESPONSE" | tail -n 1)

    if [[ "$HTTP_CODE" != "200" ]]; then
      echo "  [ci-check] Could not reach Forgejo API (HTTP $HTTP_CODE). Use --skip-ci-check to bypass."
      exit 1
    fi

    CI_STATUS=$(echo "$HTTP_BODY" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
    CI_CONCLUSION=$(echo "$HTTP_BODY" | grep -o '"conclusion":"[^"]*"' | head -1 | cut -d'"' -f4)

    case "$CI_STATUS" in
      completed)
        if [[ "$CI_CONCLUSION" != "success" ]]; then
          echo ""
          echo "  ✗ CI last run concluded: ${CI_CONCLUSION}"
          echo "  Fix the failure before releasing. Use --skip-ci-check to bypass."
          echo ""
          exit 1
        fi
        echo "  ✓ CI is green (${CI_CONCLUSION})"
        ;;
      in_progress|waiting|queued)
        echo ""
        echo "  ⚠ CI is still running (${CI_STATUS}). Wait for it to finish."
        echo "  Use --skip-ci-check to bypass."
        echo ""
        exit 1
        ;;
      *)
        echo "  [ci-check] Unknown CI status '${CI_STATUS}', skipping check."
        ;;
    esac
  fi
fi

# ── Preview ───────────────────────────────────────────────────────────────────
echo "Files to update:"
echo "  VERSION"
echo "  vinyl-catalog/backend/src/swagger.ts"
echo "  vinyl-catalog/sidecar/main.py"
echo "  vinyl-catalog/src-tauri/Cargo.toml"
echo "  vinyl-catalog/src-tauri/tauri.conf.json"
echo "  vinyl-catalog/package.json"
echo "  vinylRecognizerDashboard/package.json + package-lock.json"
echo "  vinyl-catalog/backend/package.json + package-lock.json"
echo ""

if $DRY_RUN; then
  echo "[dry-run] No files changed."
  exit 0
fi

# ── Confirm ───────────────────────────────────────────────────────────────────
read -rp "Proceed? [y/N] " CONFIRM
[[ "$CONFIRM" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 1; }

# ── Update files ──────────────────────────────────────────────────────────────

# 1. Root VERSION
echo "$NEW" > VERSION

# 2. swagger.ts — matches: version: 'X.Y.Z'
sed -i "s/version: '[0-9]\+\.[0-9]\+\.[0-9]\+'/version: '${NEW}'/" \
  vinyl-catalog/backend/src/swagger.ts

# 3. main.py — matches: version="X.Y.Z" inside FastAPI(...)
sed -i "s/version=\"[0-9]\+\.[0-9]\+\.[0-9]\+\"/version=\"${NEW}\"/" \
  vinyl-catalog/sidecar/main.py

# 4. Cargo.toml — matches only the top-level `version = "X.Y.Z"` line
#    (dependency versions use inline tables and won't match ^version)
sed -i "0,/^version = \"[0-9]*\.[0-9]*\.[0-9]*\"/{s/^version = \"[0-9]*\.[0-9]*\.[0-9]*\"/version = \"${NEW}\"/}" \
  vinyl-catalog/src-tauri/Cargo.toml

# 5. tauri.conf.json
tmp="$(mktemp)"
jq --arg v "$NEW" '.version = $v' vinyl-catalog/src-tauri/tauri.conf.json > "$tmp"
mv "$tmp" vinyl-catalog/src-tauri/tauri.conf.json

# 6. vinylRecognizerDashboard/package.json + package-lock.json (npm)
(cd vinylRecognizerDashboard && npm version "$NEW" --no-git-tag-version --allow-same-version 2>/dev/null)

# 7. vinyl-catalog/backend/package.json + package-lock.json (npm)
(cd vinyl-catalog/backend && npm version "$NEW" --no-git-tag-version --allow-same-version 2>/dev/null)

# 8. vinyl-catalog/package.json (pnpm workspace root)
tmp="$(mktemp)"
jq --arg v "$NEW" '.version = $v' vinyl-catalog/package.json > "$tmp"
mv "$tmp" vinyl-catalog/package.json

echo ""
echo "Updated all manifests to ${NEW}."

# ── Git commit + tag ──────────────────────────────────────────────────────────
git add \
  VERSION \
  vinyl-catalog/backend/src/swagger.ts \
  vinyl-catalog/sidecar/main.py \
  vinyl-catalog/src-tauri/Cargo.toml \
  vinyl-catalog/src-tauri/tauri.conf.json \
  vinyl-catalog/package.json \
  vinylRecognizerDashboard/package.json \
  vinylRecognizerDashboard/package-lock.json \
  vinyl-catalog/backend/package.json \
  vinyl-catalog/backend/package-lock.json

git commit -m "chore: bump version to v${NEW} [skip ci]"
git tag "v${NEW}"

echo ""
echo "Committed and tagged v${NEW}."
echo ""
echo "Push when ready:"
echo "  git push && git push origin v${NEW}"
echo ""
