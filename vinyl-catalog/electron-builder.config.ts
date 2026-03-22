import type { Configuration } from 'electron-builder'

const config: Configuration = {
  appId: 'com.yourdomain.vinyl-catalog',
  productName: 'Vinyl Catalog',
  directories: {
    buildResources: 'resources',
    output: 'dist'
  },
  files: ['out/**/*', 'resources/**/*'],
  extraResources: [
    {
      from: 'sidecar/',
      to: 'sidecar/',
      filter: ['**/*', '!__pycache__', '!*.pyc', '!.venv']
    }
  ],
  linux: {
    target: ['AppImage'],
    category: 'AudioVideo',
    icon: 'resources/icon.png'
  },
  mac: {
    target: ['dmg'],
    hardenedRuntime: true,
    gatekeeperAssess: false,
    icon: 'resources/icon.icns'
  },
  afterPack: './scripts/bundle-sidecar.js',
  // GitHub Releases — electron-updater fetches latest.yml from the release assets.
  // Set GH_TOKEN env var when running `pnpm build:linux` / `pnpm build:mac` to publish.
  // Change owner/repo to match your GitHub repository before first release.
  publish: {
    provider: 'github',
    owner: 'gsaraiva2109',
    repo: 'vinyl-catalog',
    private: true
  }
}

export default config
