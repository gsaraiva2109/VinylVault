## 1.0.0 (2026-04-26)

### ⚠ BREAKING CHANGES

* Project renamed from vinyl-catalog to vinyl-vault. All package names, context providers, and identifiers updated.

- Rebrand project: vinyl-catalog → vinyl-vault across 40+ files (packages, contexts, types, configs)
- Refactor CI/CD: Move heavy Linux/Docker work to Forgejo; GitHub Actions now builds macOS only
  - New: .forgejo/workflows/build-linux.yml with quality gates, Docker builds, Linux AppImage
  - New: .github/workflows/release-macos.yml for macOS .dmg releases via tauri-action
  - Delete: .github/workflows/{ci,deploy,auto-tag}.yml (redundant after Forgejo migration)
- Move Drizzle migrations from Dockerfile CMD to Express app startup
  - Migrations now run before app.listen(), with proper error handling
  - Ensures API never runs in broken DB state
  - Keeps src/db/migrate.ts for local npm run db:migrate
- Enhance pre-commit hooks: Added frontend (tsc) and backend (tsc) typecheck validation
- Update repository configuration: origin → git.gsaraiva.com.br/gsaraiva2109/vinylvault
- Fix versioning: Updater endpoints use vinylvault (no hyphen) for GitHub releases
- Create VERSION file at root for semantic versioning in CI/CD
- Update .env.example and all Authentik references from vinyl-catalog to vinyl-vault
- Update docker-compose service names: vinyl-vault-api, vinyl-vault-web

### Features

* add `added_by` and `added_by_avatar` columns to the `vinyls` table. ([f178173](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/f178173cfd50a1c24b73b09f2e6f28336e0706e5))
* Add `discogsUrl` field to store and display direct Discogs links for records. ([d761204](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/d761204c592953c591f92dcf4d51acbc89d3675f))
* Add `NEXTAUTH_SECRET` environment variable to Dockerfile for build. ([3454025](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/3454025f0474cb90a009076a22d2f08d86b95254))
* add custom vinyl disc icon for AppImage, .dmg, and web ([488ac92](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/488ac92ebefc7a760e8053d48a4530a0d1862136))
* add missing common components (button, heading, section-wrapper) ([b6879ff](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/b6879fff6058866a9b0df4715e4e4d7891899a88))
* add robust CI/CD with tag-based deployments and Docker image builds ([b755faf](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/b755faf2b70e5598e7fb7f8792f442bdd7acbc66))
* Add root endpoint to return service name and status. ([2a19d27](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/2a19d27438e2a92b10828fd40ffbc62d9891eeee))
* AI scan improvements, Discogs condition pricing, Spotify enrichment, stats UI ([7ffd02c](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/7ffd02c94e009e699d34cd1bcba60d464359bf86))
* **api:** add swagger documentation and initial frontend api client ([94ef6af](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/94ef6af3a7a22b5312b599e19bb395e39b98e5bd))
* **backend:** add groups claim and isDemo flag to auth middleware ([d8757ca](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/d8757ca3ac3c406045b72d10a78c5a33663b3941))
* **backend:** gate write routes with requireWriteAccess and price refresh cooldown ([e15a17d](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/e15a17d8182c9e51dd2eb5e95818c28ed3e0871b))
* Configure Dependabot to group all dependency updates and add `apt-get update` before installing native dependencies in the deploy workflow. ([f933b47](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/f933b476b9e41560c17943589cd2009ff6cf5832))
* **devops:** extensive validation and hardened unified authentication ([7273006](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/72730064de426f25c8f94dacc37b272b9b8d4e45))
* **frontend:** demo mode infrastructure — groups claim, isDemo flag, local store, error types ([1f22573](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/1f2257381b6cea73e4db547235fb8a61ad7539bb))
* **frontend:** demo mode UX — local saves, read-only guards, Spotify block for demo users ([431b529](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/431b52985331d129a35bf2e9d6844086be71a8d6))
* implement live vinyl catalog with double-shield security and shared metadata ([8eeae99](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/8eeae99cf08dae18e09894b833342a2da2002981))
* Implement NextAuth token refreshing and persist Authentik user details for new vinyls in the backend. ([42be704](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/42be704c3384334948b4adf7699ede70ef4b4500))
* Implement NextAuth.js for authentication and remove the architecture documentation. ([f47a7a0](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/f47a7a0275da387a8e99cbfde3838c2e67e72067))
* Implement Spotify and Discogs API integrations, add manual record entry, delete confirmation, and update UI components. ([ec07ddb](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/ec07ddb430d118af2ac83c78aab9bdff9cc19aea))
* Implement standard vinyl condition grading system and improve authentication error handling. ([270f225](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/270f225fd5cc7e7f9a39268afd17ec04df25df90))
* Implement vinyl recognition API service and Spotify integration ([b3b78aa](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/b3b78aa9d62a7bf9b626896976ba165d6f9781fe))
* initialize vinyl recognizer dashboard with React, Vite, and TypeScript ([ba5b29b](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/ba5b29b9f403d9ee68a13d4734243b7e0f05f9f0))
* Migrate from Electron to Tauri v2 with system browser OAuth and CI/CD ([c6a37e5](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/c6a37e5b1379b24a52e9a936f0635935fe662864))
* migrate to PostgreSQL, web-first architecture, single Dokploy deployment ([78c66f5](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/78c66f5d2be83e59050958a1afd2f614aaffee4c))
* migrate to VinylVault with hybrid Forgejo/GitHub CI architecture ([b641d9d](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/b641d9ddb4848660fd640411fce9aea870cfe94f))
* production readiness - error handling, env vars, and build checks ([ae389d2](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/ae389d2a1ad98d0a31b7663aff09b7a86877db5c))
* remove outdated README.md file ([842b706](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/842b706c1f1d1701912a6e7a541115848e948c88))
* Remove Python recognizer component, add ESLint configuration, and clean up frontend imports. ([44162d6](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/44162d692b92226c42247f009986b609079deccc))
* Restore README.md with comprehensive project documentation and setup instructions ([4691edb](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/4691edb1bf324d66278c80d4a1cf093fe1ba3047))
* **settings:** move demo records management to data settings ([847df4f](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/847df4f96c6239ec48ece1af928eef94851f6727))
* **settings:** web/desktop AI split, real brand logos, Spotify connection monitor, dark/light mode sync ([c2b518a](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/c2b518abf6f7d0bcf43d1c1e1eefeb400f15be7a))
* Split Docker Compose configurations for backend and frontend services, update deployment workflow, and configure API URL via build argument. ([1a2e251](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/1a2e25125d86988eefe911dfa2ceeb78f406bde1))
* **spotify:** seed build-time credentials into keyring at startup and add credentials UI in settings ([adb2959](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/adb2959096da1ebc9a4c7e3e091247a97a34132a))

