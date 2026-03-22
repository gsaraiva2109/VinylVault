# Vinyl Catalog — Architecture Plan

## Context
Full ground-up rewrite of a vinyl record collection manager. The existing codebase (`vinylRecognizerDashboard/`, `recognizer/`) serves as reference for intent only — no code is preserved. Goal: a professional Electron app (identical on Arch Linux and macOS) backed by a self-hosted homelab API that:
- Catalogs vinyl records via a configurable OCR → LLM recognition pipeline
- Syncs a shared collection between two machines via homelab backend
- Tracks individual and total collection value via Discogs API
- Authenticates via existing Authentik server using OIDC PKCE

---

## Final Stack

| Layer | Choice | Rationale |
|---|---|---|
| Client | **Electron + React 19 + electron-vite** | Native subprocess spawning for Python sidecar; cross-platform Arch + macOS; same binary behavior |
| Backend | **Node.js/Express + TypeScript** | Homelab-hosted on Dokploy; Discogs API proxy; shared data store |
| ORM | **Drizzle ORM** | Type-safe SQL, lightweight, clean DX, works with SQLite |
| Database | **SQLite (better-sqlite3)** | Personal scale, single file, trivial backup, no extra container |
| Auth | **OIDC PKCE via Authentik** | Electron opens system browser → Authentik → `vinylapp://` custom URL scheme; tokens in OS keychain |
| Recognition | **Configurable: EasyOCR + LLM (local Ollama / cloud API)** | User picks pipeline in Settings based on their hardware |
| Images | **Discogs CDN URLs** | No binary storage; Discogs returns `cover_image` per release |

---

## System Architecture

```
[Electron App — Same code on Arch Linux and macOS]
├── Renderer: React 19 + Vite UI (identical on both platforms)
├── Main Process (Node.js)
│   ├── IPC bridge to renderer
│   ├── child_process.spawn → Python sidecar (localhost:8765)
│   ├── openid-client: OIDC PKCE flow
│   └── keytar: OS keychain for tokens + API keys
└── Python Sidecar (FastAPI, localhost:8765)
    ├── EasyOCR (uses GPU if CUDA/Metal available, else CPU)
    └── LLM: Ollama local API or cloud API (OpenAI/Gemini)
        └── determined by user's Settings, not by device detection

[Homelab — Dokploy Docker Container — vinyl.yourdomain.com]
├── Node.js/Express API
│   ├── /api/vinyls — CRUD
│   ├── /api/collection/value — total value aggregation
│   └── /api/discogs/search — Discogs proxy (token server-side only)
├── SQLite file (mounted volume → cp backup)
└── Authentik (separate container, already running)
    └── OIDC Provider registered for "Vinyl Catalog" app
```

---

## Two Machines

| Machine | Hardware | OS |
|---|---|---|
| User's laptop | Ryzen 7 7840HS + RTX 4050 6GB + 32GB RAM | Arch Linux |
| Dad's laptop | MacBook Air M1 | macOS |

Both run the same Electron app and connect to the same homelab backend → shared collection. Recognition provider is chosen per-device in Settings (e.g. local Ollama on the RTX machine, OpenAI API on the M1).

---

## Recognition Pipeline

```
Webcam frame (getUserMedia in renderer)
  └── IPC → main process → POST localhost:8765/recognize

Python Sidecar:
  1. [If OCR enabled in settings]
     EasyOCR extracts text from frame
     confidence >= threshold → POST vinyl.yourdomain.com/api/discogs/search?q={text}
     confidence < threshold → escalate to LLM

  2. [If OCR disabled OR confidence low]
     [If LLM provider = Local]  → Ollama HTTP API → vision model (qwen2-vl, llava, etc.)
     [If LLM provider = API]    → OpenAI GPT-4o Vision OR Gemini Vision (per settings)
     [If LLM provider = Hybrid] → try Ollama first, fall back to API if unavailable
     LLM returns { artist, album }
     → POST vinyl.yourdomain.com/api/discogs/search?q={artist} {album}

Result returned to Electron UI:
  └── MatchConfirmDialog: top 3 Discogs matches with cover images
  └── user confirms → POST vinyl.yourdomain.com/api/vinyls (saves to DB)
```

