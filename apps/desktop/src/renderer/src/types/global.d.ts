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

/** What the confidence-monitor (stage display) window actually needs to render. */
export interface StagePayload {
  /** The verse/quote body on stage right now, or null when nothing is live. */
  body: string | null
  reference: string | null
  translation: string | null
  nextUp: string | null
  notes: string | null
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
  /**
   * Capabilities that exist only in the desktop app. They are absent in the
   * browser dev preview, and marking them optional forces every call site to
   * handle that rather than crashing — these cannot be meaningfully stubbed.
   */
  system?: {
    stats: () => Promise<GloryCastSystemStats>
  }
  licence?: {
    status: () => Promise<import('@glorycast/licensing').Entitlement>
    deviceId: () => Promise<string>
    activate: (key: string) => Promise<
      | { ok: true; entitlement: import('@glorycast/licensing').Entitlement }
      | { ok: false; error: string }
    >
    deactivate: () => Promise<{ ok: true; entitlement: import('@glorycast/licensing').Entitlement }>
  }
  whisper?: {
    availability: () => Promise<{
      ready: boolean
      binary: string | null
      installedModels: string[]
      detail: string
    }>
    modelsDir: () => Promise<string>
    transcribe: (payload: { wav: ArrayBuffer; model: string; prompt: string }) => Promise<
      | { ok: true; result: { text: string; elapsedSec: number } | null }
      | { ok: false; error: string }
    >
  }
  encoder?: {
    available: () => Promise<boolean>
    state: () => Promise<string>
    start: (config: unknown) => Promise<{ ok: true } | { ok: false; error: string }>
    stop: () => Promise<{ ok: true }>
    chunk: (data: ArrayBuffer) => void
  }
  /**
   * Translations read from .bib files on disk. Absent in the browser dev
   * preview, where there is no filesystem — callers fall back to the bundled
   * WEB/KJV JSON, so scripture projection still works there.
   */
  bible?: {
    list: () => Promise<Array<{
      id: string; name: string; copyright: string; loaded: boolean; removable: boolean
    }>>
    libraryDir: () => Promise<string>
    import: () => Promise<{ ok: boolean; added: string[]; failed?: string[] }>
    remove: (id: string) => Promise<{ ok: boolean }>
  }
  /** Online translations via API.Bible, using the operator's own key. */
  bibleApi?: {
    keyStatus: () => Promise<{ configured: boolean }>
    setKey: (key: string) => Promise<{ ok: boolean }>
    list: () => Promise<Array<{
      id: string; abbreviation: string; name: string; language: string; isPublicDomain: boolean
    }>>
    verse: (payload: { bibleId: string; book: string; chapter: number; verse?: number; endVerse?: number })
      => Promise<{ text: string }>
    download: (payload: { bibleId: string; abbreviation: string; name: string })
      => Promise<{ ok: boolean; error?: string; verses?: number }>
    verse: (payload: { translation: string; book: string; chapter: number; verse?: number; endVerse?: number })
      => Promise<{ text: string; translation: string }>
    chapter: (payload: { translation: string; book: string; chapter: number })
      => Promise<Array<{ verse: number; text: string }>>
    search: (payload: {
      translation: string
      query: string
      limit?: number
      offset?: number
      mode?: 'all' | 'any' | 'phrase'
      caseSensitive?: boolean
      wholeWord?: boolean
      testament?: 'OT' | 'NT' | 'both'
      books?: string[]
    }) => Promise<{
      results: Array<{ book: string; chapter: number; verse: number; text: string; score: number }>
      total: number
    }>
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
    openBibleDisplay: () => void
    closeBibleDisplay: () => void
  }
  bibleDisplay: {
    send: (payload: {
      text: string | null; reference: string | null
      translation: string | null; mode: 'full' | 'lower-third'
    }) => void
  }
  stage: {
    send: (payload: StagePayload) => void
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
