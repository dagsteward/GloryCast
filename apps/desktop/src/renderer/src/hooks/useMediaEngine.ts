/**
 * useMediaEngine — singleton media state via Zustand.
 *
 * Streams (MediaStream objects) live in a module-level Map so they are never
 * serialised into React state and survive re-renders without being cloned.
 * All serialisable metadata (device lists, bus assignments, source labels) is
 * in the Zustand store so components re-render when it changes.
 */
import { create } from 'zustand'

// ─── Types ────────────────────────────────────────────────────────────────────

export type SourceType =
  | 'camera' | 'screen' | 'media' | 'pattern'
  | 'image' | 'color' | 'timer' | 'clock'
  | 'ndi' | 'network'

/** Sources fed over the network (NDI / RTMP-SRT-HLS relays). */
export type NetworkProtocol = 'ndi' | 'rtmp' | 'srt' | 'hls' | 'whep'

export interface MediaSourceMeta {
  id: string
  label: string
  type: SourceType
  deviceId?: string
  active: boolean
  hasVideo: boolean
  hasAudio: boolean
  /** For network sources — connection target + live status. */
  protocol?: NetworkProtocol
  url?: string
  status?: 'connecting' | 'live' | 'offline'
}

export interface AppearanceConfig {
  theme:   'dark' | 'dim' | 'light'
  accent:  'purple' | 'blue' | 'teal' | 'orange' | 'rose'
  density: 'compact' | 'normal' | 'comfortable'
  fontSize: 'sm' | 'md' | 'lg'
  showMonitorLabels: boolean
}

// ─── Module-level singletons (not reactive, survive re-renders) ───────────────

const _streams = new Map<string, MediaStream>()

// Hidden video elements for media file playback
const _mediaVideos = new Map<string, HTMLVideoElement>()

let _uid = 0
function uid(prefix: string) { return `${prefix}-${++_uid}` }

/** Get the actual MediaStream for a source id (null if not started) */
export function getStream(id: string | null | undefined): MediaStream | null {
  if (!id) return null
  return _streams.get(id) ?? null
}

// ─── Test pattern (SMPTE-ish colour bars with clock) ─────────────────────────

function createTestPatternStream(): MediaStream {
  const canvas = document.createElement('canvas')
  canvas.width = 1280; canvas.height = 720
  const ctx = canvas.getContext('2d')!

  const BARS = ['#c0c0c0','#c0c000','#00c0c0','#00c000','#c000c0','#c00000','#0000c0']
  let raf = 0

  function draw() {
    const bw = canvas.width / BARS.length
    BARS.forEach((c, i) => {
      ctx.fillStyle = c
      ctx.fillRect(i * bw, 0, bw, canvas.height * 0.75)
    })
    // Bottom black strip with clock
    ctx.fillStyle = '#000'
    ctx.fillRect(0, canvas.height * 0.75, canvas.width, canvas.height * 0.25)
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 22px monospace'
    ctx.fillText(`GloryCast AI  ·  ${new Date().toLocaleTimeString()}`, 32, canvas.height - 20)
    // Red "TEST" badge
    ctx.fillStyle = '#ef4444'
    ctx.fillRect(canvas.width - 120, canvas.height - 52, 100, 34)
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 18px monospace'
    ctx.fillText('TEST', canvas.width - 107, canvas.height - 29)
    raf = requestAnimationFrame(draw)
  }
  draw()

  const stream = canvas.captureStream(30)
  // Attach cleanup handle
  ;(stream as any).__stopRaf = () => cancelAnimationFrame(raf)
  return stream
}

// ─── Generated canvas sources (color / image / countdown / clock) ─────────────
// These give GloryCast a native source palette comparable to a hardware/software
// switcher — no external app required. Each renders onto a 1080p canvas and is
// captured into a MediaStream so it switches like any camera.

function makeCanvasStream(
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  fps = 12,
): MediaStream {
  const canvas = document.createElement('canvas')
  canvas.width = 1920; canvas.height = 1080
  const ctx = canvas.getContext('2d')!
  let raf = 0
  const loop = () => { draw(ctx, canvas.width, canvas.height); raf = requestAnimationFrame(loop) }
  loop()
  const stream = canvas.captureStream(fps)
  ;(stream as any).__stopRaf = () => cancelAnimationFrame(raf)
  return stream
}

function createColorStream(color: string): MediaStream {
  return makeCanvasStream((ctx, w, h) => {
    ctx.fillStyle = color
    ctx.fillRect(0, 0, w, h)
  }, 4)
}

