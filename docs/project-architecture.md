# Vinyl Catalog — Project Architecture (AI Reference)

This file is the single source of truth for AI assistants working on this codebase.
It is symlinked as `llms.txt` at the repo root for fast context loading.

---

## Project Purpose

Family vinyl record catalog. Members scan record covers with a camera; OCR + LLM identifies the record and stores it in a shared Postgres database. Available as:
- **Web app** hosted on homelab (Dokploy) at `vinyl.gsaraiva.com.br`
- **Desktop app** (Tauri) for macOS and Linux with native hardware-accelerated OCR

---

## Monorepo Structure

```
/
├── vinylRecognizerDashboard/   Next.js 15 frontend (web + Tauri embedded)
├── vinyl-catalog/
│   ├── backend/                Node.js/Express API
│   ├── src-tauri/              Rust Tauri shell
│   └── package.json            Tauri workspace root (pnpm)
├── scripts/
│   └── release.sh              Version bump script (single source of truth)
├── .forgejo/workflows/         Forgejo CI (primary — Linux builds, Docker, GHCR)
├── .github/workflows/          GitHub Actions (macOS .dmg build only)
├── VERSION                     Root version file — ALL manifests read from here
└── llms.txt -> docs/project-architecture.md
```

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Next.js 15 (App Router), Tailwind CSS v3, shadcn/ui | `vinylRecognizerDashboard/` |
| Desktop shell | Tauri v2 (Rust) | Embeds the Next.js frontend |
| API | Node.js/Express, Drizzle ORM, PostgreSQL | `vinyl-catalog/backend/` |
| OCR — macOS | Vision.framework via `objc2-vision` (Rust) | Zero Python dep, native |
| OCR — Linux/Windows | Ollama / OpenAI / Gemini (with Rust fallback planned) | No native OCR yet, depends on AI models |
| Auth | Authentik (OIDC), NextAuth.js, Traefik Forward Auth | OIDC + JWT bearer |
| Proxy | Traefik | Internal only; Cloudflare Tunnel is the edge |
| Registry | GHCR (`ghcr.io/gsaraiva2109/vinyl-vault-*`) | Pushed by Forgejo CI |
| Deployment | Dokploy on Proxmox VM | Watches GHCR for new tags |
| Package managers | pnpm (frontend + tauri), npm (backend) | Do NOT mix |

---

## Key Files

| File | Purpose |
|------|---------|
| `vinylRecognizerDashboard/app/api/auth/[...nextauth]/route.ts` | NextAuth Authentik OIDC handler |
| `vinylRecognizerDashboard/app/auth-provider.tsx` | SessionProvider wrapper |
| `vinylRecognizerDashboard/lib/tauri-auth.tsx` | Tauri auth context — PKCE flow, IPC listener, token polling |
| `vinylRecognizerDashboard/lib/api.ts` | API client — attaches Bearer token from session |
| `vinylRecognizerDashboard/app/vinyl-catalog/context.tsx` | React catalog state (live API, no mock data) |
| `vinyl-catalog/backend/src/server.ts` | Express entry point |
| `vinyl-catalog/backend/src/swagger.ts` | Swagger/OpenAPI setup — version hardcoded here |
| `vinyl-catalog/backend/src/routes/` | API routes with JSDoc for Swagger |
| `vinyl-catalog/src-tauri/src/auth.rs` | Rust OIDC PKCE flow + loopback callback server (port 17823) |
| `vinyl-catalog/src-tauri/src/commands/keyring.rs` | Keychain/keyring token storage (read/write/delete) |
| `vinyl-catalog/src-tauri/Entitlements-macOS.plist` | macOS entitlements — required for Keychain read access |
| `vinyl-catalog/src-tauri/src/` | Rust Tauri commands, auth, updater |
| `vinyl-catalog/src-tauri/tauri.conf.json` | Tauri config — version, CSP, updater endpoints, entitlements |
| `docs/homelab-architecture.md` | Homelab infrastructure constraints (Traefik, Cloudflare, MTU) |
| `docs/design.md` | Full design system: CSS tokens, spacing, motion, component classes |

---

## Authentication Flow

### Web (hosted at vinyl.gsaraiva.com.br)

```
User → Cloudflare Tunnel (HTTPS edge)
     → Traefik (HTTP internal) + authentik-proto-fix middleware (injects X-Forwarded-Proto: https)
     → Authentik Forward Auth outpost (validates session)
     → Next.js frontend

Next.js:
  - NextAuth handles OIDC handshake with Authentik
  - jwt + session callbacks capture access_token and refresh_token
  - access_token exposed via session to client

API calls:
  - lib/api.ts reads access_token from NextAuth session
  - Appends Authorization: Bearer <access_token> to every request
  - Express backend validates JWT against Authentik JWKS endpoint

Token lifecycle:
  - Access token: short-lived, used for API auth
  - Refresh token: long-lived, NextAuth rotates silently (offline_access scope)
```

