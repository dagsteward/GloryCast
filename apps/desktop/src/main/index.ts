import { app, BrowserWindow, ipcMain, screen, shell, Menu } from 'electron'
import { join } from 'path'
import { createMediaEngine } from './media-engine'
import { createIPCHandlers } from './ipc-handlers'
import { createWindowManager } from './window-manager'
import { AppStore } from './store'

process.env.DIST = join(__dirname, '../..')
process.env.VITE_PUBLIC = app.isPackaged
  ? process.env.DIST
  : join(process.env.DIST, '../public')

let mainWindow: BrowserWindow | null = null
let stageDisplayWindow: BrowserWindow | null = null
let confidenceMonitorWindow: BrowserWindow | null = null

const store = new AppStore()
const windowManager = createWindowManager()

function createMainWindow(): BrowserWindow {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize

  mainWindow = new BrowserWindow({
    width: Math.min(1920, width),
    height: Math.min(1080, height),
    minWidth: 1280,
    minHeight: 720,
    backgroundColor: '#0a0a0f',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
    },
    frame: process.platform !== 'darwin',
    show: false,
    icon: join(process.env.VITE_PUBLIC!, 'icon.png'),
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
    if (process.env.NODE_ENV === 'development') {
      mainWindow?.webContents.openDevTools({ mode: 'detach' })
    }
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(join(process.env.DIST!, 'renderer/index.html'))
  }

  return mainWindow
}

function createStageDisplay(): BrowserWindow {
  const displays = screen.getAllDisplays()
  const secondDisplay = displays.find(d => d.id !== screen.getPrimaryDisplay().id)

  stageDisplayWindow = new BrowserWindow({
    x: secondDisplay?.bounds.x ?? 0,
    y: secondDisplay?.bounds.y ?? 0,
    width: secondDisplay?.bounds.width ?? 1920,
    height: secondDisplay?.bounds.height ?? 1080,
    backgroundColor: '#000000',
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    fullscreen: !!secondDisplay,
    show: false,
    skipTaskbar: true,
  })

  const url = process.env.VITE_DEV_SERVER_URL
    ? `${process.env.VITE_DEV_SERVER_URL}#/stage-display`
    : join(process.env.DIST!, 'renderer/index.html#/stage-display')

  if (process.env.VITE_DEV_SERVER_URL) {
    stageDisplayWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}#stage-display`)
  } else {
    stageDisplayWindow.loadFile(join(process.env.DIST!, 'renderer/index.html'), {
      hash: 'stage-display',
    })
  }

  stageDisplayWindow.once('ready-to-show', () => stageDisplayWindow?.show())
  return stageDisplayWindow
}

async function bootstrap() {
  await app.whenReady()

  createIPCHandlers(store, windowManager)
  createMainWindow()

  const mediaEngine = await createMediaEngine()
  await mediaEngine.initialize()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })

  ipcMain.on('open-stage-display', () => {
    if (!stageDisplayWindow || stageDisplayWindow.isDestroyed()) {
      createStageDisplay()
    } else {
      stageDisplayWindow.focus()
    }
  })

  ipcMain.on('close-stage-display', () => {
    stageDisplayWindow?.close()
    stageDisplayWindow = null
  })

  Menu.setApplicationMenu(null)
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

bootstrap().catch(console.error)
