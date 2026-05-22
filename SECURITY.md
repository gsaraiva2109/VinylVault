# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| latest  | Yes       |
| < latest | No       |

## Reporting a Vulnerability

**Do not open a public issue.** Instead, report vulnerabilities privately:

1. Email [INSERT SECURITY CONTACT] with details
2. Include steps to reproduce, affected versions, and any suggested mitigations
3. Expect acknowledgment within 48 hours
4. We will publish a security advisory after releasing a fix

## Scope

This policy covers the Vinyl Vault application: API server, web frontend, and desktop app.

### In scope

- Authentication bypass
- Data exposure (user collections, API keys)
- Injection vulnerabilities
- Server-side request forgery
- Cross-site scripting (XSS) in the web frontend

### Out of scope

- Vulnerabilities in self-hosted deployment infrastructure (Dokploy, Traefik)
- Brute force attacks against self-hosted Authentik/Keycloak instances
- Social engineering
- Vulnerabilities in third-party services (Discogs, Spotify)
