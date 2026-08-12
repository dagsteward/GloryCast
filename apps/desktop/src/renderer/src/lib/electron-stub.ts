// Provides a no-op window.glorycast API so the renderer works in browser dev mode
/** Channel → handlers, for the browser-mode emitter below. */
const _listeners: Record<string, Array<(...args: unknown[]) => void>> = {}

if (typeof window !== 'undefined' && !window.glorycast) {
  window.glorycast = {
    store: {
      get: async () => null,
      set: async () => {},
      delete: async () => {},
    },
    dialog: {
      openFile: async () => null,
      openFiles: async () => [],
      openDirectory: async () => null,
      saveFile: async () => null,
    },
    shell: {
      openPath: async () => '',
      openExternal: async (url) => { window.open(url, '_blank') },
    },
    window: {
      minimize: () => {},
      maximize: () => {},
      close: () => {},
      setFullscreen: () => {},
      openStageDisplay: () => {},
      closeStageDisplay: () => {},
      openBibleDisplay: () => {},
      closeBibleDisplay: () => {},
    },
    // In the browser there's no separate stage-display window/process, so
    // there's nothing to relay to — this only needs to not crash callers.
    stage: {
      send: () => {},
    },
    bibleDisplay: {
      send: () => {},
    },
    // A real (if tiny) emitter rather than no-ops. The stage and scripture
    // display windows are driven entirely by these events, so with no-ops they
    // could never be exercised outside Electron — which is precisely where
    // their layout is easiest to iterate on. `window.glorycast.emit(channel,
    // payload)` from the console now drives them exactly as the main process
    // would.
    on: (channel, callback) => {
      (_listeners[channel] ??= []).push(callback)
    },
    off: (channel, callback) => {
      _listeners[channel] = (_listeners[channel] ?? []).filter(fn => fn !== callback)
    },
    emit: (channel: string, payload: unknown) => {
      for (const fn of _listeners[channel] ?? []) fn(payload)
    },
  }
}
