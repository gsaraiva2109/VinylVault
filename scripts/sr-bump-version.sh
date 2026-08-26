#!/usr/bin/env bash
set -euo pipefail
NEW="$1"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "$NEW" > "$ROOT/VERSION"

# GNU and BSD sed disagree on -i (BSD requires an explicit, even if empty,
# backup suffix); -i.bak works portably on both. Also "0,/re/" (match from
# before line 1) is a GNU-only extension that errors on BSD sed — "1,/re/"
# is the portable equivalent for "replace only the first occurrence". BSD
# sed also requires a ';' before a block's closing '}' — GNU accepts it
# glued to the command, BSD errors with "bad flag in substitute command".
sed -i.bak "1,/^version = \"[0-9]*\.[0-9]*\.[0-9]*\"/{s/^version = \"[0-9]*\.[0-9]*\.[0-9]*\"/version = \"${NEW}\"/;}" \
  "$ROOT/desktop/src-tauri/Cargo.toml"
rm -f "$ROOT/desktop/src-tauri/Cargo.toml.bak"

node -e "
  const fs = require('fs');
  const f = '$ROOT/desktop/src-tauri/tauri.conf.json';
  const obj = JSON.parse(fs.readFileSync(f, 'utf8'));
  obj.version = '$NEW';
  fs.writeFileSync(f, JSON.stringify(obj, null, 2) + '\n');
"

sed -i.bak "s/version: '[0-9]\+\.[0-9]\+\.[0-9]\+'/version: '${NEW}'/" \
  "$ROOT/api/src/swagger.ts"
rm -f "$ROOT/api/src/swagger.ts.bak"

for pkg in web/package.json desktop/package.json api/package.json; do
  node -e "
    const fs = require('fs');
    const f = '$ROOT/$pkg';
    const obj = JSON.parse(fs.readFileSync(f, 'utf8'));
    obj.version = '$NEW';
    fs.writeFileSync(f, JSON.stringify(obj, null, 2) + '\n');
  "
done
