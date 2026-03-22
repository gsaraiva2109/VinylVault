# Vinyl Catalog

A self-hosted app for cataloging vinyl record collections with AI-powered recognition, Discogs metadata, and collection value tracking.

Built as a personal project for two people sharing one collection across two machines — an Arch Linux laptop and a MacBook Air M1. Runs entirely on a homelab; no external services required beyond Discogs.

## How it works

- Scan a vinyl cover → OCR extracts text → Discogs search returns metadata and pricing
- Low-confidence scans fall back to a local or cloud vision LLM
- Collection stored in PostgreSQL on the homelab, accessible from any device
- Available as a web app (browser) and a native desktop shell (Electron)

The desktop app follows the Discord pattern: the Electron shell is a thin native wrapper that loads the hosted web frontend at `https://vinyl.yourdomain.com`. There is no bundled UI — both the browser and the Electron app hit the same deployment.

## Architecture

```
vinyl-catalog/
  backend/            Node.js + Express + TypeScript API
                      Drizzle ORM → PostgreSQL

vinylRecognizerDashboard/
                      Next.js 15 frontend (served from homelab)
                      Loaded by both browser and Electron shell

recognizer/           Python FastAPI sidecar
                      EasyOCR → Discogs · LLM fallback (Ollama / OpenAI / Gemini)

docker-compose.yml    Single Dokploy deployment (api + web + postgres)
```

### Network diagram

```
Internet
  └─► Traefik (HTTPS, Dokploy)
        ├─► web  (Next.js :3000)   vinyl.yourdomain.com
        └─► api  (Express :3001)   vinyl.yourdomain.com/api

Docker internal network (never exposed)
  └─► postgres :5432

Electron shell (desktop)
  └─► loadURL('https://vinyl.yourdomain.com')
      Same auth flow as browser — standard cookies / OIDC session
```

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React 19, Tailwind CSS, shadcn/ui |
| Backend API | Node.js, Express, TypeScript, Drizzle ORM |
| Database | PostgreSQL 16 (Docker, internal-only) |
| Auth | Authentik OIDC — standard browser session |
| Recognition sidecar | Python, FastAPI, EasyOCR, Ollama / OpenAI / Gemini |
| Desktop shell | Electron (thin wrapper, loads hosted URL) |
| Deployment | Docker Compose, Dokploy, Traefik |

## Homelab Requirements

- Docker and Docker Compose
- Dokploy (or any Docker host with Traefik)
- An Authentik instance (or any OIDC provider)
- A domain pointed at your homelab

## Deployment

### 1. Clone the repository

```bash
git clone https://github.com/your-username/vinyl-catalog.git
cd vinyl-catalog
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in `.env`:

```env
DOMAIN=vinyl.yourdomain.com
POSTGRES_PASSWORD=your_strong_password

AUTHENTIK_JWKS_URL=https://auth.yourdomain.com/application/o/vinyl-catalog/jwks/
AUTHENTIK_ISSUER=https://auth.yourdomain.com/application/o/vinyl-catalog/

DISCOGS_TOKEN=your_discogs_personal_access_token
```

Get your Discogs token at [discogs.com/settings/developers](https://www.discogs.com/settings/developers).

### 3. Set up Authentik

Create a provider in Authentik (OAuth2/OIDC) and an application pointing at it:

- **Redirect URIs:** `https://vinyl.yourdomain.com/api/auth/callback`
- **Signing key:** use the default RS256 key
- Copy the JWKS URL and issuer into `.env`

### 4. Deploy

In Dokploy, create a new **Compose** application pointing at this repository. Dokploy will pick up the Traefik labels automatically and provision TLS via Let's Encrypt.

Or run locally:

```bash
docker compose up -d
```

Database migrations run automatically on container start. PostgreSQL data is persisted in the `pgdata` Docker volume.

## Local Development

### Backend

```bash
cd vinyl-catalog/backend
npm install
cp .env.example .env          # set DATABASE_URL to a local postgres instance
npm run dev                   # starts on http://localhost:3001
```

### Frontend

```bash
cd vinylRecognizerDashboard
pnpm install
pnpm dev                      # starts on http://localhost:3000
```

Set `NEXT_PUBLIC_API_URL=http://localhost:3001` in `vinylRecognizerDashboard/.env.local`.

### Recognition sidecar

```bash
cd recognizer
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py                 # starts on http://localhost:8765
```

Ollama is optional. If not installed, local LLM mode is unavailable — the app shows a banner with a download link.

## Recognition Pipeline

When a vinyl cover is scanned:

1. **EasyOCR** extracts text from the image
2. If confidence ≥ threshold → search Discogs directly
3. If confidence < threshold → LLM fallback:
   - **Local:** Ollama (multimodal model, e.g. `llava`)
   - **Cloud:** OpenAI GPT-4o or Google Gemini
   - **Hybrid:** tries Ollama first, falls back to cloud

The active LLM mode and confidence threshold are configurable per device in the app's Settings screen.

## Desktop App (Electron)

The Electron shell is intentionally minimal — it provides the native window, system tray, and auto-updater. The UI is the hosted web app.

```bash
# Development (loads http://localhost:3000)
cd electron
pnpm dev

# Build
pnpm build:linux   # AppImage
pnpm build:mac     # dmg
```

Auto-updates are served via GitHub Releases.

## License

MIT