---

## Settings — Recognition Configuration

Stored per-device in `app.getPath('userData')/settings.json`. Identical UI on both platforms.

| Setting | Options | Notes |
|---|---|---|
| Enable OCR | Toggle on/off | Default: on |
| OCR confidence threshold | Slider 0.0–1.0 | Default: 0.7 |
| LLM provider | Local / Cloud API / Hybrid | — |
| Ollama model | Dropdown from `ollama list` | If Ollama not installed: show banner + link to https://ollama.com/download |
| Cloud provider | OpenAI / Google Gemini | — |
| Cloud model name | Text input | e.g. `gpt-4o`, `gemini-1.5-pro` |
| API keys | Keytar (OS keychain) | Never stored as plaintext; one key per provider |

---

## Data Schema (Drizzle + SQLite)

```typescript
vinyls: {
  id:             integer PK autoincrement
  discogsId:      text unique           // Discogs release ID
  title:          text
  artist:         text
  year:           integer
  label:          text
  genre:          text
  format:         text                  // "LP", "12\"", "7\"", "EP"
  condition:      text                  // M, NM, VG+, VG, G+, G, F, P
  conditionNotes: text
  coverImageUrl:  text                  // Discogs CDN URL — no binary storage
  discogsUrl:     text
  spotifyUrl:     text
  notes:          text
  currentValue:   real                  // cached from Discogs marketplace
  valueUpdatedAt: integer               // unix timestamp of last price fetch
  isDeleted:      integer               // 0/1 soft delete
  deletedAt:      integer
  createdAt:      integer
  updatedAt:      integer
}
```

---

## Project Structure

```
vinyl-catalog/
├── electron/
│   ├── main.ts          — app bootstrap, window management, IPC handlers
│   ├── preload.ts       — contextBridge API (secure IPC to renderer)
│   ├── auth.ts          — OIDC PKCE flow, keytar token management
│   └── sidecar.ts       — spawn/health-check/restart Python sidecar
├── renderer/            — React 19 + Vite (same on both platforms)
│   └── src/
│       ├── components/
│       │   ├── VinylGrid.tsx
│       │   ├── VinylCard.tsx
│       │   ├── RecognitionCamera.tsx
│       │   ├── MatchConfirmDialog.tsx
│       │   ├── CollectionStats.tsx
│       │   └── settings/
│       │       ├── RecognitionSettings.tsx
│       │       ├── OllamaStatus.tsx
│       │       └── ApiKeySettings.tsx
│       ├── hooks/
│       │   ├── useVinyls.ts
│       │   └── useRecognition.ts
│       └── api/
│           └── client.ts    — typed fetch client → vinyl.yourdomain.com
├── sidecar/
│   ├── main.py          — FastAPI app (localhost:8765)
│   ├── ocr.py           — EasyOCR pipeline
│   ├── llm.py           — Ollama + OpenAI/Gemini routing
│   └── requirements.txt
├── backend/             — deployed to Dokploy at vinyl.yourdomain.com
│   ├── src/
│   │   ├── server.ts
│   │   ├── db/
│   │   │   ├── schema.ts     — Drizzle table definitions
│   │   │   └── index.ts      — Drizzle client + migrations
│   │   ├── routes/
│   │   │   ├── vinyls.ts
│   │   │   ├── collection.ts
│   │   │   └── discogs.ts    — Discogs proxy (DISCOGS_TOKEN server-side only)
│   │   └── middleware/
│   │       └── auth.ts       — Authentik JWT validation (JWKS endpoint)
│   └── Dockerfile
└── electron-vite.config.ts
```

---

## Authentication Flow (OIDC PKCE)

