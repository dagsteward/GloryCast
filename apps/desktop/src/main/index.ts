import { app, BrowserWindow, ipcMain, screen, shell, Menu, session, desktopCapturer } from 'electron'
import { join } from 'path'
import { createIPCHandlers } from './ipc-handlers'
import { createWindowManager } from './window-manager'
import { registerSystemStats } from './system-stats'
import { registerEncoder, shutdownEncoder } from './encoder'
import { registerWhisper, shutdownWhisperServer } from './whisper'
import { registerLicensing } from './licensing'
import { registerBible } from './bible'
import { registerBibleApi } from './bibleApi'
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

// The stage display is a separate renderer process with no shared JS memory,
// so the only way it learns what's actually live is this relayed payload.
// Cached so a stage window opened mid-service (or reopened after a crash)
// shows current state immediately instead of sitting blank until the next
// update fires.
let lastStagePayload: unknown = null

let bibleDisplayWindow: BrowserWindow | null = null
let lastBiblePayload: unknown = null

/**
 * Open (or focus) the congregation-facing scripture window.
 *
 * Prefers a second display so it lands on the projector, but deliberately
 * still opens on a single-monitor machine — an operator setting up before the
 * projector is plugged in must be able to see and position it.
 */
function openBibleDisplay(): BrowserWindow {
  if (bibleDisplayWindow && !bibleDisplayWindow.isDestroyed()) {
    bibleDisplayWindow.focus()
    return bibleDisplayWindow
  }

  const second = screen.getAllDisplays().find(d => d.id !== screen.getPrimaryDisplay().id)

  bibleDisplayWindow = new BrowserWindow({
    x: second?.bounds.x ?? undefined,
    y: second?.bounds.y ?? undefined,
    width: second?.bounds.width ?? 1280,
    height: second?.bounds.height ?? 720,
    backgroundColor: '#000000',
    title: 'GloryCast — Scripture Display',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // Chromium throttles unfocused windows to ~1Hz. This one is never
      // focused during a service, and a throttled projector output would drop
      // transitions on the congregation's screen.
      backgroundThrottling: false,
    },
    fullscreen: !!second,
    show: false,
  })

  if (DEV_SERVER_URL) {
    bibleDisplayWindow.loadURL(`${DEV_SERVER_URL}#/bible-display`)
  } else {
    bibleDisplayWindow.loadFile(join(process.env.DIST!, 'renderer/index.html'), { hash: 'bible-display' })
  }

  bibleDisplayWindow.once('ready-to-show', () => {
    bibleDisplayWindow?.show()
    if (lastBiblePayload !== null) {
      bibleDisplayWindow?.webContents.send('bible:display', lastBiblePayload)
    }
  })

  bibleDisplayWindow.on('closed', () => { bibleDisplayWindow = null })
  return bibleDisplayWindow
}

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

  stageDisplayWindow.once('ready-to-show', () => {
    stageDisplayWindow?.show()
    // Replay the last known state so a window opened mid-service isn't blank.
    if (lastStagePayload !== null) stageDisplayWindow?.webContents.send('stage:update', lastStagePayload)
  })
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
  registerBible()
  registerBibleApi(store)
  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })

  ipcMain.on('open-stage-display', () => openStageDisplay())
  ipcMain.on('close-stage-display', () => closeStageDisplay())

  // Relay live stage content from the main window's renderer to the
  // stage-display window's renderer — the two are separate processes with no
  // shared JS state, so this IPC hop is the only path between them.
  ipcMain.on('stage:update', (_event, payload) => {
    lastStagePayload = payload
    stageDisplayWindow?.webContents.send('stage:update', payload)
  })

  ipcMain.on('open-bible-display', () => openBibleDisplay())
  ipcMain.on('close-bible-display', () => {
    bibleDisplayWindow?.close()
    bibleDisplayWindow = null
  })

  // Congregation-facing scripture output. Same relay shape as the stage
  // display: separate renderer, no shared state, last payload cached so a
  // window opened mid-service shows what is already live.
  ipcMain.on('bible:display', (_event, payload) => {
    lastBiblePayload = payload
    bibleDisplayWindow?.webContents.send('bible:display', payload)
  })

  Menu.setApplicationMenu(buildAppMenu())
}

function openStageDisplay(): void {
  if (!stageDisplayWindow || stageDisplayWindow.isDestroyed()) {
    createStageDisplay()
  } else {
    stageDisplayWindow.focus()
  }
}

function closeStageDisplay(): void {
  stageDisplayWindow?.close()
  stageDisplayWindow = null
}

/**
 * The app menu was previously stripped entirely (`setApplicationMenu(null)`),
 * which meant no Restart, no Exit, no way to reopen a DevTools window you
 * closed, and no keyboard-accessible path to the stage display — everything
 * had to go through the in-app UI. This restores a conventional menu bar in
 * the shape a broadcast operator would expect from vMix or similar switcher
 * software: File for session/lifecycle actions, Edit/View for the standard
 * OS-level affordances, Output for the second-monitor windows, Help for
 * support links.
 */
function buildAppMenu(): Menu {
  const isMac = process.platform === 'darwin'

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Restart GloryCast',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => { app.relaunch(); app.quit() },
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { label: 'Exit', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Output',
      submenu: [
        {
          label: 'Open Scripture Display',
          accelerator: 'CmdOrCtrl+Shift+B',
          click: () => openBibleDisplay(),
        },
        {
          label: 'Close Scripture Display',
          click: () => { bibleDisplayWindow?.close(); bibleDisplayWindow = null },
        },
        { type: 'separator' },
        { label: 'Open Stage Display', click: () => openStageDisplay() },
        { label: 'Close Stage Display', click: () => closeStageDisplay() },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        ...(isMac ? [{ role: 'zoom' } as const, { type: 'separator' } as const, { role: 'front' } as const] : []),
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'GloryCast Support',
          click: () => shell.openExternal('https://glorycast.ai/support'),
        },
        { label: 'About GloryCast', click: () => app.showAboutPanel() },
      ],
    },
  ]

  return Menu.buildFromTemplate(template)
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// FFmpeg is a detached child process; without this it can outlive the app and
// keep holding the RTMP connection open, which some platforms treat as a
// still-live stream long after the operator has closed GloryCast.
app.on('before-quit', (event) => {
  event.preventDefault()
  // The Whisper server is a detached child like FFmpeg; without this it
  // outlives the app and keeps the model resident in RAM.
  shutdownWhisperServer()
  void shutdownEncoder().finally(() => app.exit(0))
})

bootstrap().catch(console.error)