### Bug Fixes

* add author and repository to electron package.json ([3485399](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/3485399978c7425105299c4796b037fe57d217c9))
* add CORS support for Tauri desktop client and reduce keyring log noise ([3445066](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/3445066609fc16c942565800bac824a0a877d074))
* add missing packages field to pnpm-workspace.yaml ([390ccb6](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/390ccb68615d238afab919d6125015cfa6d4866a))
* add NextAuth and Authentik env vars to docker-compose for production ([b57ec12](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/b57ec12749564c1f84afa16aae555971af12c5fe))
* **auth:** add debug logging and compile-time guard for empty auth env vars ([9d1cee3](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/9d1cee37f4cd2d07cbdaf6a0e7785924ef836059))
* **auth:** handle callback port conflicts and support manual macos builds ([f2310e6](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/f2310e637a1d0d92d3f852513873b71624907476))
* **auth:** revert fail-fast throw in authOptions ([015d382](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/015d382e2c8181bbe9f94685cc200310b0780f7e))
* bind Next.js server to all interfaces in Docker ([8393f3c](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/8393f3c77e2fd4acb0a80245d36d3a1126837807))
* **build:** ensure non-empty generateStaticParams for Next.js 15 catch-all routes ([10c96d3](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/10c96d3cd4fa22cae3c25781a758d306f4365ba7))
* **build:** resolve missing API bundle script and Next.js static export error ([2f0bb3e](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/2f0bb3e223504816374ae997f0740f64187eadff))
* **build:** resolve Next.js 15 static export error with build-time override ([92b33c7](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/92b33c718c5c905191f8a480c56bf191a47e0b66))
* **ci:** add apt package cache for check-rust job ([058ab44](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/058ab4455cf071159c4b68e1f85a51435c5d853e))
* **ci:** add binutils to builder image for PyInstaller objdump requirement ([cdf7237](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/cdf72379eca925b9bc515a561c7cad176ee6f516))
* **ci:** add build-essential to builder image, split matrix runners, fix buildx on light-ubuntu ([82e9826](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/82e98267b514bba6b237bd882b75c693abb922cc))
* **ci:** add create-dmg install and APPLE_SIGNING_IDENTITY for ad-hoc DMG signing ([7faeb33](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/7faeb33d21174467ffe9ecf7ebb56098fb1a7907))
* **ci:** add GITEA_URL and GITHUB_URL env vars for semantic-release plugins ([0dbf68b](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/0dbf68b14332218506dbfffc261650e948e48bb6))
* **ci:** build macOS app bundle to produce updater artifacts (.app.tar.gz) ([cc8f4d5](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/cc8f4d5306bb78acb32bed73d216ccf3f9c68fcf))
* **ci:** capture semantic-release output into GITHUB_OUTPUT so downstream jobs can detect new release ([aacd2a7](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/aacd2a77a0cc4bff5da55b67b283750d2066ac47))
* **ci:** exclude test files from tsc typecheck ([36a3f13](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/36a3f13d578e9c37833c1e1733acb0ddf06c0cf1))
* **ci:** fix BSD sed syntax on macOS runner ([85c5fe3](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/85c5fe3a27778b76985035d91db096f10afd1bee))
* **ci:** fix updater artifacts path and latest.json url ([9f9448b](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/9f9448b1c2a55a5cc56f5ba113ea434fd96adc58))
* **ci:** force pull builder image and move docker builds to light-ubuntu ([4b38ab7](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/4b38ab71e00b2a89141bb42b270bc893606cffbc))
* **ci:** improve AppImage signature discovery and add debugging ([2ef5e62](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/2ef5e6250b7bb96a83e2df7c36627420c4772629))
* **ci:** improve GitHub release create/upload error visibility, add target_commitish ([bfc1c43](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/bfc1c43993fd2118867ca8b23b1ffedfb3ff3d31))
* **ci:** remove @semantic-release/github, fix Gitea token secret, create GitHub release in push-to-github job ([f209c94](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/f209c94cebbbeaaa1e7a71ed8e4f58c4675e90d8))
* **ci:** remove broken macOS cfg simulation job ([d0e4422](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/d0e44229aa7cfee4f4c4735b60478937ea43ce1e))
* **ci:** remove dead ad-hoc sign step, extract changelog body for GitHub release ([84f3c97](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/84f3c9707f9207ac55061ba2211ae3fee03359d8))
* **ci:** remove explicit token from checkout — use default Forgejo token ([4f6f4a7](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/4f6f4a77fe40dd2255d264a3aef7b589f9f3a04e))
* **ci:** remove push-tags trigger to prevent double macOS build on release ([d20e324](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/d20e324da70ca007762a6729915141dafb1170c9))
* **ci:** replace jq with node in sr-bump-version.sh to avoid missing dependency ([71de1f5](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/71de1f5b5c3a01de64164f05e20b1d6784bcd948))
* **ci:** revert container options, --pull is not a docker run flag ([2ac3477](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/2ac347734660a18efe711fc641ea6d1d3c2cbd0e))
* **ci:** run docker build jobs on heavy-ubuntu runner ([b560efc](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/b560efcd06e266981f5cd4c54be3f1e391ec7e12))
* **ci:** structured GitHub release body and rename artifacts to Vinyl.Vault_* ([ca5b6f6](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/ca5b6f6a42003620df050c3bc4cc76491480151e))
* **ci:** use GH_TOKEN for semantic-release ([4538161](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/45381614501b8aee8b25883fa60909ee4d24bdee))
* **ci:** use GHCR_TOKEN for Forgejo auth and set real git author ([37a53f3](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/37a53f3262baf5cedf0ba42cb2009aabaaf73e6a))
* copy drizzle migrations into Docker image; add release workflow ([76640e2](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/76640e25e9f446639aefb5c0b23247b3e5385ac3))
* correct detect-changes output wiring in deploy workflow ([9fed248](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/9fed248783ef87fa3070372401b464252adc5853))
* correct frontendDist path relative to src-tauri; block GitHub mirror until all builds pass ([293852a](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/293852a65773f6394564a02b4b36651308094663))
* correct NextAuth token expiry calculation and Authentik refresh URL ([9974b67](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/9974b678c0a2c977910d0605e00bb0f2c8244c2a))
* **deps:** point docker dependabot entries to /web and /api where Dockerfiles live ([472bea5](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/472bea50f16c0a8a4fe8be4328ca70dd092ae541))
* **devops:** allow lockfiles in docker context and enable fail-fast builds ([967c01f](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/967c01fc69df10e92894fc3b1162e5092d96019c))
* **devops:** downgrade artifact actions to v3 for forgejo compatibility and harden tauri build needs ([68879f6](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/68879f6db1fcf73d4da3368f162fe82d9b487d5c))
* **devops:** improve release script with package.json sync and grep fix ([df4aa55](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/df4aa553f42ed2d0c7b19bc620cdfb8158df5d37))
* **devops:** prevent redundant CI runs by adding [skip ci] to release commit ([3dce880](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/3dce8800ab159b22ecf6eb94959a69e49a73fb03))
* **devops:** use full URL for paths-filter and fix release script syntax ([44306a0](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/44306a0a0ce1e8c445c70c215fe4b5f2af5a16dd))
* exclude NextAuth API route from static export build ([9eaeb26](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/9eaeb26ae719c0aaf4e678deac679f649d9d3f58))
* fix YAML parse error in release body (special unicode chars) ([f74f79b](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/f74f79b6deb7655984022513994764837d236c81))
* fixed docker compose forcing build ([8322ca8](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/8322ca883f1f516b3c08f6551acfe6d56824fc80))
* force HOSTNAME=0.0.0.0 in docker-compose for Next.js server binding ([d98277c](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/d98277c75edab8567d38cb9780667487dbb1c0cd))
* force-dynamic on NextAuth route to resolve DYNAMIC_SERVER_USAGE in standalone mode ([b573440](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/b573440b4a54d864ffe1e9abdecf415e100f83ad))
* improve auth error diagnostics and sidecar port conflict handling ([7c8cef5](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/7c8cef51aa9145a6440467e4295971e7c2b5cedc))
* improve error handling for adding vinyl records, specifically for duplicate Discogs IDs, and remove a debug log. ([dde90be](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/dde90befe0c5c9e3f358f3c5dc6dd7ac4661a0f7))
* **lib:** restore window binding in on_window_event closure ([71054e8](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/71054e8177cebf83fb5005fd0db8272917028b2b))
* **lint:** remove unused isDemo import in collection-screen ([b675e07](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/b675e078ff76724f7733fd0cab8d39e90db1297f))
* **linux:** rename _window to window in on_window_event closure ([3026de8](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/3026de8e61075304cac5c77e4ff176538d3ecf01))
* **mac,ci:** resolve objc2 version mismatch and route jobs to specific runner tags ([f79f6de](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/f79f6defaa8a63482a9c0f73758fa565dde3999e))
* macOS build errors and CI quality gate ([810db83](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/810db8369c7f64bc6f8b271df0cc80d16caf51f2))
* **macos-ci:** pass NEXT_PUBLIC_API_URL secret to Next.js build ([964ebff](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/964ebfff99fccd50f2271b8b06ed10cfea4626a7))
* **macos:** add camera entitlement and NSCameraUsageDescription ([685b6d4](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/685b6d46e08ecf8b2dd84b57a7a264ba8a335231))
* **macos:** borrow VNRequest in NSArray::from_slice and suppress window warning ([1039ea8](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/1039ea815ba7e72d5bf73f40b35c3fc38b7bbd41))
* **macos:** deref Retained<VNRequest> for NSArray and handle Tauri v2 direct AppImage signing in CI ([b35a708](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/b35a708b9348f5a2b0a3af0ada3d9e3dced53800))
* **macos:** enable apple-native keyring backend to use real macOS Keychain ([f8d8c00](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/f8d8c001a7831016284bf0345db6dfb4c2b6cab7))
* **macos:** fix objc2 API usage in OCR — AnyThread, cast_unchecked, NSArray::from_id_slice ([d734bb7](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/d734bb78bc15e4d390ec91ecad6be7a3ec68924d))
* **macos:** remove invalid keychain-access-groups and add darwin-aarch64 updater artifacts ([efe10f6](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/efe10f6c284ff246ed649546eee482b77ad89c95))
* **macos:** resolve auth state desync via keychain entitlements and stable IPC listener ([bb68c96](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/bb68c96612c53551b48fd6a4731a393678992b40))
* **mac:** update objc2 syntax and fix unused vars ([d6618e0](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/d6618e0c16fb0e2449f85898ba1d4bb34ee8d299))
* move macOS NSCameraUsageDescription to external Info.plist file ([f68d714](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/f68d7140beccf8c298f4e4cf86f4d82bbdbc492e))
* preserve protocol in Forgejo server URL for git operations ([f0f5360](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/f0f5360ae997b525924b9d41800129789e4c6f53))
* **prod:** resolve API 502 error and Web crash by fixing host and guarding Tauri calls ([9160443](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/9160443dd9d264ab1ec4fc104ff59c28219b04cd))
* **prod:** resolve API unhealthy status and fix frontend re-render loop ([14da8ac](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/14da8ac2d0fdd6f15d6cccaf5750ba6b0107face))
* regenerate Drizzle migrations for PostgreSQL (was SQLite) ([1829c4a](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/1829c4aa28ebc22b3da6ab7bfb539ae40e6dde74))
* remove Python sidecar and update dependencies to support native OCR and external AI providers ([600beeb](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/600beeb332ace9477a786a394400971cdce34ae9))
* replace heredoc with python3 -c to avoid YAML merge-key conflict ([767e615](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/767e61547f5d14f99ffccff51eb8b0c05b9a7c4f))
* resolve browser autofill crashes and record cover rendering ([cac054e](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/cac054e18fbaa4b7b2fc2048676023d2304f274a))
* resolve Next.js build and lint errors ([09cbe27](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/09cbe2738e0004b328bf55535353dbb433dcccb7))
* **security:** address analysis findings across backend and frontend ([b79e60e](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/b79e60e20781d5db39b4f2db62ed0f638ac36e87))
* silent token refresh, CORS headers, and session expiry UX ([b057790](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/b0577903f1a07bffdfb710aa92e0bfa490128612))
* Specify JSON content type and add `ref` parameter to Dokploy redeploy webhooks. ([e270856](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/e270856cf37abf5b2352c2be417783c1345c9000))
* suppress sidecar dead_code warnings on non-Linux and force dmg bundle on macOS build ([5fedc7f](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/5fedc7f84b32b69f11a98cdaf4c421cc48a456f6))
* switch Next.js output mode via NEXT_OUTPUT env var — standalone for Docker, export for Tauri ([4e66d39](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/4e66d39f9d4f001bfe80e1f8b924939a130b8f46))
* sync backend lockfile and fix CI cache paths ([4c183ef](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/4c183ef9a5e300da0537e3cba5f888ed441eaa78))
* Update `NEXT_PUBLIC_API_URL` in the deploy workflow. ([432cd98](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/432cd9868d67ce3102ba2ecc1d2525669383b80e))
* update build command to use shell script in tauri.conf.json ([8dcd908](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/8dcd9087189dd8baed9a68b6f16171bfddfe1553))
* update CI build configuration, add CORS support, improve keyring error logging, and enhance API fetch error handling ([2781715](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/27817153d96799cb92428fd8cd7e5b86330fcef5))
* use static 'force-dynamic' literal to satisfy Next.js 15 route config parser ([a5cfac9](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/a5cfac94096b08a072dde1cfc8bc1fa00d4f11b7))
* window decorations, responsive layout, extend auth session and token refresh buffer ([3cbd964](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/3cbd964ccb7b183122bee8ba952f9c2e57927559))

