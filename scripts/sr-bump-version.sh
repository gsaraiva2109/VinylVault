#!/usr/bin/env bash
set -euo pipefail
NEW="$1"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "$NEW" > "$ROOT/VERSION"

sed -i "0,/^version = \"[0-9]*\.[0-9]*\.[0-9]*\"/{s/^version = \"[0-9]*\.[0-9]*\.[0-9]*\"/version = \"${NEW}\"/}" \
  "$ROOT/desktop/src-tauri/Cargo.toml"

node -e "
  const fs = require('fs');
  const f = '$ROOT/desktop/src-tauri/tauri.conf.json';
  const obj = JSON.parse(fs.readFileSync(f, 'utf8'));
  obj.version = '$NEW';
  fs.writeFileSync(f, JSON.stringify(obj, null, 2) + '\n');
"

sed -i "s/version: '[0-9]\+\.[0-9]\+\.[0-9]\+'/version: '${NEW}'/" \
  "$ROOT/api/src/swagger.ts"

for pkg in web/package.json desktop/package.json api/package.json; do
  node -e "
    const fs = require('fs');
    const f = '$ROOT/$pkg';
    const obj = JSON.parse(fs.readFileSync(f, 'utf8'));
    obj.version = '$NEW';
    fs.writeFileSync(f, JSON.stringify(obj, null, 2) + '\n');
  "
done
