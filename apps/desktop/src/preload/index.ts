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
  },

  on: (channel: string, callback: (...args: unknown[]) => void) => {
    const validChannels = [
      'stream-stats', 'stream-started', 'stream-ended',
      'frame', 'device-stopped', 'media-ready',
      'scripture-detected', 'transcription-update',
    ]
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_event, ...args) => callback(...args))
    }
  },

  off: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.removeListener(channel, callback as never)
  },
})