### Performance Improvements

* trim Cargo deps — minimal tokio features, rustls instead of openssl, openidconnect no default-features ([6d0a691](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/6d0a691f22a693c3d53e1cdd19f42e8d680b130d))

## [2.3.0](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/compare/v2.2.5...v2.3.0) (2026-04-26)

### Features

* **backend:** add groups claim and isDemo flag to auth middleware ([ccd2d82](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/ccd2d8271d8804be28cdd697c72778be73d8b436))
* **backend:** gate write routes with requireWriteAccess and price refresh cooldown ([17b4494](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/17b44946cded4921c3c0d9a1ae6c24e2960c3eaa))
* **frontend:** demo mode infrastructure — groups claim, isDemo flag, local store, error types ([7435fa2](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/7435fa2018cf1f40819a70287ebaf5d3f8d7e9ac))
* **frontend:** demo mode UX — local saves, read-only guards, Spotify block for demo users ([8bb9f96](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/8bb9f96b5bb6fdc686900c678f17b385cf931d70))
* **settings:** move demo records management to data settings ([d2bb915](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/d2bb915893b63cc278f73a445827abe7686021d5))
* **settings:** web/desktop AI split, real brand logos, Spotify connection monitor, dark/light mode sync ([69c3523](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/69c35234cb0a2137e6e93433aa4063b646cb8893))

### Bug Fixes

* **ci:** build macOS app bundle to produce updater artifacts (.app.tar.gz) ([37d088a](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/37d088a4dcc5bf89ed60f06e313436a84298a415))
* **ci:** remove push-tags trigger to prevent double macOS build on release ([b537596](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/b5375969ca597094b2f7875024159cf31684232c))
* **ci:** structured GitHub release body and rename artifacts to Vinyl.Vault_* ([ffa002f](https://git.gsaraiva.com.br/gsaraiva2109/vinylvault/commit/ffa002f07abe3d9d06858acccb16020c4d7b2ef1))
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
