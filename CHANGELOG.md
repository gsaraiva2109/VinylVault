## [2.3.0](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/compare/v2.2.5...v2.3.0) (2026-04-26)

### Features

* **backend:** add groups claim and isDemo flag to auth middleware ([ccd2d82](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/ccd2d8271d8804be28cdd697c72778be73d8b436))
* **backend:** gate write routes with requireWriteAccess and price refresh cooldown ([17b4494](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/17b44946cded4921c3c0d9a1ae6c24e2960c3eaa))
* **frontend:** demo mode infrastructure — groups claim, isDemo flag, local store, error types ([7435fa2](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/7435fa2018cf1f40819a70287ebaf5d3f8d7e9ac))
* **frontend:** demo mode UX — local saves, read-only guards, Spotify block for demo users ([8bb9f96](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/8bb9f96b5bb6fdc686900c678f17b385cf931d70))
* **settings:** move demo records management to data settings ([d2bb915](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/d2bb915893b63cc278f73a445827abe7686021d5))
* **settings:** web/desktop AI split, real brand logos, Spotify connection monitor, dark/light mode sync ([69c3523](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/69c35234cb0a2137e6e93433aa4063b646cb8893))

### Bug Fixes

* **ci:** remove push-tags trigger to prevent double macOS build on release ([b537596](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/b5375969ca597094b2f7875024159cf31684232c))
* **lint:** remove unused isDemo import in collection-screen ([3768449](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/37684491f83971f4e405a025c70cf95b8a21f7ff))

## [2.2.5](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/compare/v2.2.4...v2.2.5) (2026-04-25)

### Bug Fixes

* **ci:** add create-dmg install and APPLE_SIGNING_IDENTITY for ad-hoc DMG signing ([eea4d4d](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/eea4d4d93c82e35f5a2f9e19b40ef1cd2582a19c))

## [2.2.4](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/compare/v2.2.3...v2.2.4) (2026-04-22)

### Bug Fixes

* **ci:** remove dead ad-hoc sign step, extract changelog body for GitHub release ([e6de928](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/e6de928874015a759e77ec57d80d77fe9c3b57d2))

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
