# Architecture: Vinyl Catalog

## Tech Stack
- **Frontend:** Next.js 15 (App Router), Tailwind CSS, shadcn/ui.
- **Backend:** Node.js/Express, Drizzle ORM, SQLite.
- **Auth:** Authentik (OIDC), NextAuth.js.
- **Proxy:** Traefik (Forward Auth for Frontend).

## Authentication Flow
1. **Frontend (Edge):** Traefik intercepts requests to `vinyl.gsaraiva.com.br` and uses Authentik Forward Auth to ensure a session exists.
2. **NextAuth:** The app uses `next-auth` to manage the OIDC handshake with Authentik. It captures the `access_token` and `refresh_token`.
3. **API (Bearer):** The Frontend calls `api-vinyl.gsaraiva.com.br` with the `Authorization: Bearer <token>` header.
4. **JWT Validation:** The Express backend validates the JWT signature against Authentik's JWKS endpoint.

## Token Management
- **Access Token:** Short-lived, used for API requests.
- **Refresh Token:** Long-lived, used by NextAuth to silently rotate the Access Token when it expires (using `offline_access` scope).

## Data Model (Shared Collection)
- Records are stored in a single SQLite database.
- Every record includes `addedBy` and `addedByAvatar` to track which family member scanned it.

## Development Mode
- Controlled via `AUTH_ENABLED` in `.env`.
- When `false`, the API allows requests without a Bearer token.
- Securely bypassed in production by ensuring the `.env` always has `AUTH_ENABLED=true`.
