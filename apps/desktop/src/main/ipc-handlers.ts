import { ipcMain, dialog, shell } from 'electron'
import type { AppStore } from './store'
import type { WindowManager } from './window-manager'

export function createIPCHandlers(store: AppStore, windowManager: WindowManager) {
  // App settings
  ipcMain.handle('store:get', (_event, key: string) => store.get(key))
  ipcMain.handle('store:set', (_event, key: string, value: unknown) => store.set(key, value))
  ipcMain.handle('store:delete', (_event, key: string) => store.delete(key))

  // File system
  ipcMain.handle('dialog:openFile', async (_event, filters) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: filters ?? [{ name: 'All Files', extensions: ['*'] }],
    })
    return result.filePaths[0] ?? null
  })

  ipcMain.handle('dialog:openFiles', async (_event, filters) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: filters ?? [{ name: 'All Files', extensions: ['*'] }],
    })
    return result.filePaths
  })

  ipcMain.handle('dialog:openDirectory', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    return result.filePaths[0] ?? null
  })

  ipcMain.handle('dialog:saveFile', async (_event, options) => {
    const result = await dialog.showSaveDialog(options ?? {})
    return result.filePath ?? null
  })

  ipcMain.handle('shell:openPath', (_event, path: string) => shell.openPath(path))
  ipcMain.handle('shell:openExternal', (_event, url: string) => shell.openExternal(url))

  // Window management
  ipcMain.on('window:minimize', (event) => {
    const win = windowManager.getWindowFromEvent(event)
    win?.minimize()
  })

  ipcMain.on('window:maximize', (event) => {
    const win = windowManager.getWindowFromEvent(event)
    if (win?.isMaximized()) win.unmaximize()
    else win?.maximize()
  })

  ipcMain.on('window:close', (event) => {
    const win = windowManager.getWindowFromEvent(event)
    win?.close()
  })

  ipcMain.on('window:setFullscreen', (event, fullscreen: boolean) => {
    const win = windowManager.getWindowFromEvent(event)
    win?.setFullScreen(fullscreen)
  })
}
