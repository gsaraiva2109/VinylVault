import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'

// Hyprland / Wayland: disable GPU + use native Wayland to avoid XWayland crashes
if (process.platform === 'linux') {
  app.disableHardwareAcceleration()
  app.commandLine.appendSwitch('ozone-platform', 'wayland')
  // Remote DevTools: open http://localhost:9222 in browser (Chrome/Chromium only)
  app.commandLine.appendSwitch('remote-debugging-port', '9222')
  app.commandLine.appendSwitch('remote-allow-origins', '*')
}
import fs from 'fs'
import { startSidecar, stopSidecar } from './sidecar'
import { getAccessToken, handleAuthCallback, startAuthFlow } from './auth'
import { initAutoUpdater } from './updater'
import got from 'got'
import FormData from 'form-data'
import keytar from 'keytar'

const SETTINGS_PATH = join(app.getPath('userData'), 'settings.json')

const DEFAULT_SETTINGS = {
  ocr: { enabled: true, threshold: 0.7 },
  llm: {
    provider: 'local',
    ollamaModel: '',
    cloudProvider: 'openai',
    cloudModel: 'gpt-4o'
  }
}

function getSettings(): typeof DEFAULT_SETTINGS {
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'))
  } catch {
    return DEFAULT_SETTINGS
  }
}

function saveSettings(settings: typeof DEFAULT_SETTINGS): void {
  // Write to userData — sidecar reads from same path via SIDECAR_SETTINGS_PATH env var
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2))
}

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.on('ready-to-show', () => win.show())

  if (is.dev) {
    win.webContents.openDevTools({ mode: 'detach' })
  }

  // Wayland fallback: ready-to-show sometimes doesn't fire on compositors
  // that don't report window visibility early (e.g. Hyprland)
  setTimeout(() => {
    if (!win.isDestroyed() && !win.isVisible()) win.show()
  }, 4000)

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (is.dev) {
    // electron-vite overwrites ELECTRON_RENDERER_URL to its own Vite server,
    // so we load the Next.js frontend directly instead.
    win.loadURL('http://localhost:3000')
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

// ---------- IPC Handlers ----------

ipcMain.handle('read-settings', () => getSettings())

ipcMain.handle('write-settings', (_, settings) => {
  saveSettings(settings)
})

const KEYTAR_SERVICE = 'vinyl-catalog'

ipcMain.handle('save-api-key', async (_, provider: 'openai' | 'gemini', key: string) => {
  await keytar.setPassword(KEYTAR_SERVICE, `${provider}-api-key`, key)
})

ipcMain.handle('recognize', async (_, imageBuffer: Buffer) => {
  const form = new FormData()
  form.append('image', imageBuffer, { filename: 'frame.jpg', contentType: 'image/jpeg' })

  // Forward stored API keys to the sidecar so it can use the right credentials
  const [openaiKey, geminiKey] = await Promise.all([
    keytar.getPassword(KEYTAR_SERVICE, 'openai-api-key').catch(() => null),
    keytar.getPassword(KEYTAR_SERVICE, 'gemini-api-key').catch(() => null)
  ])
  if (openaiKey) form.append('openaiApiKey', openaiKey)
  if (geminiKey) form.append('geminiApiKey', geminiKey)

  const response = await got.post('http://localhost:8765/recognize', {
    body: form,
    headers: form.getHeaders(),
    responseType: 'json'
  })
  return response.body
})

ipcMain.handle('get-ollama-models', async () => {
  try {
    const response = await got('http://localhost:8765/ollama/models', {
      responseType: 'json',
      timeout: { request: 5000 }
    })
    return response.body
  } catch {
    return { models: [], error: 'sidecar unavailable' }
  }
})

ipcMain.handle('get-access-token', async () => {
  return getAccessToken()
})

ipcMain.handle('start-auth-flow', async () => {
  return startAuthFlow()
})

// ---------- App Lifecycle ----------

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.yourdomain.vinyl-catalog')

  // Register vinylapp:// custom URL scheme (must call before app is ready on macOS)
  app.setAsDefaultProtocolClient('vinylapp')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Handle OIDC redirect: vinylapp://auth/callback?code=...
  app.on('open-url', (_event, url) => {
    if (url.startsWith('vinylapp://auth/callback')) {
      handleAuthCallback(url)
    }
  })

  initAutoUpdater()
  startSidecar()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  stopSidecar()
  if (process.platform !== 'darwin') app.quit()
})
