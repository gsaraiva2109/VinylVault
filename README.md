# VinylVault

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg)](CODE_OF_CONDUCT.md)

A self-hosted app for cataloging vinyl record collections with AI-powered recognition, Discogs metadata, and collection value tracking.

## Features

- **AI Vinyl Recognition** — Point camera at a record cover, AI identifies artist and album
- **Browser + Desktop** — Works in any browser (cloud AI) or as a native app (local + cloud AI cascade)
- **Discogs Integration** — Automatic metadata, cover art, and marketplace pricing
- **Collection Value Tracking** — Nightly price updates from Discogs marketplace
- **Spotify Links** — Quick "Open in Spotify" for each record
- **Generic OIDC Auth** — Works with Authentik, Keycloak, Auth0, Okta, or any OIDC provider
- **Demo Mode** — Read-only access for friends (controlled by OIDC groups)

## Browser vs Desktop

| Feature        | Browser                                        | Desktop                         |
| -------------- | ---------------------------------------------- | ------------------------------- |
| AI Recognition | Cloud only (OpenAI/Gemini, bring your own key) | Local (Ollama) + Cloud cascade  |
| Camera         | Built-in webcam                                | Built-in webcam                 |
| Auth           | OIDC via NextAuth                              | OIDC via system browser + PKCE  |
| Platform       | Any modern browser                             | Linux (AppImage) / macOS (.dmg) |
| API Keys       | Encrypted server-side                          | OS keyring                      |

## Quick Start

### Docker Compose

```bash
git clone https://github.com/gsaraiva2109/vinylvault.git
cd vinylvault
cp .env.example .env
# edit .env with your values
docker compose up -d
```

Open `http://localhost:3000`.

### Manual Setup

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup instructions.

## Configuration

### Required Environment Variables

| Variable             | Description                                        |
| -------------------- | -------------------------------------------------- |
| `POSTGRES_PASSWORD`  | PostgreSQL password                                |
| `OIDC_ISSUER`        | OIDC provider issuer URL                           |
| `OIDC_CLIENT_ID`     | OIDC client ID                                     |
| `OIDC_CLIENT_SECRET` | OIDC client secret                                 |
| `NEXTAUTH_URL`       | Frontend URL (e.g. `https://vinyl.yourdomain.com`) |
| `NEXTAUTH_SECRET`    | NextAuth secret (`openssl rand -base64 32`)        |

### Optional Environment Variables

| Variable                      | Default             | Description                                                                   |
| ----------------------------- | ------------------- | ----------------------------------------------------------------------------- |
| `OIDC_JWKS_URL`               | Derived from issuer | Explicit JWKS endpoint                                                        |
| `DISCOGS_TOKEN`               | —                   | Discogs personal access token (enables marketplace pricing)                   |
| `ALLOWED_ORIGINS`             | —                   | Comma-separated CORS origins                                                  |
| `ENCRYPTION_KEY`              | —                   | 64-char hex for AES-256-GCM key encryption (generate: `openssl rand -hex 32`) |
| `AUTH_ENABLED`                | `true`              | Set to `false` to disable auth                                                |
| `DEV_AUTH_TOKEN`              | —                   | Bearer token for dev mode bypass                                              |
| `NEXT_PUBLIC_DEMO_GROUP_NAME` | `demo-users`        | OIDC group name for demo/read-only users                                      |

## OIDC Setup

Vinyl Vault works with any OIDC-compliant identity provider. See [docs/oidc-providers.md](docs/oidc-providers.md) for setup guides:

- [Authentik](docs/oidc-providers.md#authentik)
- [Keycloak](docs/oidc-providers.md#keycloak)
- [Auth0](docs/oidc-providers.md#auth0)
- [Okta](docs/oidc-providers.md#okta)

## Stack

| Layer       | Technology                                               |
| ----------- | -------------------------------------------------------- |
| Frontend    | Next.js 15, React 19, Tailwind CSS                       |
| Backend API | Node.js, Express, TypeScript, Drizzle ORM                |
| Database    | PostgreSQL 16                                            |
| Auth        | Generic OIDC (NextAuth + PKCE via Tauri)                 |
| AI — All    | Ollama (Vision) / OpenAI / Gemini                        |
| OCR — macOS | Native Vision.framework via Rust FFI                     |
| Desktop     | Tauri v2 (bundles the Next.js frontend as static export) |

## Repository Layout

```
api/                  Express backend, Drizzle ORM + PostgreSQL
web/                  Next.js 15 frontend (SSR + static export for Tauri)
desktop/              Tauri 2 shell with Rust backend
  src-tauri/          Rust — auth, OCR, settings

docs/                 Setup guides and documentation
docker/               Docker build files
```

## CI/CD

Vinyl Vault uses a two-platform CI/CD strategy:

| Platform    | Role                                                          |
| ----------- | ------------------------------------------------------------- |
| **Forgejo** | Primary remote. Quality gates, Docker builds, Linux AppImage. |
| **GitHub**  | macOS builds only. Triggered on release tags.                 |

## License

MIT — see [LICENSE](LICENSE) for details.