1. **Authentik setup:** Create OAuth2 Provider + Application "Vinyl Catalog". Redirect URI: `vinylapp://auth/callback`. Record Client ID (no secret — PKCE flows don't use one).
2. **App launch:** Check keytar for valid access/refresh tokens → skip login if valid.
3. **Login:** `app.setAsDefaultProtocolClient('vinylapp')` → open Authentik URL in system browser → user authenticates → Authentik redirects to `vinylapp://auth/callback?code=...` → Electron catches `open-url` event → PKCE token exchange → tokens stored in keytar.
4. **API requests:** All calls to `vinyl.yourdomain.com/api/*` include `Authorization: Bearer <token>`.
5. **Backend:** `auth.ts` middleware fetches Authentik JWKS endpoint, validates JWT signature + expiry on every request. Returns 401 if invalid.

---

## Implementation Phases

### Phase 1 — Scaffolding
- `electron-vite` init with React 19 + TypeScript
- Drizzle schema + SQLite backend
- Express API with `/api/vinyls` CRUD stubs
- Dockerfile + docker-compose for Dokploy
- Build scripts: `.AppImage` (Linux) + `.dmg` (macOS) via Electron Builder

### Phase 2 — Core Catalog UI
- VinylGrid + VinylCard with Discogs cover image URLs
- Manual add/edit/delete vinyl form
- Collection stats panel: record count, total value, breakdown by genre/format
- Discogs condition grading selector (M → P)

### Phase 3 — Discogs Integration
- Backend proxy routes: `GET /api/discogs/search`, `GET /api/discogs/release/:id`
- Pricing cache: store `currentValue` + `valueUpdatedAt` per vinyl
- `node-cron` background job: refresh stale prices daily
- `DISCOGS_TOKEN` in backend `.env` only — never in Electron or renderer code

### Phase 4 — Recognition Pipeline
- Python sidecar: FastAPI + EasyOCR + Ollama/OpenAI/Gemini routing
- `sidecar.ts`: spawn on app start, health-check loop, restart on crash
- `RecognitionCamera.tsx`: webcam feed via `getUserMedia`
- IPC flow: renderer captures frame → main → sidecar HTTP → result back
- `MatchConfirmDialog.tsx`: top 3 Discogs matches, user confirms

### Phase 5 — Settings UI
- OCR toggle + confidence threshold slider
- Ollama detection: sidecar calls `ollama list`, returns models or "not installed"
- Ollama not installed: banner with link to `https://ollama.com/download`
- LLM provider selector + model name input
- API key management (OpenAI / Gemini) via keytar — no plaintext storage
- Settings persisted to `app.getPath('userData')/settings.json`

### Phase 6 — Authentication
- OIDC PKCE in `auth.ts` (Electron main process)
- `vinylapp://` URL scheme registration
- JWT validation middleware in Express
- Token refresh on 401

### Phase 7 — Polish & Packaging
- UI: **shadcn/ui** + Tailwind (component designs from v0 prompt)
- Electron Builder: `.AppImage` for Arch Linux, `.dmg` for macOS
- Auto-updater via `electron-updater`
- Offline graceful degradation: collection readable from local cache when homelab unreachable

---

## Verification Checklist

- [ ] `curl https://vinyl.yourdomain.com/api/vinyls` (with Bearer token) returns `[]`
- [ ] POST a vinyl → GET returns it
- [ ] `curl https://vinyl.yourdomain.com/api/discogs/search?q=pink+floyd` returns results; `DISCOGS_TOKEN` not visible in response
- [ ] `curl -X POST localhost:8765/recognize -F "image=@cover.jpg"` returns `{ artist, album, confidence, source: "ocr"|"ollama"|"openai"|"gemini" }`
- [ ] Disable Ollama → Settings shows "Ollama is not installed" banner with `https://ollama.com/download` link
- [ ] App launch → system browser → Authentik login → `vinylapp://` redirect → catalog loads
- [ ] Add vinyl on one machine → visible on the other after refresh
- [ ] Collection stats total matches sum of `currentValue` fields
