import { spawn, ChildProcess } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import { is } from '@electron-toolkit/utils'
import got from 'got'

let sidecarProcess: ChildProcess | null = null
let healthCheckInterval: NodeJS.Timeout | null = null
let isRestarting = false

function getSidecarDir(): string {
  if (is.dev) {
    return join(__dirname, '../../sidecar')
  }
  // In production, sidecar is in extraResources
  return join(process.resourcesPath, 'sidecar')
}

function getPythonBin(sidecarDir: string): string {
  // Always prefer the local .venv if it exists (works in both dev and production)
  const venvPython =
    process.platform === 'win32'
      ? join(sidecarDir, '.venv', 'Scripts', 'python.exe')
      : join(sidecarDir, '.venv', 'bin', 'python3')

  if (existsSync(venvPython)) return venvPython

  // Dev fallback: system Python (user must have deps installed)
  return process.platform === 'win32' ? 'python' : 'python3'
}

export function startSidecar(): void {
  const sidecarDir = getSidecarDir()
  const pythonBin = getPythonBin(sidecarDir)
  // userData is always writable — sidecar reads settings from there
  const settingsPath = join(app.getPath('userData'), 'settings.json')

  console.log(`[sidecar] Starting from ${sidecarDir}`)

  sidecarProcess = spawn(
    pythonBin,
    ['-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', '8765'],
    {
      cwd: sidecarDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, SIDECAR_SETTINGS_PATH: settingsPath }
    }
  )

  sidecarProcess.stdout?.on('data', (data) => {
    console.log(`[sidecar] ${data.toString().trim()}`)
  })

  sidecarProcess.stderr?.on('data', (data) => {
    console.error(`[sidecar:err] ${data.toString().trim()}`)
  })

  sidecarProcess.on('exit', (code) => {
    console.log(`[sidecar] exited with code ${code}`)
    sidecarProcess = null
  })

  // Give sidecar time to start before health checks begin
  setTimeout(() => scheduleHealthCheck(), 3000)
}

function scheduleHealthCheck(): void {
  healthCheckInterval = setInterval(async () => {
    if (isRestarting || !sidecarProcess) return
    try {
      await got('http://127.0.0.1:8765/health', {
        timeout: { request: 2000 },
        retry: { limit: 0 }
      })
    } catch {
      console.warn('[sidecar] health check failed — restarting')
      restartSidecar()
    }
  }, 5000)
}

function restartSidecar(): void {
  if (isRestarting) return
  isRestarting = true
  stopSidecarProcess()
  setTimeout(() => {
    isRestarting = false
    startSidecar()
  }, 2000)
}

function stopSidecarProcess(): void {
  if (sidecarProcess) {
    sidecarProcess.kill('SIGTERM')
    sidecarProcess = null
  }
}

export function stopSidecar(): void {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval)
    healthCheckInterval = null
  }
  stopSidecarProcess()
}

app.on('before-quit', () => stopSidecar())
