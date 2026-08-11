import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  root: 'src/renderer',
  // Vite's default envDir is `root` (src/renderer), so .env.production placed
  // at the app root — alongside package.json, where every other env file in
  // this repo lives — would be silently ignored. Point it here explicitly so
  // VITE_API_URL is picked up from apps/desktop/.env.production.
  envDir: path.resolve(__dirname),
  // Relative base so the packaged app loads its assets over file:// (Electron
  // loadFile). Absolute "/assets" paths resolve to the drive root under file://
  // and render a blank window.
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer/src'),
      '@glorycast/media-engine': path.resolve(__dirname, '../../packages/media-engine/src/index.ts'),
      '@glorycast/ai-core': path.resolve(__dirname, '../../packages/ai-core/src/index.ts'),
      '@glorycast/licensing': path.resolve(__dirname, '../../packages/licensing/src/index.ts'),
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
