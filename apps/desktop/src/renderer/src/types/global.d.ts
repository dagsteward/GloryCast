/**
 * Types for the preload bridge exposed at `window.glorycast`.
 *
 * The renderer is built with esbuild and is not type-checked today, so this
 * file is currently documentation that a future `type-check` script will start
 * enforcing. Keep it in sync with src/preload/index.ts.
 *
 * `glorycast` is optional on purpose: the renderer also runs in a plain browser
 * during `npm run dev:renderer`, where no preload script exists. Every call
 * site must handle its absence.
 */

export interface GloryCastSystemStats {
  cpu: number
  gpu: number | null
  memoryUsedMb: number
  memoryTotalMb: number
  memoryPercent: number
}

export interface GloryCastAPI {
  store: {
    get: (key: string) => Promise<unknown>
    set: (key: string, value: unknown) => Promise<void>
    delete: (key: string) => Promise<void>
  }
  dialog: {
    openFile: (filters?: unknown[]) => Promise<string | null>
    openFiles: (filters?: unknown[]) => Promise<string[]>
    openDirectory: () => Promise<string | null>
    saveFile: (options?: unknown) => Promise<string | null>
  }
  system: {
    stats: () => Promise<GloryCastSystemStats>
  }
  encoder: {
    available: () => Promise<boolean>
    state: () => Promise<string>
    start: (config: unknown) => Promise<{ ok: true } | { ok: false; error: string }>
    stop: () => Promise<{ ok: true }>
    chunk: (data: ArrayBuffer) => void
  }
  shell: {
    openPath: (path: string) => Promise<string>
    openExternal: (url: string) => Promise<void>
  }
  window: {
    minimize: () => void
    maximize: () => void
    close: () => void
    setFullscreen: (fullscreen: boolean) => void
    openStageDisplay: () => void
    closeStageDisplay: () => void
  }
  on: (channel: string, callback: (...args: unknown[]) => void) => void
  off: (channel: string, callback: (...args: unknown[]) => void) => void
}

declare global {
  interface Window {
    glorycast?: GloryCastAPI
  }
}

export {}
