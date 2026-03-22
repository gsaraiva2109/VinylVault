import { contextBridge, ipcRenderer } from 'electron'

// Types are defined in src/types.ts (renderer-safe) and duplicated here
// to avoid cross-compilation context imports

contextBridge.exposeInMainWorld('vinylApp', {
  recognize: (imageBuffer: ArrayBuffer) =>
    ipcRenderer.invoke('recognize', Buffer.from(imageBuffer)),

  getOllamaModels: () =>
    ipcRenderer.invoke('get-ollama-models'),

  readSettings: () =>
    ipcRenderer.invoke('read-settings'),

  writeSettings: (settings: unknown) =>
    ipcRenderer.invoke('write-settings', settings),

  saveApiKey: (provider: 'openai' | 'gemini', key: string): Promise<void> =>
    ipcRenderer.invoke('save-api-key', provider, key),

  getAccessToken: (): Promise<string | null> =>
    ipcRenderer.invoke('get-access-token'),

  startAuthFlow: (): Promise<void> =>
    ipcRenderer.invoke('start-auth-flow')
})
