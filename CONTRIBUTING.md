# Contributing

This project uses [Conventional Commits](https://www.conventionalcommits.org/).

## Dev Setup

### Prerequisites

- Node.js 22+
- pnpm 9+
- PostgreSQL 16
- Rust (for desktop development)

### Backend

```bash
cd api
npm install
cp ../.env.example .env   # configure DATABASE_URL and OIDC vars
npm run dev                # http://localhost:3001
```

### Frontend (web)

```bash
cd web
pnpm install
pnpm dev                   # http://localhost:3000
```

Set `NEXT_PUBLIC_API_URL=http://localhost:3001` in `web/.env.local`.

### Desktop (Tauri)

```bash
cd desktop
pnpm install
pnpm dev                   # starts Tauri dev window
```

Set OIDC vars in `desktop/src-tauri/.env`.

### Full Stack (Docker)

```bash
cp .env.example .env
# edit .env with your values
docker compose up -d
```

## Commit Format

```
<type>[optional scope]: <description>
```

## Common Types

| Type | Use for |
|------|---------|
| `feat` | new feature |
| `fix` | bug fix |
| `chore` | maintenance, deps, tooling |
| `ci` | CI/CD changes |
| `perf` | performance improvement |
| `refactor` | code change with no behavior change |
| `docs` | documentation only |

## Code Style

- **TypeScript**: Strict mode, no `any` without justification
- **React**: Functional components, hooks, keep components under 150 lines
- **Rust**: `anyhow` for error handling, follow standard Rust conventions

## Testing

```bash
# Backend
cd api && npm test

# Frontend typecheck
cd web && pnpm exec tsc --noEmit

# Frontend lint
cd web && pnpm lint
```

## Releasing a New Version

Versioning is managed locally via a release script — **CI does not auto-bump versions**.

```bash
./scripts/release.sh patch     # 1.0.0 → 1.0.1
./scripts/release.sh minor     # 1.0.0 → 1.1.0
./scripts/release.sh major     # 1.0.0 → 2.0.0
./scripts/release.sh 1.2.3     # explicit version
./scripts/release.sh patch --dry-run  # preview only
```

The script:
1. Reads the current version from the root `VERSION` file
2. Updates all manifests atomically
3. Creates a `chore: bump version to vX.Y.Z [skip ci]` commit
4. Creates the `vX.Y.Z` git tag

Then push:
```bash
git push && git push origin vX.Y.Z
```

The `[skip ci]` commit skips the Forgejo pipeline on the branch push. The tag push triggers the full pipeline:
- Docker images built and pushed to GHCR → Dokploy auto-deploys
- Tag mirrored to GitHub → macOS `.dmg` build via GitHub Actions

## Version Bump Guidance

| Change type | Suggested bump |
|-------------|---------------|
| Breaking change | major |
| New user-facing feature | minor |
| Bug fix, refactor, chore | patch |

## Pull Request Workflow

1. Fork the repo
2. Create a feature branch
3. Make changes with conventional commits
4. Ensure lint and typecheck pass
5. Open a PR

## Notes

- The root `VERSION` file is the single source of truth for all versions.
- `[skip ci]` commits are excluded from release changelogs.
