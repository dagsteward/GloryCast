import { contextBridge, ipcRenderer } from 'electron'

// Expose a safe, typed API to the renderer process
contextBridge.exposeInMainWorld('glorycast', {
  store: {
    get: (key: string) => ipcRenderer.invoke('store:get', key),
    set: (key: string, value: unknown) => ipcRenderer.invoke('store:set', key, value),
    delete: (key: string) => ipcRenderer.invoke('store:delete', key),
  },

  dialog: {
    openFile: (filters?: Electron.FileFilter[]) => ipcRenderer.invoke('dialog:openFile', filters),
    openFiles: (filters?: Electron.FileFilter[]) => ipcRenderer.invoke('dialog:openFiles', filters),
    openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
    saveFile: (options?: Electron.SaveDialogOptions) => ipcRenderer.invoke('dialog:saveFile', options),
  },

  system: {
    stats: () => ipcRenderer.invoke('system:stats'),
  },

  licence: {
    status: () => ipcRenderer.invoke('licence:status'),
    deviceId: () => ipcRenderer.invoke('licence:device-id'),
    activate: (key: string) => ipcRenderer.invoke('licence:activate', key),
    deactivate: () => ipcRenderer.invoke('licence:deactivate'),
  },

  whisper: {
    availability: () => ipcRenderer.invoke('whisper:availability'),
    modelsDir: () => ipcRenderer.invoke('whisper:models-dir'),
    transcribe: (payload: { wav: ArrayBuffer; model: string; prompt: string }) =>
      ipcRenderer.invoke('whisper:transcribe', payload),
  },

  encoder: {
    available: () => ipcRenderer.invoke('encoder:available'),
    state: () => ipcRenderer.invoke('encoder:state'),
    start: (config: unknown) => ipcRenderer.invoke('encoder:start', config),
    stop: () => ipcRenderer.invoke('encoder:stop'),
    // Fire-and-forget: a promise per media chunk would add needless overhead
    // at ~4 chunks a second for the whole service.
    chunk: (data: ArrayBuffer) => ipcRenderer.send('encoder:chunk', data),
  },

  bible: {
    list: () => ipcRenderer.invoke('bible:list'),
    libraryDir: () => ipcRenderer.invoke('bible:library-dir'),
    import: () => ipcRenderer.invoke('bible:import'),
    remove: (id: string) => ipcRenderer.invoke('bible:remove', id),
    verse: (payload: { translation: string; book: string; chapter: number; verse?: number; endVerse?: number }) =>
      ipcRenderer.invoke('bible:verse', payload),
    chapter: (payload: { translation: string; book: string; chapter: number }) =>
      ipcRenderer.invoke('bible:chapter', payload),
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
    }) => ipcRenderer.invoke('bible:search', payload),
  },

  bibleApi: {
    keyStatus: () => ipcRenderer.invoke('bibleapi:key-status'),
    setKey: (key: string) => ipcRenderer.invoke('bibleapi:key-set', key),
    list: () => ipcRenderer.invoke('bibleapi:list'),
    verse: (payload: { bibleId: string; book: string; chapter: number; verse?: number; endVerse?: number }) =>
      ipcRenderer.invoke('bibleapi:verse', payload),
    download: (payload: { bibleId: string; abbreviation: string; name: string }) =>
      ipcRenderer.invoke('bibleapi:download', payload),
  },

  shell: {
    openPath: (path: string) => ipcRenderer.invoke('shell:openPath', path),
    openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
  },

  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
    setFullscreen: (fullscreen: boolean) => ipcRenderer.send('window:setFullscreen', fullscreen),
    openStageDisplay: () => ipcRenderer.send('open-stage-display'),
    closeStageDisplay: () => ipcRenderer.send('close-stage-display'),
    openBibleDisplay: () => ipcRenderer.send('open-bible-display'),
    closeBibleDisplay: () => ipcRenderer.send('close-bible-display'),
  },

  bibleDisplay: {
    /** Push a verse to the projection window, or null text to clear it. */
    send: (payload: {
      text: string | null; reference: string | null
      translation: string | null; mode: 'full' | 'lower-third'
    }) => ipcRenderer.send('bible:display', payload),
  },

  stage: {
    // Fire-and-forget: the main process relays this to the stage-display
    // window (a separate renderer process) on every change, so a promise per
    // update would just add latency to a live confidence monitor.
    send: (payload: unknown) => ipcRenderer.send('stage:update', payload),
  },

  on: (channel: string, callback: (...args: unknown[]) => void) => {
    const validChannels = [
      'stream-stats', 'stream-started', 'stream-ended',
      'frame', 'device-stopped', 'media-ready',
      'scripture-detected', 'transcription-update',
      'encoder:stats', 'encoder:state', 'encoder:error', 'encoder:ended',
      'stage:update', 'bibleapi:progress', 'bible:display',
    ]
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_event, ...args) => callback(...args))
    }
  },

  off: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.removeListener(channel, callback as never)
  },
})
