/**
 * electron-builder afterPack hook.
 * Creates a Python venv inside the packaged sidecar dir and installs requirements.
 *
 * Called automatically by electron-builder after packing for each platform target.
 * Reference: electron-builder.config.ts → afterPack
 */

const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

/** @param {import('electron-builder').AfterPackContext} context */
exports.default = async function bundleSidecar(context) {
  const platform = context.packager.platform.name // 'linux' | 'mac' | 'windows'
  const sidecarDir = path.join(context.appOutDir, 'resources', 'sidecar')

  if (!fs.existsSync(sidecarDir)) {
    console.warn('[bundle-sidecar] sidecar dir not found at', sidecarDir, '— skipping')
    return
  }

  const pythonBin = platform === 'windows' ? 'python' : 'python3'
  const venvDir = path.join(sidecarDir, '.venv')
  const pipBin =
    platform === 'windows'
      ? path.join(venvDir, 'Scripts', 'pip.exe')
      : path.join(venvDir, 'bin', 'pip')
  const reqFile = path.join(sidecarDir, 'requirements.txt')

  console.log(`[bundle-sidecar] Creating venv at ${venvDir}`)
  execSync(`"${pythonBin}" -m venv "${venvDir}"`, { stdio: 'inherit' })

  console.log('[bundle-sidecar] Installing Python deps...')
  execSync(`"${pipBin}" install -r "${reqFile}" --quiet`, { stdio: 'inherit' })

  console.log('[bundle-sidecar] Done.')
}
