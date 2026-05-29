// Writes a nested package.json marking the compiled main + preload output as
// CommonJS. The root package.json declares "type": "module" (needed for Vite /
// PostCSS configs), but the Electron main process is compiled to CommonJS and
// relies on __dirname / require, so its output dirs must opt back into CJS.
//
// Run after (or before, in watch mode) `tsc -p tsconfig.main.json`.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const distDirs = ['main', 'preload'].map(d => join(here, '..', 'dist', d))

for (const dir of distDirs) {
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ type: 'commonjs' }, null, 2) + '\n')
}

console.log('electron-cjs: marked dist/main and dist/preload as CommonJS')
