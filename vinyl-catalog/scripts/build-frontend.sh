#!/usr/bin/env bash
# Builds the Next.js frontend for Tauri (output: export).
#
# The NextAuth API route uses force-dynamic which is incompatible with
# output: export. Since the Tauri app never calls these routes (it uses
# native Tauri auth), we temporarily replace the route with a static stub,
# run the export build, then restore the original file.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$(cd "$SCRIPT_DIR/../../vinylRecognizerDashboard" && pwd)"
ROUTE_FILE="$FRONTEND_DIR/app/api/auth/[...nextauth]/route.ts"
BACKUP="/tmp/nextauth-route-$$.ts.bak"

cp "$ROUTE_FILE" "$BACKUP"

# Restore original file on exit (success or failure)
trap 'cp "$BACKUP" "$ROUTE_FILE"; rm -f "$BACKUP"' EXIT

# Write a static stub that satisfies Next.js export requirements.
# The Tauri app will never request /api/auth/* — these routes are web-only.
cat > "$ROUTE_FILE" << 'EOF'
// Static stub used only during Tauri (output: export) builds.
// The real handler is in the original route.ts and is used by the standalone web build.
export const dynamic = "force-static";

export function generateStaticParams() {
  return [{ nextauth: ["callback"] }];
}

export async function GET() {
  return new Response(null, { status: 404 });
}

export async function POST() {
  return new Response(null, { status: 404 });
}
EOF

cd "$FRONTEND_DIR"
NEXT_OUTPUT=export pnpm build