### Desktop (Tauri — macOS & Linux)

Uses OIDC Authorization Code + PKCE with a loopback redirect (RFC 8252).
No NextAuth involved — tokens stored in OS Keychain/Secret Service.

```
1. User clicks "Sign in with Authentik" → invokes start_auth_flow Tauri command
2. Rust binds a temporary HTTP server on 127.0.0.1:17823
3. Builds PKCE auth URL, opens it in system browser via shell:allow-open
4. User authorises → Authentik redirects to http://127.0.0.1:17823/callback?code=...
5. Loopback server receives code, shows "Authorised ✓" page in browser
6. Rust exchanges code + PKCE verifier for tokens (access + refresh)
7. Tokens stored in OS keychain via keyring-rs:
   - macOS: Security.framework (Keychain)
   - Linux: Secret Service API (e.g. GNOME Keyring)
8. Rust emits Tauri event: auth:state-changed { status: "authenticated" }
9. Frontend IPC listener (registered once, stable ref) calls refreshAuthState()
10. refreshAuthState() invokes get_access_token Rust command → reads from keychain
11. JWT decoded client-side → user/token state set → UI transitions to app

Polling fallback (defense-in-depth):
  After start_auth_flow resolves, signIn() polls get_access_token every 500ms
  for up to 30s. Handles macOS Keychain timing where the IPC event may fire
  slightly before the newly written credential is readable.
```

**macOS Keychain requirement:**
The app uses `hardenedRuntime: true`. Without `Entitlements-macOS.plist` declaring
`keychain-access-groups`, macOS Security.framework silently denies Keychain reads
(writes succeed, reads return NotFound). The entitlements file is linked via
`tauri.conf.json → bundle.macOS.entitlements`.

**Required env vars (Next.js):**
```
OIDC_CLIENT_ID
OIDC_CLIENT_SECRET
OIDC_ISSUER
NEXTAUTH_SECRET
NEXT_PUBLIC_API_URL
```

**Required env vars (Tauri build — baked in at compile time):**
```
OIDC_ISSUER
OIDC_CLIENT_ID
OIDC_CLIENT_SECRET
```

**Dev bypass:** `AUTH_ENABLED=false` in `.env` makes the API accept requests without Bearer tokens.

---

## OCR & Scan Architecture

### macOS (Tauri)
- Vision.framework called from Rust via `objc2-vision`, `objc2-foundation`, `objc2-core-image`
- Camera capture in Tauri WebView via `getUserMedia`
- Image bytes passed to Rust OCR via Tauri IPC command
- No Python dependency

### Linux/Windows (Tauri)
- Currently relies on external Cloud AI (OpenAI/Gemini) or Local AI (Ollama)
- Native Rust OCR fallback is planned for future versions

### Web (hosted)
- Scanning is **disabled** — no local hardware access
- `scan-screen.tsx` detects environment via `'__TAURI__' in window`
- Shows a CTA to download the desktop app when running in browser

---

## Data Model

Records stored in centralized PostgreSQL (`vinyl-catalog-api`).

Key fields: `id` (int), `coverImageUrl`, `discogsId`, `currentValue`, `spotifyUrl`, `addedBy`, `addedByAvatar`

**Frontend adapter:** Backend shape differs from the UI `VinylRecord` interface. A mapper in the data layer converts:
- `coverImageUrl` → `coverUrl`
- `discogsId` → `discogs.releaseId`
- `currentValue` → `discogs.value`
- etc.

---

## CI/CD Pipeline

**Primary CI: Forgejo (homelab)**

```
push to main / tag push
  ├─ detect-changes          (light-node) — path filter, controls downstream skips
  ├─ check-frontend          (light-node) — lint + tsc
  ├─ check-backend           (light-node) — tsc + build
  ├─ check-rust              (heavy-ubuntu) — cargo check; apt packages cached
  ├─ build-tauri-linux       (heavy-ubuntu, inside builder container)
  │     container: localhost:5000/vinyl-vault-builder:latest
  │     → cargo registry/target cache
  │     → AppImage artifact (30-day retention)
  ├─ build-and-push-images
  │     vinyl-vault-api      (light-ubuntu) → git.gsaraiva.com.br registry
  │     vinyl-vault-web      (heavy-ubuntu) → git.gsaraiva.com.br registry
  │     tags: branch / nightly / vX.Y.Z / latest
  │     → Dokploy webhook → auto-redeploy
  └─ push-to-github          (light-ubuntu) — on tag only
        └─ GitHub Actions: release-macos.yml
              macOS runner → Tauri .dmg → GitHub Release

build-builder-image (separate workflow — .forgejo/workflows/build-builder-image.yml)
  triggers on: push to docker/builder.Dockerfile
  → builds & pushes localhost:5000/vinyl-vault-builder:latest
  → caches layers at localhost:5000/vinyl-vault-builder:cache
```

