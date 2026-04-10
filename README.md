# VinylVault

A self-hosted app for cataloging vinyl record collections with OCR-powered recognition, Discogs metadata, and collection value tracking.

Built as a personal project for two people sharing one collection across two machines — an Arch Linux desktop and a MacBook Air M1. Runs entirely on a homelab; no external services required beyond Discogs.

## How it works

- Scan a vinyl cover → OCR extracts text → Discogs search returns metadata and pricing
- Linux uses Ollama/Cloud LLMs (with a future Rust native OCR planned); macOS uses native Vision.framework
- Collection stored in PostgreSQL on the homelab, accessible from any device
- Available as a web app (browser) and a native desktop app (Tauri v2)

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React 19, Tailwind CSS |
| Backend API | Node.js, Express, TypeScript, Drizzle ORM |
| Database | PostgreSQL 16 (Docker, internal network only) |
| Auth | Authentik OIDC (system browser flow via Tauri) |
| OCR — Linux | Ollama (Vision) / OpenAI / Gemini (with Rust fallback planned) |
| OCR — macOS | Native Vision.framework via Rust FFI |
| Desktop | Tauri v2 (bundles the Next.js frontend as a static export) |
| Deployment | Docker Compose, Dokploy, Traefik |

## Repository layout

```
vinyl-catalog/
  backend/            Node.js + Express + TypeScript API
                      Drizzle ORM → PostgreSQL
                      Migrations run on startup (no CI/CD DB access)
  src-tauri/          Rust — Tauri v2 shell, OCR commands, OIDC auth

vinylRecognizerDashboard/
                      Next.js 15 frontend
                      Served as a Docker web app AND bundled into the Tauri binary
```

## Network diagram

```
Internet
  └─► Traefik (HTTPS, Dokploy)
        ├─► vinyl-vault-web  (Next.js :3000)   vinyl.gsaraiva.com.br
        └─► vinyl-vault-api  (Express :3001)   api-vinyl.gsaraiva.com.br

Docker internal network (never exposed)
  └─► postgres :5432

Tauri desktop app
  └─► embeds the Next.js frontend as a static export (out/)
      OCR commands call native Vision.framework (macOS) or external APIs (Linux)
      Auth uses Authentik OIDC via the system browser
```

## CI/CD Architecture

VinylVault uses a **two-platform CI/CD** strategy:

| Platform | Role |
|---|---|
| **Forgejo** (`git.gsaraiva.com.br`) | Primary remote. Runs quality gates, Docker image builds, Linux AppImage compilation. Mirrors to GitHub only after passing. |
| **GitHub** | macOS builds only. `release-macos.yml` triggers on `v*` tags mirrored from Forgejo, compiles the `.dmg` using the macOS SDK (Vision.framework). |

### Flow for a regular commit

```
git push → Forgejo
  ├─ quality-gate    (lint, typecheck, cargo check)
  ├─ docker builds   (vinyl-vault-api + vinyl-vault-web → GHCR)
  ├─ AppImage build  (Linux Tauri)
  └─ push-to-github  (mirrors main branch to GitHub — no GitHub CI triggered)
```

### Flow for a release tag (`v*`)

```
git push --tags → Forgejo
  ├─ quality-gate
  ├─ docker builds   (tagged: v1.2.3, latest)
  ├─ AppImage build  (artifact stored on Forgejo)
  └─ push-to-github  → mirrors tag to GitHub
                           └─ GitHub: release-macos.yml
                                └─ builds .dmg → GitHub Release
```

### Required Forgejo secrets & variables

| Key | Type | Value |
|---|---|---|
| `MIRROR_TOKEN` | Secret | GitHub PAT with `repo` scope |
| `GHCR_TOKEN` | Secret | GitHub PAT with `write:packages` scope |
| `NEXT_PUBLIC_API_URL` | Secret | `https://api-vinyl.gsaraiva.com.br` |
| `AUTHENTIK_ISSUER` | Secret | Your Authentik issuer URL |
| `AUTHENTIK_CLIENT_ID` | Secret | Authentik client ID |
| `AUTHENTIK_CLIENT_SECRET` | Secret | Authentik client secret |
| `TAURI_SIGNING_PRIVATE_KEY` | Secret | Tauri updater signing key |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Secret | Signing key password |
| `GHCR_OWNER` | Variable | `gsaraiva2109` |
| `MIRROR_REPO` | Variable | `gsaraiva2109/vinylvault` |

## How to push code

```bash
# Set Forgejo as your primary remote (if not already)
git remote add origin https://git.gsaraiva.com.br/gsaraiva2109/vinylvault.git

# Regular push — quality gate + Docker builds + Linux AppImage + mirror to GitHub
git push origin main

# Release — same as above, plus GitHub builds the macOS .dmg
git tag v1.0.0 && git push origin v1.0.0
```

## Deployment

### 1. Clone from Forgejo

```bash
git clone https://git.gsaraiva.com.br/gsaraiva2109/vinylvault.git
cd vinylvault
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in `.env` — see comments in the file. Key values:

- `POSTGRES_PASSWORD` — pick a strong random password
- `AUTHENTIK_*` — from your Authentik OAuth2/OIDC application
- `DISCOGS_TOKEN` — from [discogs.com/settings/developers](https://www.discogs.com/settings/developers)

### 3. Set up Authentik

Create an OAuth2/OIDC **Provider** and **Application** in Authentik:

- **Application slug:** `vinyl-vault`
- **Redirect URIs (desktop):** `http://127.0.0.1:49152/callback` (Tauri local server)
- **Redirect URIs (web):** `https://vinyl.yourdomain.com/api/auth/callback`
- **Signing key:** default RS256

The JWKS URL and issuer will be:
```
https://auth.yourdomain.com/application/o/vinyl-vault/jwks/
https://auth.yourdomain.com/application/o/vinyl-vault/
```

### 4. Deploy via Dokploy

Create two **Compose** apps in Dokploy:
- **API:** points to `vinyl-catalog/backend/docker-compose.yml`
- **Web:** points to `vinylRecognizerDashboard/docker-compose.yml`

Dokploy picks up Traefik labels and provisions TLS via Let's Encrypt. Redeployment is triggered by Dokploy webhooks (configure the webhook URLs from Dokploy in your deployment pipeline).

Database migrations run automatically on API container startup — no manual step required.

### Or run locally

```bash
docker compose -f vinyl-catalog/backend/docker-compose.yml up -d
```

## Local Development

### Backend

```bash
cd vinyl-catalog/backend
npm install
cp .env.example .env   # set DATABASE_URL to a local postgres
npm run dev            # http://localhost:3001
```

### Frontend (web)

```bash
cd vinylRecognizerDashboard
pnpm install
pnpm dev               # http://localhost:3000
```

Set `NEXT_PUBLIC_API_URL=http://localhost:3001` in `vinylRecognizerDashboard/.env.local`.

### Desktop (Tauri)

```bash
cd vinyl-catalog
pnpm install
pnpm dev               # starts Tauri dev window (loads http://localhost:3000)
```

On macOS, Vision.framework is used natively. On Linux/Windows, ensure you have an AI provider configured (Ollama/OpenAI/Gemini).

## License

MIT

