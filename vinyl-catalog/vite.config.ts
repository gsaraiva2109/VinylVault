import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') }
  },
  // Tauri expects the dev server on port 1420
  server: {
    port: 1420,
    strictPort: true,
    host: '127.0.0.1',
    watch: {
      // Tell Vite to ignore watching `src-tauri`
      ignored: ['**/src-tauri/**']
    }
  },
  build: {
    outDir: 'dist',
    // Tauri uses ES modules
    target: 'esnext'
  },
  envPrefix: ['VITE_', 'TAURI_ENV_*']
})
