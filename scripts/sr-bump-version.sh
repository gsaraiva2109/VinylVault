#!/usr/bin/env bash
set -euo pipefail
NEW="$1"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "$NEW" > "$ROOT/VERSION"

sed -i "0,/^version = \"[0-9]*\.[0-9]*\.[0-9]*\"/{s/^version = \"[0-9]*\.[0-9]*\.[0-9]*\"/version = \"${NEW}\"/}" \
  "$ROOT/vinyl-catalog/src-tauri/Cargo.toml"

tmp="$(mktemp)"
jq --arg v "$NEW" '.version = $v' "$ROOT/vinyl-catalog/src-tauri/tauri.conf.json" > "$tmp"
mv "$tmp" "$ROOT/vinyl-catalog/src-tauri/tauri.conf.json"

sed -i "s/version: '[0-9]\+\.[0-9]\+\.[0-9]\+'/version: '${NEW}'/" \
  "$ROOT/vinyl-catalog/backend/src/swagger.ts"

for pkg in vinylRecognizerDashboard/package.json vinyl-catalog/package.json vinyl-catalog/backend/package.json; do
  tmp="$(mktemp)"
  jq --arg v "$NEW" '.version = $v' "$ROOT/$pkg" > "$tmp"
  mv "$tmp" "$ROOT/$pkg"
done
