import { BrowserWindow, IpcMainEvent } from 'electron'

export interface WindowManager {
  getWindowFromEvent(event: IpcMainEvent): BrowserWindow | null
}

export function createWindowManager(): WindowManager {
  return {
    getWindowFromEvent(event: IpcMainEvent): BrowserWindow | null {
      return BrowserWindow.fromWebContents(event.sender) ?? null
    },
  }
}
