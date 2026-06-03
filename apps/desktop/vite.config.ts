import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  root: 'src/renderer',
  // Relative base so the packaged app loads its assets over file:// (Electron
  // loadFile). Absolute "/assets" paths resolve to the drive root under file://
  // and render a blank window.
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer/src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: path.resolve(__dirname, 'dist/renderer'),
    emptyOutDir: true,
  },
  define: {
    // Stub window.glorycast in browser dev mode
    'process.env.ELECTRON': JSON.stringify(false),
  },
})
