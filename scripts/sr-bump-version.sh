#!/usr/bin/env bash
set -euo pipefail
NEW="$1"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "$NEW" > "$ROOT/VERSION"

sed -i "0,/^version = \"[0-9]*\.[0-9]*\.[0-9]*\"/{s/^version = \"[0-9]*\.[0-9]*\.[0-9]*\"/version = \"${NEW}\"/}" \
  "$ROOT/vinyl-catalog/src-tauri/Cargo.toml"

node -e "
  const fs = require('fs');
  const f = '$ROOT/vinyl-catalog/src-tauri/tauri.conf.json';
  const obj = JSON.parse(fs.readFileSync(f, 'utf8'));
  obj.version = '$NEW';
  fs.writeFileSync(f, JSON.stringify(obj, null, 2) + '\n');
"

sed -i "s/version: '[0-9]\+\.[0-9]\+\.[0-9]\+'/version: '${NEW}'/" \
  "$ROOT/vinyl-catalog/backend/src/swagger.ts"

for pkg in vinylRecognizerDashboard/package.json vinyl-catalog/package.json vinyl-catalog/backend/package.json; do
  node -e "
    const fs = require('fs');
    const f = '$ROOT/$pkg';
    const obj = JSON.parse(fs.readFileSync(f, 'utf8'));
    obj.version = '$NEW';
    fs.writeFileSync(f, JSON.stringify(obj, null, 2) + '\n');
  "
done
