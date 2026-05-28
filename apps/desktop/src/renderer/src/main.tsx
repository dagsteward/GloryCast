import './styles/globals.css'
import './lib/electron-stub'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'

declare global {
  interface Window {
    glorycast: {
      store: {
        get: (key: string) => Promise<unknown>
        set: (key: string, value: unknown) => Promise<void>
        delete: (key: string) => Promise<void>
      }
      dialog: {
        openFile: (filters?: Electron.FileFilter[]) => Promise<string | null>
        openFiles: (filters?: Electron.FileFilter[]) => Promise<string[]>
        openDirectory: () => Promise<string | null>
        saveFile: (options?: Electron.SaveDialogOptions) => Promise<string | null>
      }
      shell: {
        openPath: (path: string) => Promise<void>
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
  }
}

const root = document.getElementById('root')!
ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
