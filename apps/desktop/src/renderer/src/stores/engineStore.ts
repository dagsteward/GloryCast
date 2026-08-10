import { create } from 'zustand'

// ─────────────────────────────────────────────────────────────────────────────
// engineStore — live readings published by the media engine.
//
// The compositor emits stats once a second; this is where they land so any part
// of the chrome (top bar, status bar, health widgets) can read them without
// holding a reference to the engine itself.
//
// Until the compositor is mounted into the app these stay null, and the UI
// renders a dash. That is deliberate: an operator must be able to tell "not
// running" apart from "running fine".
// ─────────────────────────────────────────────────────────────────────────────

export interface EngineState {
  /** Composited output rate. Null when the compositor is not running. */
  fps: number | null
  /** Mean milliseconds spent producing a frame. */
  frameTimeMs: number | null
  /** Frames the compositor could not deliver on schedule. */
  droppedFrames: number
  /** Program output resolution, e.g. "1080p60". */
  outputFormat: string | null

  setStats: (stats: {
    fps: number
    frameTimeMs: number
    droppedFrames: number
  }) => void
  setOutputFormat: (format: string | null) => void
  reset: () => void
}

const IDLE = {
  fps: null,
  frameTimeMs: null,
  droppedFrames: 0,
  outputFormat: null,
}

export const useEngineStore = create<EngineState>()((set) => ({
  ...IDLE,

  setStats: ({ fps, frameTimeMs, droppedFrames }) =>
    set({ fps, frameTimeMs, droppedFrames }),

  setOutputFormat: (outputFormat) => set({ outputFormat }),

  reset: () => set(IDLE),
}))