**Builder image** (`docker/builder.Dockerfile`):
Pre-bakes Rust stable, Node 20, build-essential, binutils, webkit2gtk, and all Tauri
Linux deps into a Docker image stored at `localhost:5000` on the heavy runner host
(bypasses Cloudflare 413 limit on `git.gsaraiva.com.br`). Eliminates the ~40s
apt-get + ~75s Rust install on every build.
After rebuilding the image, run `docker pull localhost:5000/vinyl-vault-builder:latest`
on the heavy runner host to evict the local layer cache.

**Secrets required on Forgejo:**
- `REGISTRY_TOKEN` — Forgejo registry push access (falls back to `GITHUB_TOKEN`)
- `MIRROR_TOKEN` — GitHub PAT with `repo` + `workflow` scopes
- `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET` — for cargo check
- `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` — Tauri updater signing
- `NEXT_PUBLIC_API_URL` — injected at Docker build time (web image only)

**Variables required on Forgejo:**
- `MIRROR_REPO` — `gsaraiva2109/vinylvault`
- `INTERNAL_DOKPLOY_HOST` — internal Dokploy host for webhook delivery

---

## Versioning & Release

`VERSION` (repo root) is the single source of truth. All manifests are kept in sync:

| Manifest | Field |
|----------|-------|
| `VERSION` | plain text |
| `vinyl-catalog/backend/src/swagger.ts` | `version: 'X.Y.Z'` |
| `vinyl-catalog/src-tauri/Cargo.toml` | `[package] version = "X.Y.Z"` |
| `vinyl-catalog/src-tauri/tauri.conf.json` | `"version": "X.Y.Z"` |
| `vinyl-catalog/package.json` | `"version": "X.Y.Z"` |
| `vinylRecognizerDashboard/package.json` | `"version": "X.Y.Z"` |
| `vinyl-catalog/backend/package.json` | `"version": "X.Y.Z"` |

**Release workflow:**
```bash
./scripts/release.sh patch   # or minor / major / X.Y.Z
git push && git push origin vX.Y.Z
```
The release commit includes `[skip ci]` → skips CI on branch push.
Tag push triggers the full Forgejo pipeline.

---

## Infrastructure (Homelab)

**Hardware:** GMKtec NucBox K6 (Ryzen 7 7840HS, 32GB DDR5)
**Hypervisor:** Proxmox VE 9.1
**Stack:** Cloudflare Tunnel → Dokploy VM (`192.168.1.4`) → Traefik → Docker services

### Critical constraints

- **Cloudflare Free Tier:** No deep subdomains. Use flat: `api-vinyl.gsaraiva.com.br`, NOT `api.vinyl.gsaraiva.com.br`
- **X-Forwarded-Proto:** Authentik and SPAs require `X-Forwarded-Proto: https`. Traefik middleware `authentik-proto-fix` injects this. Without it you get CSRF / "Unauthorized" errors.
- **Service discovery:** Use Docker service names (`vinyl-frontend:3000`), never host IPs
- **MTU:** Docker bridge MTU = 1450 (PPPoE/fiber overhead). Do not change.
- **SSL:** No Let's Encrypt. Cloudflare provides edge SSL; Traefik runs in trusted-insecure internal mode.
- **DATABASE_URL:** Never passed in CI/CD. Migrations run manually or via direct internal network access.

### Traefik middlewares (defined in `/etc/dokploy/traefik/dynamic/middlewares.yml`)

`authentik-proto-fix` — injects `X-Forwarded-Proto: https` and `X-Forwarded-Host: auth.gsaraiva.com.br`
`authentik-auth` — Forward Auth to `http://authentik-server:9000/outpost.goauthentik.io/auth/traefik`

### Authentik setup requirements
- Provider type: **Proxy Provider → Forward auth (single application)**
- App must be member of the **Embedded Outpost**
- Pass auth headers: Username, Groups, Email, Name

---

## Design System Summary

Full spec in `docs/design.md`. Key tokens:

- Accent: `--app-green` (`#1faa58` light / `#28d768` dark)
- Surfaces: `--app-surface`, `--app-surface-2`, `--app-glass`
- Text: `--app-text-1` (primary), `--app-text-2` (secondary), `--app-text-3` (tertiary)
- **Rule:** Never hardcode dark values in components — always use `var(--app-*)` tokens
- **Rule:** Scroll containers above the fixed bottom dock need `pb-28`
- Condition badge colors are hardcoded (semantic, theme-invariant)

Navigation: 5-tab bottom dock — Collection · Scan · Stats · Settings · Account
