import { app, BrowserWindow, ipcMain, screen, shell, Menu, session, desktopCapturer } from 'electron'
import { join } from 'path'
import { createIPCHandlers } from './ipc-handlers'
import { createWindowManager } from './window-manager'
import { registerSystemStats } from './system-stats'
import { registerEncoder, shutdownEncoder } from './encoder'
import { registerWhisper } from './whisper'
import { registerLicensing } from './licensing'
import { API_BASE_URL } from './config'
import { AppStore } from './store'

// The Vite dev server legitimately needs 'unsafe-eval', which always triggers
// Electron's dev-only "Insecure Content-Security-Policy" console warning. A
// strict CSP is enforced for the packaged build (see bootstrap), so silence the
// noisy dev warning here. (This flag has no effect on packaged apps.)
if (process.env.NODE_ENV === 'development') {
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'
}

// __dirname is dist/main → DIST is the dist/ root (holds renderer/index.html).
process.env.DIST = join(__dirname, '..')
process.env.VITE_PUBLIC = app.isPackaged
  ? process.env.DIST
  : join(process.env.DIST, '../public')

// In development, always load the live Vite dev server so the window never
// serves stale hashed bundles from a previous `vite build`. Falls back to the
// explicit env var, then to a sensible default dev port.
const DEV_SERVER_URL =
  process.env.VITE_DEV_SERVER_URL ||
  (process.env.NODE_ENV === 'development' ? 'http://localhost:5173/' : '')

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
      // Chromium suspends rAF and clamps timers to ~1Hz in backgrounded
      // windows. For a live switcher that would freeze program output the
      // moment the operator minimises the window or moves to another desktop —
      // the stream must keep running regardless of what has focus.
      backgroundThrottling: false,
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

  if (DEV_SERVER_URL) {
    mainWindow.loadURL(DEV_SERVER_URL)
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
      // The stage display lives on a second monitor and is never focused —
      // without this it would render at 1Hz for the entire service.
      backgroundThrottling: false,
    },
    fullscreen: !!secondDisplay,
    show: false,
    skipTaskbar: true,
  })

  if (DEV_SERVER_URL) {
    stageDisplayWindow.loadURL(`${DEV_SERVER_URL}#/stage-display`)
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

  // Grant camera, microphone, and screen-capture permissions automatically.
  // Without this handler Electron denies all getUserMedia / getDisplayMedia calls.
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    const allowed = ['media', 'display-capture', 'mediaKeySystem']
    callback(allowed.includes(permission))
  })
  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
    const allowed = ['media', 'display-capture', 'mediaKeySystem']
    return allowed.includes(permission)
  })

  // Electron ≥ 22 requires an explicit display-media handler for getDisplayMedia
  // (screen share). Without it, "Add Source → Screen" silently fails. Grant the
  // primary screen automatically so the producer's screen-capture just works.
  session.defaultSession.setDisplayMediaRequestHandler((_request, callback) => {
    desktopCapturer.getSources({ types: ['screen', 'window'] }).then(sources => {
      callback(sources.length ? { video: sources[0] } : {})
    }).catch(() => callback({}))
  })

  // Enforce a strict Content-Security-Policy for the packaged app (file://).
  // The built bundle needs no eval, so this closes the security gap without
  // breaking the dev server (which is left untouched and requires unsafe-eval).
  if (!DEV_SERVER_URL) {
    const apiOrigin = API_BASE_URL
    const csp = [
      "default-src 'self'",
      "img-src 'self' data: blob:",
      "media-src 'self' blob:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self'",
      "font-src 'self' data:",
      // The API origin is baked in at build time; allow it plus secure
      // transports. Without this the packaged app silently fails every
      // request to a deployed backend.
      `connect-src 'self' ${apiOrigin} ${apiOrigin.replace(/^http/, 'ws')} wss: https:`,
    ].join('; ')
    session.defaultSession.webRequest.onHeadersReceived((details, cb) => {
      cb({ responseHeaders: { ...details.responseHeaders, 'Content-Security-Policy': [csp] } })
    })
  }

  createIPCHandlers(store, windowManager)
  registerSystemStats()
  registerEncoder(() => mainWindow)
  registerWhisper()
  registerLicensing()
  createMainWindow()

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

// FFmpeg is a detached child process; without this it can outlive the app and
// keep holding the RTMP connection open, which some platforms treat as a
// still-live stream long after the operator has closed GloryCast.
app.on('before-quit', (event) => {
  event.preventDefault()
  void shutdownEncoder().finally(() => app.exit(0))
})

bootstrap().catch(console.error)
