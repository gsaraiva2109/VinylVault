# web: AI Development Rules

## Build and Check Commands
- **Rust Backend:** Use `bash api/scripts/cargo-errors.sh` instead of raw `cargo check` or `cargo build` to capture token-efficient error reports.
- **Frontend:** Use `pnpm --filter desktop run build` for Tauri/React builds.

## Code Style
- **Rust:** Prefer `anyhow` for error handling and `drizzle` patterns for DB interactions.
- **React:** Use functional components with hooks. Keep components under 150 lines.

## Context Protocol
- Always use `.context.xml` (generated via `repomix`) for cross-module dependency checks.
