# Changelog

## [1.4.0](https://github.com/gsaraiva2109/VinylVault/compare/v1.3.5...v1.4.0) (2026-08-27)


### ✨ Features

* **ci:** migrate release.yml from semantic-release to release-please ([6abcba7](https://github.com/gsaraiva2109/VinylVault/commit/6abcba77da8e9c9fc6d8f5fadead39f8927c9672)), closes [#206](https://github.com/gsaraiva2109/VinylVault/issues/206)
* tag-only releases with professional release notes and emoji sections ([15e4a4b](https://github.com/gsaraiva2109/VinylVault/commit/15e4a4b0d5391c59466cf7845421630240665857))


### 🐛 Bug Fixes

* check-key falls back to server env vars for Spotify providers ([0f2951a](https://github.com/gsaraiva2109/VinylVault/commit/0f2951a8748f7da08c3577786e539b5c505d6b0c))
* ci: add -k flag to dokploy webhook curl for self-signed certs ([3082bc6](https://github.com/gsaraiva2109/VinylVault/commit/3082bc6686f998a5b5fbfac940de7a75bbfe0966))
* ci: correct SHA256SUMS.txt path in release body update ([9711cca](https://github.com/gsaraiva2109/VinylVault/commit/9711ccac83ba8f712a5142aa27af785b93be1890))
* **ci:** add missing packages field to api/pnpm-workspace.yaml ([c0b3e7f](https://github.com/gsaraiva2109/VinylVault/commit/c0b3e7f0b6ded6d19376699a190f16eb3574b258))
* **ci:** BSD sed brace bug, ghcr node:26 alpha, asset-upload git context ([9cecd02](https://github.com/gsaraiva2109/VinylVault/commit/9cecd02d7c1f5b9800e77bab9089e51024e27663))
* **ci:** BSD sed brace bug, ghcr node:26 alpha, asset-upload git context ([785e150](https://github.com/gsaraiva2109/VinylVault/commit/785e1502ad884139cd034e813b0c63189b51b1e3))
* **ci:** chown workspace back after self-hosted container jobs ([1cd73c9](https://github.com/gsaraiva2109/VinylVault/commit/1cd73c95b588504b329332ee817321618469dd79))
* **ci:** chown workspace back after self-hosted container jobs ([751514e](https://github.com/gsaraiva2109/VinylVault/commit/751514e850c199215678d55e31897dce5fff5cdb))
* **ci:** pin RUSTUP_HOME/CARGO_HOME for check-rust container job ([dcb81d2](https://github.com/gsaraiva2109/VinylVault/commit/dcb81d214b260282327a7b6580d301e67e460848))
* **ci:** pnpm 11 build-script approval + portable sed for macOS ([5f55562](https://github.com/gsaraiva2109/VinylVault/commit/5f55562e3abf780fdd8345fd75f60f9412d2baf6))
* **ci:** pnpm 11 build-script approval + portable sed for macOS ([d786341](https://github.com/gsaraiva2109/VinylVault/commit/d7863418d256d056dcc71e4a352c3a6768c72f66))
* **ci:** scope gha cache export to docker-container buildx leg only ([897d9da](https://github.com/gsaraiva2109/VinylVault/commit/897d9da36de61f964bcdca16e20cb94714c5a251))
* **ci:** scope gha cache export to the docker-container buildx leg only ([8d2a13c](https://github.com/gsaraiva2109/VinylVault/commit/8d2a13c63c436ba070a3190296172b9f5f3731cf))
* **ci:** set RUSTUP_HOME/CARGO_HOME for Tauri Linux build step ([3725ed9](https://github.com/gsaraiva2109/VinylVault/commit/3725ed95c80f8ad984a727f79613d1446ecfd4b4))
* **ci:** set RUSTUP_HOME/CARGO_HOME for Tauri Linux build step ([4b63450](https://github.com/gsaraiva2109/VinylVault/commit/4b6345096471a8e4cd6c77b3d9932bec22050674))
* **ci:** unbreak Linux/macOS Tauri builds and API image push ([7953024](https://github.com/gsaraiva2109/VinylVault/commit/79530248af18b040943c3a6232a296391e974236))
* **ci:** unbreak Linux/macOS Tauri builds and API image push on release.yml ([52fe65e](https://github.com/gsaraiva2109/VinylVault/commit/52fe65e32e738d9fe5c9f898f6ef0b7f3f2f01c4))
* harden OIDC config validation, add next-auth logger, improve error messages ([61f20bd](https://github.com/gsaraiva2109/VinylVault/commit/61f20bd731ce82a9e63acabc5136988d813bf5b4))
* pin Rust toolchain to 1.95.0 in builder image ([bbe3cfd](https://github.com/gsaraiva2109/VinylVault/commit/bbe3cfd364affcd58b8feef25035eae2aec1f706))
* resolve sidebar overlap, auth OIDC crash, and dock overlap on scroll screens ([787470b](https://github.com/gsaraiva2109/VinylVault/commit/787470ba9af421ec438b434067315a49f0c68bd6))
* **web:** replace removed 'next lint' with direct eslint call ([2773baf](https://github.com/gsaraiva2109/VinylVault/commit/2773baff9ebbb8920ac182588634b8811cef046f))
