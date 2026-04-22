## [2.2.3](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/compare/v2.2.2...v2.2.3) (2026-04-22)

### Bug Fixes

* **ci:** improve GitHub release create/upload error visibility, add target_commitish ([c9c8036](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/c9c8036217e4d85088b92ff165566c45b404c636))

## [2.2.2](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/compare/v2.2.1...v2.2.2) (2026-04-22)

### Bug Fixes

* **ci:** capture semantic-release output into GITHUB_OUTPUT so downstream jobs can detect new release ([f400889](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/f400889a70fc842b6734cf73f672444cc75bb924))

## [2.2.1](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/compare/v2.2.0...v2.2.1) (2026-04-22)

### Bug Fixes

* window decorations, responsive layout, extend auth session and token refresh buffer ([3ac0d83](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/3ac0d833c2df25787b70f47d234779b71bedb2d6))

## [2.2.0](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/compare/v2.1.2...v2.2.0) (2026-04-22)

### Features

* **spotify:** seed build-time credentials into keyring at startup and add credentials UI in settings ([1422f53](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/1422f5392d9842c16f2436730151af2518321350))

## [2.1.2](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/compare/v2.1.1...v2.1.2) (2026-04-22)

### Bug Fixes

* **ci:** add GITEA_URL and GITHUB_URL env vars for semantic-release plugins ([15c8363](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/15c83634296bfac6af9605edd4467f6cfc40ab18))
* **ci:** remove @semantic-release/github, fix Gitea token secret, create GitHub release in push-to-github job ([f2db359](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/f2db3599e6369136348ecd53ab858fd34aeb1ee4))
* **ci:** remove explicit token from checkout — use default Forgejo token ([7147e84](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/7147e8440df09ff5830f80cc6f573bb50eba668f))
* **ci:** replace jq with node in sr-bump-version.sh to avoid missing dependency ([0961d5b](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/0961d5ba5d952c5922c7411bc1b9d7eb601a7899))
* **ci:** use GH_TOKEN for semantic-release ([0787ad0](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/0787ad0915d61554d8ae57d55d4af67299ee0099))
* **ci:** use GHCR_TOKEN for Forgejo auth and set real git author ([a60ece4](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/a60ece4068e3a53d6d394a1aa7215cdc76945a24))
