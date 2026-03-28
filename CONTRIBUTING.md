# Commit Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/). The CI auto-release job reads commit messages since the last tag to determine the next version.

## Format

```
<type>[optional scope]: <description>
```

## Version Bump Rules

| Commit prefix | Version bump | Example |
|---------------|-------------|---------|
| `feat!:` `fix!:` `BREAKING CHANGE:` | **major** (X.0.0) | `feat!: redesign auth flow` |
| `feat:` `feat(scope):` | **minor** (x.Y.0) | `feat(ui): add dark mode toggle` |
| anything else | **patch** (x.y.Z) | `fix: correct album art URL` |

## Common Types

- `feat` — new feature
- `fix` — bug fix
- `chore` — maintenance, deps, tooling
- `ci` — CI/CD changes
- `perf` — performance improvement
- `refactor` — code change with no behavior change
- `docs` — documentation only

## Notes

- Commits with `[skip ci]` in the message are excluded from the changelog (used by the auto-release bot).
- The release changelog is generated from all commits between the previous tag and `HEAD`.
