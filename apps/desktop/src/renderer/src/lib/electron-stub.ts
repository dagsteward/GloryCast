// Provides a no-op window.glorycast API so the renderer works in browser dev mode
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
    },
    on: () => {},
    off: () => {},
  }
}
