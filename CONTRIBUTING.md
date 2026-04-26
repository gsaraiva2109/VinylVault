# Contributing

This project uses [Conventional Commits](https://www.conventionalcommits.org/).

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
2. Updates all manifests atomically:
   - `VERSION`
   - `api/src/swagger.ts`
   - `desktop/sidecar/main.py`
   - `desktop/src-tauri/Cargo.toml`
   - `desktop/src-tauri/tauri.conf.json`
   - `desktop/package.json`
   - `web/package.json` + `package-lock.json`
   - `api/package.json` + `package-lock.json`
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

While conventional commit types no longer drive automated version bumps, they remain useful as a signal when deciding what bump to use:

| Change type | Suggested bump |
|-------------|---------------|
| Breaking change | major |
| New user-facing feature | minor |
| Bug fix, refactor, chore | patch |

## Notes

- The root `VERSION` file is the single source of truth for all versions.
- `[skip ci]` commits are excluded from release changelogs.
