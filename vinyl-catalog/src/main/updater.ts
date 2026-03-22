/**
 * Auto-updater using electron-updater (GitHub Releases provider).
 *
 * Behaviour:
 * - Skipped entirely in dev mode
 * - Silently downloads updates in the background
 * - Installs automatically on next app quit (autoInstallOnAppQuit)
 * - Checks on startup, then every 4 hours
 */

import { autoUpdater } from 'electron-updater'
import { is } from '@electron-toolkit/utils'

const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000 // 4 hours

export function initAutoUpdater(): void {
  if (is.dev) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    console.log('[updater] Checking for updates…')
  })

  autoUpdater.on('update-available', (info) => {
    console.log(`[updater] Update available: v${info.version}`)
  })

  autoUpdater.on('update-not-available', () => {
    console.log('[updater] App is up to date')
  })

  autoUpdater.on('update-downloaded', (info) => {
    console.log(`[updater] v${info.version} downloaded — will install on quit`)
  })

  autoUpdater.on('error', (err) => {
    // Non-fatal: log and swallow — update failure should never crash the app
    console.error('[updater] Error:', err.message)
  })

  // Initial check shortly after startup, then on a recurring interval
  setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 10_000)
  setInterval(() => autoUpdater.checkForUpdates().catch(() => {}), CHECK_INTERVAL_MS)
}