function createImageStream(url: string): MediaStream {
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.src = url
  let ready = false
  img.onload = () => { ready = true }
  return makeCanvasStream((ctx, w, h) => {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h)
    if (!ready) return
    // Cover-fit the image.
    const ir = img.width / img.height, cr = w / h
    let dw = w, dh = h, dx = 0, dy = 0
    if (ir > cr) { dh = h; dw = h * ir; dx = (w - dw) / 2 }
    else         { dw = w; dh = w / ir; dy = (h - dh) / 2 }
    ctx.drawImage(img, dx, dy, dw, dh)
  }, 4)
}

function createCountdownStream(targetTs: number, label: string): MediaStream {
  return makeCanvasStream((ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, '#0b0b16'); grad.addColorStop(1, '#05050a')
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h)

    const remain = Math.max(0, targetTs - Date.now())
    const m = Math.floor(remain / 60000)
    const s = Math.floor((remain % 60000) / 1000)
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'

    if (label) {
      ctx.font = '600 64px system-ui, sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.72)'
      ctx.fillText(label, w / 2, h / 2 - 180)
    }
    ctx.font = 'bold 280px ui-monospace, monospace'
    ctx.fillStyle = remain === 0 ? '#ef4444' : '#ffffff'
    ctx.fillText(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`, w / 2, h / 2 + 20)
  })
}

function createClockStream(): MediaStream {
  return makeCanvasStream((ctx, w, h) => {
    ctx.fillStyle = '#05050a'; ctx.fillRect(0, 0, w, h)
    const now = new Date()
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.font = 'bold 260px ui-monospace, monospace'
    ctx.fillStyle = '#ffffff'
    ctx.fillText(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), w / 2, h / 2)
    ctx.font = '600 64px system-ui, sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.fillText(now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }), w / 2, h / 2 + 200)
  })
}

// Text / title source — word-wrapped centred text on a solid background.
function createTextStream(text: string, bg = '#0b0b16', fg = '#ffffff'): MediaStream {
  return makeCanvasStream((ctx, w, h) => {
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.font = '700 96px system-ui, sans-serif'
    const words = (text || 'Text').split(/\s+/)
    const lines: string[] = []
    let line = ''
    for (const word of words) {
      const test = line ? `${line} ${word}` : word
      if (ctx.measureText(test).width > w * 0.86 && line) { lines.push(line); line = word }
      else line = test
    }
    if (line) lines.push(line)
    const lh = 120
    const start = h / 2 - ((lines.length - 1) * lh) / 2
    lines.forEach((l, i) => ctx.fillText(l, w / 2, start + i * lh))
  }, 4)
}

// ─── Default appearance ───────────────────────────────────────────────────────

const DEFAULT_APPEARANCE: AppearanceConfig = {
  theme:   'dark',
  accent:  'purple',
  density: 'normal',
  fontSize: 'md',
  showMonitorLabels: true,
}

const ACCENT_VARS: Record<AppearanceConfig['accent'], string> = {
  purple: '124 58 237',
  blue:   '37 99 235',
  teal:   '13 148 136',
  orange: '234 88 12',
  rose:   '225 29 72',
}

function applyAppearance(cfg: AppearanceConfig) {
  const root = document.documentElement
  root.style.setProperty('--accent', ACCENT_VARS[cfg.accent])

  const themes = ['theme-dark','theme-dim','theme-light']
  root.classList.remove(...themes)
  if (cfg.theme !== 'dark') root.classList.add(`theme-${cfg.theme}`)

  root.dataset.density = cfg.density
  root.dataset.fontSize = cfg.fontSize
  try { localStorage.setItem('gc-appearance', JSON.stringify(cfg)) } catch {}
}

function loadAppearance(): AppearanceConfig {
  try {
    const raw = localStorage.getItem('gc-appearance')
    if (raw) return { ...DEFAULT_APPEARANCE, ...JSON.parse(raw) }
  } catch {}
  return DEFAULT_APPEARANCE
}

// ─── Zustand store ────────────────────────────────────────────────────────────

interface MediaEngineState {
  // Device enumeration
  cameras:      MediaDeviceInfo[]
  microphones:  MediaDeviceInfo[]
  permissionState: 'unknown' | 'prompt' | 'granted' | 'denied'

  // Source pool (metadata only — streams in _streams map)
  sources:   MediaSourceMeta[]
  previewId: string | null
  programId: string | null

  // Appearance
  appearance: AppearanceConfig

  // ── Actions ──────────────────────────────────────────────────────────────
  enumerateDevices:  () => Promise<void>
  requestPermission: () => Promise<boolean>
  addCamera:         (deviceId: string, label: string) => Promise<string | null>
  addScreenSource:   () => Promise<string | null>
  addMediaFile:      (file: File) => string
  addTestPattern:    () => string
  // ── Generated sources (native palette — no external switcher needed) ──
  addColorSource:    (color: string, label?: string) => string
  addImageSource:    (file: File) => string
  addCountdownSource:(minutes: number, label?: string) => string
  addClockSource:    () => string
  addTextSource:     (text: string, label?: string) => string
  /** Add an NDI / network ingest source. Tries to attach a live stream from
   *  `url` when one is given (HTTP/MJPEG/MP4/WebM/HLS playable by <video>). */
  addNetworkSource:  (opts: { protocol: NetworkProtocol; url?: string; label?: string }) => string
  removeSource:      (id: string) => void
  /** Reorder the source pool — drag one source onto another's slot. */
  reorderSources:    (fromId: string, toId: string) => void
  assignToPreview:   (id: string) => void
  assignToProgram:   (id: string) => void
  cutToProgram:      () => void
  setAppearance:     (patch: Partial<AppearanceConfig>) => void
}

export const useMediaEngine = create<MediaEngineState>((set, get) => {
  const savedAppearance = loadAppearance()
  applyAppearance(savedAppearance)

  return {
    cameras:         [],
    microphones:     [],
    permissionState: 'unknown',
    sources:         [],
    previewId:       null,
    programId:       null,
    appearance:      savedAppearance,

    // ── enumerateDevices ────────────────────────────────────────────────────
    enumerateDevices: async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        set({
          cameras:     devices.filter(d => d.kind === 'videoinput'),
          microphones: devices.filter(d => d.kind === 'audioinput'),
        })
      } catch (e) {
        console.warn('[MediaEngine] enumerateDevices:', e)
      }
    },

    // ── requestPermission ───────────────────────────────────────────────────
    requestPermission: async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        stream.getTracks().forEach(t => t.stop())
        set({ permissionState: 'granted' })
        await get().enumerateDevices()
        return true
      } catch {
        set({ permissionState: 'denied' })
        return false
      }
    },

    // ── addCamera ───────────────────────────────────────────────────────────
    addCamera: async (deviceId, label) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: deviceId === 'default'
            ? { width: 1280, height: 720 }
            : { deviceId: { exact: deviceId }, width: 1280, height: 720 },
          audio: false,
        })
        const id = uid('cam')
        _streams.set(id, stream)
        set(s => ({
          sources: [...s.sources, {
            id, label, type: 'camera', deviceId,
            active: true, hasVideo: true, hasAudio: false,
          }],
        }))
        return id
      } catch (e) {
        console.warn('[MediaEngine] addCamera:', e)
        return null
      }
    },

    // ── addScreenSource ─────────────────────────────────────────────────────
    addScreenSource: async () => {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: 1920, height: 1080, frameRate: 30 } as MediaTrackConstraints,
          audio: true,
        })
        const id = uid('screen')
        const label = 'Screen Capture'
        _streams.set(id, stream)

        // Auto-remove when user clicks browser "Stop sharing"
        stream.getVideoTracks()[0]?.addEventListener('ended', () => get().removeSource(id))

        set(s => ({
          sources: [...s.sources, {
            id, label, type: 'screen',
            active: true, hasVideo: true, hasAudio: true,
          }],
        }))
        return id
      } catch (e) {
        if ((e as DOMException).name !== 'NotAllowedError')
          console.warn('[MediaEngine] addScreenSource:', e)
        return null
      }
    },

    // ── addMediaFile ────────────────────────────────────────────────────────
    addMediaFile: (file) => {
      const id = uid('media')
      const url = URL.createObjectURL(file)
      const video = document.createElement('video')
      video.src = url; video.loop = true; video.muted = false
      video.play().catch(() => {})
      _mediaVideos.set(id, video)

      const stream: MediaStream | null = (video as any).captureStream?.(30) ?? null
      if (stream) _streams.set(id, stream)

      set(s => ({
        sources: [...s.sources, {
          id, label: file.name, type: 'media',
          active: !!stream, hasVideo: true, hasAudio: true,
        }],
      }))
      return id
    },

    // ── addTestPattern ──────────────────────────────────────────────────────
    addTestPattern: () => {
      const id = uid('pattern')
      const stream = createTestPatternStream()
      _streams.set(id, stream)
      set(s => ({
        sources: [...s.sources, {
          id, label: 'Test Pattern', type: 'pattern',
          active: true, hasVideo: true, hasAudio: false,
        }],
      }))
      return id
    },

    // ── Generated source factories ──────────────────────────────────────────
    addColorSource: (color, label) => {
      const id = uid('color')
      _streams.set(id, createColorStream(color))
      set(s => ({ sources: [...s.sources, {
        id, label: label || 'Color Source', type: 'color',
        active: true, hasVideo: true, hasAudio: false,
      }] }))
      return id
    },

    addImageSource: (file) => {
      const id = uid('image')
      const url = URL.createObjectURL(file)
      _streams.set(id, createImageStream(url))
      set(s => ({ sources: [...s.sources, {
        id, label: file.name.replace(/\.[^.]+$/, ''), type: 'image',
        active: true, hasVideo: true, hasAudio: false,
      }] }))
      return id
    },

    addCountdownSource: (minutes, label) => {
      const id = uid('timer')
      const target = Date.now() + Math.max(0, minutes) * 60000
      _streams.set(id, createCountdownStream(target, label ?? ''))
      set(s => ({ sources: [...s.sources, {
        id, label: label || `Countdown ${minutes}m`, type: 'timer',
        active: true, hasVideo: true, hasAudio: false,
      }] }))
      return id
    },

    addClockSource: () => {
      const id = uid('clock')
      _streams.set(id, createClockStream())
      set(s => ({ sources: [...s.sources, {
        id, label: 'Clock', type: 'clock',
        active: true, hasVideo: true, hasAudio: false,
      }] }))
      return id
    },

    addTextSource: (text, label) => {
      const id = uid('text')
      _streams.set(id, createTextStream(text))
      set(s => ({ sources: [...s.sources, {
        id, label: label || (text ? text.slice(0, 18) : 'Text'), type: 'image',
        active: true, hasVideo: true, hasAudio: false,
      }] }))
      return id
    },

    // ── addNetworkSource (NDI / RTMP-SRT-HLS ingest) ─────────────────────────
    addNetworkSource: ({ protocol, url, label }) => {
      const id = uid(protocol)
      const type: SourceType = protocol === 'ndi' ? 'ndi' : 'network'

      const defaultLabel: Record<NetworkProtocol, string> = {
        ndi: 'NDI Source',
        rtmp: 'RTMP Source', srt: 'SRT Source', hls: 'HLS Source', whep: 'WebRTC Source',
      }

      // Add the metadata immediately so the source shows in the deck while it
      // negotiates a connection.
      set(s => ({
        sources: [...s.sources, {
          id, label: label?.trim() || defaultLabel[protocol], type, protocol, url,
          active: false, hasVideo: true, hasAudio: true,
          status: url ? 'connecting' : 'offline',
        }],
      }))

      // When a directly-playable URL is supplied (vMix HTTP/MJPEG output, an
      // MP4/WebM relay, or a gateway HLS endpoint), attach a live <video> and
      // capture its frames into a MediaStream. Protocols that need a native
      // bridge (raw NDI, SRT) stay as a metadata-only slot until the bridge
      // feeds them a playable URL.
      if (url) {
        const video = document.createElement('video')
        video.src = url
        video.crossOrigin = 'anonymous'
        video.loop = true
        video.muted = false
        video.playsInline = true

        const markLive = () => {
          const stream: MediaStream | null = (video as any).captureStream?.(30) ?? null
          if (stream) _streams.set(id, stream)
          set(s => ({
            sources: s.sources.map(src =>
              src.id === id ? { ...src, active: !!stream, status: stream ? 'live' : 'offline' } : src),
          }))
        }
        const markOffline = () => set(s => ({
          sources: s.sources.map(src => src.id === id ? { ...src, active: false, status: 'offline' } : src),
        }))

        video.addEventListener('canplay', markLive, { once: true })
        video.addEventListener('error', markOffline, { once: true })
        video.play().catch(() => {})
        _mediaVideos.set(id, video)
      }

      return id
    },

    // ── removeSource ────────────────────────────────────────────────────────
    removeSource: (id) => {
      const stream = _streams.get(id)
      if (stream) {
        ;(stream as any).__stopRaf?.()
        stream.getTracks().forEach(t => t.stop())
        _streams.delete(id)
      }
      const video = _mediaVideos.get(id)
      if (video) { video.pause(); video.src = ''; _mediaVideos.delete(id) }
      set(s => ({
        sources:   s.sources.filter(src => src.id !== id),
        previewId: s.previewId === id ? null : s.previewId,
        programId: s.programId === id ? null : s.programId,
      }))
    },

    // ── reorderSources ──────────────────────────────────────────────────────
    reorderSources: (fromId, toId) => set(s => {
      if (fromId === toId) return {}
      const list = [...s.sources]
      const from = list.findIndex(src => src.id === fromId)
      const to   = list.findIndex(src => src.id === toId)
      if (from === -1 || to === -1) return {}
      const [moved] = list.splice(from, 1)
      list.splice(to, 0, moved)
      return { sources: list }
    }),

    // ── Bus assignments ─────────────────────────────────────────────────────
    assignToPreview:  (id) => set({ previewId: id }),
    assignToProgram:  (id) => set({ programId: id }),
    cutToProgram:     ()   => set(s => ({ programId: s.previewId, previewId: null })),

    // ── Appearance ──────────────────────────────────────────────────────────
    setAppearance: (patch) => {
      const next = { ...get().appearance, ...patch }
      applyAppearance(next)
      set({ appearance: next })
    },
  }
})
