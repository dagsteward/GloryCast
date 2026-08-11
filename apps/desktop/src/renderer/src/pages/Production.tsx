import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Crown, Menu, Bell, MessageSquare, HelpCircle, ChevronDown, Cpu, Wifi,
  Video, Film, Music2, BookOpen, Sparkles, Users, Image as ImageIcon,
  SlidersHorizontal, Play, Radio, MonitorSmartphone, Settings, Plus,
  LayoutGrid, List, Eye, ThumbsUp, Clock, Mic, Brain, Send,
  RotateCw, Pause, Circle, Link2, ChevronRight, ChevronLeft,
  Camera, Monitor, Palette, Timer as TimerIcon, X, Trash2,
} from 'lucide-react'
import {
  useCompositor, useProgramCanvas, usePreviewCanvas,
  type CompositorController,
} from '../hooks/useCompositor'
import { useMediaEngine, getStream, type SourceType, type NetworkProtocol } from '../hooks/useMediaEngine'
import { useServiceStore } from '../stores/serviceStore'
import { AsrEngineBadge } from '../components/ai/AsrEngineBadge'
import { useAppStore } from '../stores/appStore'
import { useStreamController } from '../hooks/useStreamController'
import { loadTranslation, getVerseText, searchBibleMerged, BUNDLED_TRANSLATIONS } from '../lib/bibleData'
import { cn } from '../lib/utils'

// Canonical 66-book names for reference lookup (matches bundled Bible keys).
const BIBLE_BOOKS = [
  'Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth',
  '1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra',
  'Nehemiah','Esther','Job','Psalms','Proverbs','Ecclesiastes','Song of Solomon',
  'Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel','Hosea','Joel','Amos','Obadiah',
  'Jonah','Micah','Nahum','Habakkuk','Zephaniah','Haggai','Zechariah','Malachi',
  'Matthew','Mark','Luke','John','Acts','Romans','1 Corinthians','2 Corinthians',
  'Galatians','Ephesians','Philippians','Colossians','1 Thessalonians','2 Thessalonians',
  '1 Timothy','2 Timothy','Titus','Philemon','Hebrews','James','1 Peter','2 Peter',
  '1 John','2 John','3 John','Jude','Revelation',
]

/** Parse "John 3:16" / "Psalm 23:1" → {book,chapter,verse}, or null. */
function parseReference(q: string): { book: string; chapter: number; verse: number } | null {
  const m = q.match(/^\s*([1-3]?\s?[A-Za-z][A-Za-z ]*?)\s+(\d{1,3}):(\d{1,3})\s*$/)
  if (!m) return null
  const raw = m[1].replace(/\s+/g, ' ').trim().toLowerCase()
  const book =
    BIBLE_BOOKS.find(b => b.toLowerCase() === raw) ||
    BIBLE_BOOKS.find(b => b.toLowerCase().startsWith(raw)) ||
    (raw === 'psalm' ? 'Psalms' : null)
  if (!book) return null
  return { book, chapter: +m[2], verse: +m[3] }
}

// ═══════════════════════════════════════════════════════════════════════════
// Production — full-screen cinematic broadcast control room (GloryCast OS)
// Wired to the real media engine: live video, working switcher, mixer, timer.
// ═══════════════════════════════════════════════════════════════════════════

function fmtClock(s: number) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}
const fmtMS = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

// Gradient fallbacks for sources that have no live MediaStream yet.
const FALLBACK_GRADIENTS: Record<string, string> = {
  camera: 'from-blue-900 via-cyan-800 to-slate-900',
  screen: 'from-slate-800 via-gray-900 to-black',
  media:  'from-purple-900 via-indigo-800 to-fuchsia-900',
  ndi:    'from-emerald-900 via-teal-800 to-slate-900',
  network:'from-emerald-900 via-teal-800 to-slate-900',
  default:'from-violet-900 via-purple-800 to-indigo-900',
}

// ── Live video element bound to a media-engine stream ──────────────────────

function SourceVideo({ id, type, label, className }: { id: string | null; type?: SourceType; label?: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  // re-run when the sources list changes (a stream may attach after mount)
  const sources = useMediaEngine(s => s.sources)
  useEffect(() => {
    const v = ref.current
    if (!v) return
    const stream = getStream(id)
    if (stream) {
      if (v.srcObject !== stream) { v.srcObject = stream; v.play().catch(() => {}) }
    } else {
      v.srcObject = null
    }
  }, [id, sources])

  const hasStream = !!getStream(id)
  return (
    <div className={cn('relative overflow-hidden bg-black', className)}>
      <video ref={ref} className={cn('w-full h-full object-cover', !hasStream && 'hidden')} muted playsInline autoPlay />
      {!hasStream && (
        <div className={cn('absolute inset-0 bg-gradient-to-br flex items-center justify-center', FALLBACK_GRADIENTS[type ?? 'default'] ?? FALLBACK_GRADIENTS.default)}>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(255,255,255,0.1),transparent_60%)]" />
          {label && <span className="relative text-[11px] text-white/40">{label}</span>}
        </div>
      )}
    </div>
  )
}

export function ProductionPage() {
  // The AI copilot is mounted exactly once, in MainLayout — it owns the mic,
  // the AudioContext, and (for Whisper) the model process. Calling it again
  // here would open a second concurrent audio capture and a second Whisper
  // pipeline every time this page is visited, doubling detections and
  // resource use for no benefit; this page reads its output from
  // serviceStore like everywhere else.

  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(t)
  }, [])

  const sources = useMediaEngine(s => s.sources)
  useEffect(() => {
    // Enumerate the machine's real cameras/mics up front, and turn on the
    // always-listening AI Copilot so scripture detection works here. No demo
    // sources are seeded — the producer adds their real inputs via Add Source.
    useMediaEngine.getState().enumerateDevices()
    useServiceStore.getState().setAiListening(true)
  }, [])

  // Producer-controlled projection. Nothing is shown until the producer pushes
  // a verse to the live program output or the in-house stage display — no
  // static lower-third. `liveGraphic` = on-air lower third; `stageGraphic` =
  // confidence / stage-display feed.
  const [liveGraphic, setLiveGraphic] = useState<Graphic | null>(null)
  const [stageGraphic, setStageGraphic] = useState<Graphic | null>(null)
  const [streaming, setStreaming] = useState(false)

  // The GPU compositor produces the actual program frame. The live graphic is
  // passed in so scripture is composited into the output rather than being a
  // DOM overlay the stream would never see.
  const compositor = useCompositor(liveGraphic)

  return (
    // Chrome (brand rail, top bar, status bar) now lives in MainLayout so every
    // page shares it. This page renders only the control-room content.
    <div className="w-full h-full overflow-y-auto p-3 space-y-3 text-white/90 select-none">
      <TopDeck
        elapsed={elapsed} streaming={streaming} compositor={compositor}
        liveGraphic={liveGraphic} setLiveGraphic={setLiveGraphic}
        stageGraphic={stageGraphic} setStageGraphic={setStageGraphic}
      />
      <BottomDeck streaming={streaming} setStreaming={setStreaming} />
    </div>
  )
}

export interface Graphic { ref: string; text: string; translation?: string }

function Panel({ title, right, children, className }: {
  title?: string; right?: React.ReactNode; children: React.ReactNode; className?: string
}) {
  return (
    <section className={cn('rounded-xl bg-[#0c0c15] border border-white/[0.06] flex flex-col min-h-0', className)}>
      {title && (
        <div className="flex items-center justify-between px-3 h-9 shrink-0 border-b border-white/[0.05]">
          <h3 className="text-[12px] font-semibold tracking-wide text-white/75 uppercase">{title}</h3>
          {right}
        </div>
      )}
      <div className="flex-1 min-h-0">{children}</div>
    </section>
  )
}

// ── Top deck ───────────────────────────────────────────────────────────────

function TopDeck({ elapsed, streaming, compositor, liveGraphic, setLiveGraphic, stageGraphic, setStageGraphic }: {
  elapsed: number
  streaming: boolean
  compositor: CompositorController
  liveGraphic: Graphic | null
  setLiveGraphic: (v: Graphic | null) => void
  stageGraphic: Graphic | null
  setStageGraphic: (v: Graphic | null) => void
}) {
  return (
    <div className="grid grid-cols-12 gap-3">
      <div className="col-span-7 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <ProgramMonitor elapsed={elapsed} streaming={streaming} graphic={liveGraphic} clearGraphic={() => setLiveGraphic(null)} />
          <PreviewMonitor compositor={compositor} />
        </div>
        <SourcesPanel />
      </div>
      <div className="col-span-2"><AiAssistant onLive={setLiveGraphic} onStage={setStageGraphic} liveRef={liveGraphic?.ref} stageRef={stageGraphic?.ref} /></div>
      <div className="col-span-3"><StagePanel graphic={stageGraphic} clearGraphic={() => setStageGraphic(null)} /></div>
    </div>
  )
}

function ProgramMonitor({ elapsed, streaming, graphic, clearGraphic }: {
  elapsed: number; streaming: boolean; graphic: Graphic | null; clearGraphic: () => void
}) {
  const programId = useMediaEngine(s => s.programId)
  const sources   = useMediaEngine(s => s.sources)
  const prog = sources.find(s => s.id === programId)

  const hostRef = useRef<HTMLDivElement>(null)
  useProgramCanvas(hostRef)

  return (
    <div className={cn('rounded-xl overflow-hidden border bg-black flex flex-col', streaming ? 'border-red-500/40' : 'border-white/10')}>
      <div className="flex items-center justify-between px-3 h-8 bg-[#0c0c15] border-b border-white/[0.05]">
        <span className="flex items-center gap-2 text-[12px] font-bold">
          <span className={cn('w-2 h-2 rounded-full', streaming ? 'live-dot bg-red-500' : 'bg-white/30')} />
          <span className={streaming ? 'text-red-400' : 'text-white/60'}>PROGRAM</span>
          <span className="text-white/45 font-medium">{streaming ? '(LIVE)' : '(STANDBY)'}</span>
        </span>
        <span className="text-[11px] text-white/40 font-mono truncate max-w-[110px]">{prog?.label ?? 'No Program'}</span>
      </div>
      {/* The composited program frame. This canvas IS the output — what the
          congregation and the stream see — so any graphic must be a compositor
          layer, never a DOM overlay sitting on top of it. */}
      <div className="relative aspect-video bg-black group">
        <div ref={hostRef} className="absolute inset-0" />

        {!programId && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-[11px] text-white/30">No Program</span>
          </div>
        )}

        {graphic && (
          <button
            onClick={clearGraphic}
            title="Clear live graphic"
            className="absolute top-2 right-2 w-6 h-6 rounded-md bg-black/60 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X size={13} className="text-white/80" />
          </button>
        )}
      </div>
      <div className="flex items-center gap-4 px-3 h-9 bg-[#0c0c15] text-[11px]">
        {streaming
          ? <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-600 text-white font-bold"><Circle size={7} className="fill-white" /> LIVE</span>
          : <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/10 text-white/50 font-bold">OFF AIR</span>}
        <span className="flex items-center gap-1 text-white/65"><Eye size={12} /> {streaming ? '—' : '0'}</span>
        <span className="flex items-center gap-1 text-white/65"><ThumbsUp size={12} /> {streaming ? '—' : '0'}</span>
        <span className="flex items-center gap-1 text-white/65 ml-auto font-mono"><Clock size={12} /> {streaming ? fmtClock(elapsed) : '00:00:00'}</span>
      </div>
    </div>
  )
}

/** UI label → compositor transition. "MOVE" is a slide in broadcast parlance. */
const TRANSITIONS = [
  { label: 'CUT',  kind: 'cut'   as const },
  { label: 'FADE', kind: 'fade'  as const },
  { label: 'MOVE', kind: 'slide' as const },
  { label: 'WIPE', kind: 'wipe'  as const },
]

const DURATIONS = [0.5, 1.0, 1.5, 2.0]

function PreviewMonitor({ compositor }: { compositor: CompositorController }) {
  const previewId = useMediaEngine(s => s.previewId)
  const sources   = useMediaEngine(s => s.sources)
  const prev = sources.find(s => s.id === previewId)

  const [trans, setTrans]       = useState<typeof TRANSITIONS[number]>(TRANSITIONS[1])
  const [duration, setDuration] = useState(1.0)
  const [busy, setBusy]         = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  usePreviewCanvas(canvasRef)

  const take = () => {
    if (!previewId || busy) return
    if (trans.kind === 'cut') {
      compositor.cut()
      return
    }
    // Lock TAKE for the duration of the move so a second press can't fire
    // mid-transition — a double-punched take during a service is a real risk.
    setBusy(true)
    compositor.take(trans.kind, duration * 1000)
    setTimeout(() => setBusy(false), duration * 1000)
  }

  return (
    <div className="rounded-xl overflow-hidden border border-emerald-500/30 bg-black flex flex-col">
      <div className="flex items-center justify-between px-3 h-8 bg-[#0c0c15] border-b border-white/[0.05]">
        <span className="text-[12px] font-bold text-emerald-300/90">PREVIEW</span>
        <span className="text-[11px] text-white/40 font-mono truncate max-w-[110px]">{prev?.label ?? '—'}</span>
      </div>
      {/* Composed preview — the same render path as program, so what you see
          here is exactly what a TAKE will put on air. */}
      <div className="relative aspect-video bg-black">
        <canvas ref={canvasRef} className="w-full h-full object-cover" />
        {!previewId && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-[11px] text-white/30">Select a source below</span>
          </div>
        )}
      </div>

      <div className="px-3 py-2.5 bg-[#0c0c15] space-y-2.5">
        <div className="grid grid-cols-4 gap-1.5">
          {TRANSITIONS.map(t => (
            <button
              key={t.label}
              onClick={() => setTrans(t)}
              className={cn(
                'py-1.5 rounded-lg text-[11px] font-bold tracking-wide transition-colors',
                trans.label === t.label
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/[0.05] text-white/50 hover:bg-white/10',
              )}
            >{t.label}</button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          {DURATIONS.map(d => (
            <button
              key={d}
              onClick={() => setDuration(d)}
              disabled={trans.kind === 'cut'}
              className={cn(
                'px-2 py-1 rounded-md text-[10.5px] font-mono transition-colors',
                trans.kind === 'cut'
                  ? 'text-white/20 cursor-not-allowed'
                  : duration === d
                    ? 'bg-white/15 text-white/90'
                    : 'text-white/40 hover:bg-white/[0.07]',
              )}
            >{d.toFixed(1)}s</button>
          ))}
        </div>

        <button
          onClick={take}
          disabled={!previewId || busy}
          className={cn(
            'w-full py-2 rounded-lg text-[13px] font-bold tracking-wider transition-colors',
            !previewId || busy
              ? 'bg-white/[0.05] text-white/25 cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white hover:from-purple-500 hover:to-fuchsia-500',
          )}
        >
          {busy ? `${trans.label}…` : 'TAKE'}
        </button>
      </div>
    </div>
  )
}

// ── Sources panel (real, switchable) ───────────────────────────────────────

const ALL_TYPES: SourceType[] = ['camera', 'screen', 'media', 'pattern', 'image', 'color', 'timer', 'clock', 'ndi', 'network']
const CATEGORIES: { label: string; types: SourceType[] }[] = [
  { label: 'ALL SOURCES',     types: ALL_TYPES },
  { label: 'VIDEO',           types: ['camera', 'screen', 'pattern'] },
  { label: 'MEDIA',           types: ['media', 'image', 'color'] },
  { label: 'NDI / NETWORK',   types: ['ndi', 'network'] },
  { label: 'VIRTUAL',         types: ['color', 'timer', 'clock', 'pattern', 'image'] },
]

const SOURCE_ICON: Record<string, typeof Camera> = {
  camera: Camera, screen: Monitor, media: Film, image: ImageIcon,
  color: Palette, timer: TimerIcon, clock: Clock, pattern: Cpu, ndi: Link2, network: Wifi,
}

function SourcesPanel() {
  const sources   = useMediaEngine(s => s.sources)
  const previewId = useMediaEngine(s => s.previewId)
  const programId = useMediaEngine(s => s.programId)
  const assignToPreview = useMediaEngine(s => s.assignToPreview)
  const assignToProgram = useMediaEngine(s => s.assignToProgram)
  const removeSource    = useMediaEngine(s => s.removeSource)

  const [tab, setTab] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const imageRef = useRef<HTMLInputElement>(null)

  const cat = CATEGORIES[tab]
  const list = sources.filter(s => cat.types.includes(s.type))

  // After adding, reveal it: jump to ALL, load it onto Preview, and reset the
  // Add Source menu back to its root so the next open doesn't resume mid-flow.
  const [menuView, setMenuView] = useState<'root' | 'camera' | 'network'>('root')
  const [networkProtocol, setNetworkProtocol] = useState<NetworkProtocol | null>(null)
  const reveal = (id: string | null) => {
    setMenuOpen(false)
    setMenuView('root')
    setNetworkProtocol(null)
    setTab(0)
    if (id) useMediaEngine.getState().assignToPreview(id)
  }
  const [camError, setCamError] = useState<string | null>(null)
  const cameras = useMediaEngine(s => s.cameras)

  // Camera used to always grab whatever the OS calls "default" — with two or
  // three cameras plugged in (the normal case for a multi-camera service)
  // there was no way to reach camera 2 or 3 at all. This opens a picker over
  // the real enumerated device list instead.
  const openCameraPicker = async () => {
    setCamError(null)
    const me = useMediaEngine.getState()
    if (me.permissionState !== 'granted') {
      const ok = await me.requestPermission()
      if (!ok) { setCamError('Camera permission denied'); return }
    }
    await me.enumerateDevices()
    setMenuView('camera')
  }
  const pickCamera = async (deviceId: string, label: string) => {
    const id = await useMediaEngine.getState().addCamera(deviceId, label)
    if (!id) { setCamError('Could not start that camera — it may be in use by another app'); return }
    reveal(id)
  }

  const addScreen = async () => {
    setCamError(null)
    const id = await useMediaEngine.getState().addScreenSource()
    // A null result from cancelling the OS share picker is an expected,
    // silent outcome — not an error worth interrupting the operator over.
    if (id) reveal(id)
  }
  const addColor  = () => reveal(useMediaEngine.getState().addColorSource('#1e293b', 'Color'))
  const addClock  = () => reveal(useMediaEngine.getState().addClockSource())
  const addTimer  = () => reveal(useMediaEngine.getState().addCountdownSource(5, 'Countdown'))
  const addBars   = () => reveal(useMediaEngine.getState().addTestPattern())

  // NDI / Network had its own category tab and a fully working store method
  // (addNetworkSource) but no way to reach it from Add Source — the entire
  // category could show sources yet never gain one.
  const connectNetwork = (label: string, url: string) => {
    if (!networkProtocol) return
    const id = useMediaEngine.getState().addNetworkSource({
      protocol: networkProtocol,
      url: url.trim() || undefined,
      label: label.trim() || undefined,
    })
    reveal(id)
  }

  return (
    <Panel className="bg-[#0c0c15]">
      <div className="flex items-center gap-1 px-3 h-10 border-b border-white/[0.05] overflow-x-auto">
        {CATEGORIES.map((c, i) => (
          <button
            key={c.label}
            onClick={() => setTab(i)}
            className={cn(
              'px-2.5 py-1 rounded-md text-[10.5px] font-semibold tracking-wide whitespace-nowrap transition-colors',
              tab === i ? 'text-purple-300 bg-purple-600/15' : 'text-white/40 hover:text-white/70',
            )}
          >{c.label}</button>
        ))}
        <div className="ml-auto relative flex items-center gap-2">
          <button onClick={() => setMenuOpen(o => !o)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-600/80 hover:bg-purple-600 text-[11px] font-medium text-white">
            <Plus size={12} /> Add Source
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => reveal(null)} />
              <div className="absolute right-0 top-8 z-40 w-56 rounded-lg bg-[#15151f] border border-white/10 shadow-2xl p-1.5">
                {menuView === 'root' && (
                  <div className="space-y-0.5">
                    <AddItem icon={Camera}  label="Camera"        onClick={openCameraPicker} />
                    <AddItem icon={Monitor} label="Screen Share"  onClick={addScreen} />
                    <AddItem icon={Link2}   label="NDI / Network" onClick={() => setMenuView('network')} />
                    <AddItem icon={Film}    label="Media File"    onClick={() => fileRef.current?.click()} />
                    <AddItem icon={ImageIcon} label="Image"       onClick={() => imageRef.current?.click()} />
                    <AddItem icon={Palette} label="Color"         onClick={addColor} />
                    <AddItem icon={TimerIcon} label="Countdown"   onClick={addTimer} />
                    <AddItem icon={Clock}   label="Clock"         onClick={addClock} />
                    <AddItem icon={Cpu}     label="Test Pattern"  onClick={addBars} />
                  </div>
                )}

                {menuView === 'camera' && (
                  <div className="p-0.5">
                    <BackRow onClick={() => setMenuView('root')} />
                    {cameras.length === 0 ? (
                      <p className="px-2 py-3 text-[10.5px] text-white/40 leading-relaxed">
                        No cameras detected. Check the camera is connected and not in use by another app.
                      </p>
                    ) : (
                      cameras.map(c => (
                        <button
                          key={c.deviceId}
                          onClick={() => pickCamera(c.deviceId, c.label || 'Camera')}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] text-white/80 hover:bg-white/[0.06] text-left transition-colors"
                        >
                          <Camera size={12} className="text-purple-300 shrink-0" />
                          <span className="truncate">{c.label || 'Camera'}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}

                {menuView === 'network' && !networkProtocol && (
                  <div className="p-0.5">
                    <BackRow onClick={() => setMenuView('root')} />
                    {NETWORK_PROTOCOLS.map(p => (
                      <button
                        key={p}
                        onClick={() => setNetworkProtocol(p)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] text-white/80 hover:bg-white/[0.06] text-left transition-colors"
                      >
                        <Link2 size={12} className="text-purple-300 shrink-0" />
                        {PROTOCOL_META[p].label}
                      </button>
                    ))}
                  </div>
                )}

                {networkProtocol && (
                  <NetworkConnectForm
                    protocol={networkProtocol}
                    onCancel={() => setNetworkProtocol(null)}
                    onConnect={connectNetwork}
                  />
                )}
              </div>
            </>
          )}
          <button className="w-7 h-7 rounded-md bg-white/[0.04] flex items-center justify-center text-white/40 hover:text-white/70"><List size={13} /></button>
          <button className="w-7 h-7 rounded-md bg-purple-600/20 flex items-center justify-center text-purple-300"><LayoutGrid size={13} /></button>
        </div>
      </div>

      <input ref={fileRef} type="file" accept="video/*,audio/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) reveal(useMediaEngine.getState().addMediaFile(f)); e.target.value = '' }} />
      <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) reveal(useMediaEngine.getState().addImageSource(f)); e.target.value = '' }} />
      {camError && <div className="px-3 py-1 text-[10px] text-red-400 bg-red-500/10 border-b border-red-500/20">{camError}</div>}

      {list.length === 0 ? (
        <div className="p-8 text-center text-white/30">
          <Plus size={22} className="mx-auto mb-2 opacity-40" />
          <p className="text-[12px]">No {cat.label.toLowerCase()} yet — click <span className="text-purple-300 font-medium">Add Source</span></p>
        </div>
      ) : (
        <div className="p-2.5 grid grid-cols-7 gap-2">
          {list.map(s => {
            const onPgm = s.id === programId, onPvw = s.id === previewId
            const Icon = SOURCE_ICON[s.type] ?? Video
            return (
              <div
                key={s.id}
                onClick={() => assignToPreview(s.id)}
                onDoubleClick={() => assignToProgram(s.id)}
                title="Click → Preview · Double-click → Program"
                className={cn(
                  'rounded-lg overflow-hidden border bg-black/40 group cursor-pointer transition-colors relative',
                  onPgm ? 'border-red-500' : onPvw ? 'border-emerald-500' : 'border-white/[0.07] hover:border-purple-500/40',
                )}
              >
                <SourceVideo id={s.id} type={s.type} label={s.label} className="aspect-video" />
                {onPgm && <span className="absolute top-1 right-1 px-1 py-px rounded bg-red-600 text-[7px] font-bold text-white">PGM</span>}
                {onPvw && <span className="absolute top-1 right-1 px-1 py-px rounded bg-emerald-600 text-[7px] font-bold text-white">PVW</span>}
                <button
                  onClick={e => { e.stopPropagation(); removeSource(s.id) }}
                  className="absolute top-1 left-1 w-4 h-4 rounded bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                ><Trash2 size={9} className="text-white/70" /></button>
                <div className="px-1.5 py-1 bg-[#0a0a12] flex items-center gap-1">
                  <Icon size={9} className="text-white/40 shrink-0" />
                  <span className="text-[9.5px] font-medium text-white/75 truncate">{s.label}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Panel>
  )
}

function AddItem({ icon: Icon, label, onClick }: { icon: typeof Camera; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[12px] text-white/70 hover:bg-white/[0.06] hover:text-white">
      <Icon size={13} className="text-purple-300" /> {label}
    </button>
  )
}

function BackRow({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 text-[9px] text-white/40 hover:text-white/70 mb-1.5 px-1.5 py-1 transition-colors">
      <ChevronLeft size={10} /> Back
    </button>
  )
}

// ── NDI / Network connect form ──────────────────────────────────────────────
// Every protocol GloryCast can ingest, with the same copy the (previously
// unwired) SourceGrid component used — protocol-specific hint and placeholder
// so an operator knows exactly what to paste.

const NETWORK_PROTOCOLS: NetworkProtocol[] = ['ndi', 'rtmp', 'srt', 'hls', 'whep']

const PROTOCOL_META: Record<NetworkProtocol, { label: string; hint: string; placeholder: string }> = {
  ndi:  { label: 'NDI Source',    hint: 'Receive an NDI stream from a PTZ camera, encoder, or another machine on the LAN.', placeholder: 'NDI source name  e.g. STUDIO-PC (Channel 1)' },
  rtmp: { label: 'Stream URL',    hint: 'Relay an RTMP / SRT / HLS feed. HLS (.m3u8) and progressive MP4/WebM play directly.', placeholder: 'https://… .m3u8  ·  rtmp://…  ·  srt://…' },
  srt:  { label: 'SRT Source',    hint: 'Low-latency SRT feed from a compatible encoder.', placeholder: 'srt://HOST:port' },
  hls:  { label: 'HLS Source',    hint: 'HTTP Live Streaming playlist.', placeholder: 'https://… .m3u8' },
  whep: { label: 'WebRTC Source', hint: 'Sub-second WebRTC (WHEP) ingest.', placeholder: 'https://HOST/whep' },
}

function NetworkConnectForm({
  protocol, onCancel, onConnect,
}: {
  protocol: NetworkProtocol
  onCancel: () => void
  onConnect: (label: string, url: string) => void
}) {
  const meta = PROTOCOL_META[protocol]
  const [label, setLabel] = useState('')
  const [url, setUrl] = useState('')

  return (
    <div className="p-1.5 space-y-2">
      <BackRow onClick={onCancel} />
      <div>
        <p className="text-[11px] font-semibold text-white/85">{meta.label}</p>
        <p className="text-[9px] text-white/35 leading-snug mt-0.5">{meta.hint}</p>
      </div>
      <input
        value={label} onChange={e => setLabel(e.target.value)}
        placeholder="Display name (optional)"
        className="w-full px-2 py-1.5 rounded-md bg-white/[0.05] border border-white/10 text-[10px] text-white/85 placeholder:text-white/25 focus:outline-none focus:border-purple-500/60"
      />
      <input
        value={url} onChange={e => setUrl(e.target.value)}
        placeholder={meta.placeholder}
        onKeyDown={e => { if (e.key === 'Enter') onConnect(label, url) }}
        className="w-full px-2 py-1.5 rounded-md bg-white/[0.05] border border-white/10 text-[10px] font-mono text-white/85 placeholder:text-white/25 focus:outline-none focus:border-purple-500/60"
      />
      <button
        onClick={() => onConnect(label, url)}
        className="w-full py-1.5 rounded-md bg-purple-600 hover:bg-purple-500 text-[10px] font-semibold text-white transition-colors"
      >
        {url.trim() ? 'Connect' : 'Add Slot'}
      </button>
    </div>
  )
}

// ── AI Assistant (wired to the real copilot) ───────────────────────────────

function AiAssistant({ onLive, onStage, liveRef, stageRef }: {
  onLive:  (g: Graphic) => void
  onStage: (g: Graphic) => void
  liveRef?: string
  stageRef?: string
}) {
  const transcript = useServiceStore(s => s.transcript)
  const detections = useServiceStore(s => s.detections)
  const aiListening = useServiceStore(s => s.aiListening)
  const setAiListening = useServiceStore(s => s.setAiListening)
  const scriptures = detections.filter(d => d.kind === 'scripture')

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Graphic[]>([])
  const [ready, setReady] = useState(false)
  useEffect(() => {
    Promise.all(BUNDLED_TRANSLATIONS.map(t => loadTranslation(t).catch(() => null))).then(() => setReady(true))
  }, [])

  const runSearch = () => {
    const q = query.trim()
    if (!q) { setResults([]); return }
    const out: Graphic[] = []
    const ref = parseReference(q)
    if (ref) {
      for (const tx of BUNDLED_TRANSLATIONS) {
        const t = getVerseText(tx, ref.book, ref.chapter, ref.verse)
        if (t) { out.push({ ref: `${ref.book} ${ref.chapter}:${ref.verse}`, text: t, translation: tx }); break }
      }
    }
    if (out.length === 0) {
      for (const h of searchBibleMerged([...BUNDLED_TRANSLATIONS], q, { limit: 12 })) {
        out.push({ ref: `${h.book} ${h.chapter}:${h.verse}`, text: h.text, translation: h.tx })
      }
    }
    setResults(out)
  }

  const Card = ({ g, conf }: { g: Graphic; conf?: number }) => {
    const isLive = liveRef === g.ref, isStage = stageRef === g.ref
    return (
      <div className={cn('rounded-lg border p-2.5', isLive ? 'border-red-500/40 bg-red-600/[0.08]' : 'border-purple-500/20 bg-purple-600/[0.07]')}>
        <div className="flex items-center gap-1.5 mb-1">
          <BookOpen size={11} className="text-purple-300 shrink-0" />
          <span className="text-[12px] font-bold text-purple-200 truncate">{g.ref}</span>
          {g.translation && <span className="text-[8.5px] text-white/30">{g.translation}</span>}
          {conf != null && <span className="ml-auto text-[8px] font-mono text-emerald-400/70">{Math.round(conf * 100)}%</span>}
        </div>
        <p className="text-[10.5px] text-white/55 leading-snug line-clamp-2 mb-2">{g.text}</p>
        <div className="grid grid-cols-2 gap-1.5">
          <button onClick={() => onLive(g)}
            className={cn('flex items-center justify-center gap-1 py-1 rounded-md text-[10px] font-semibold transition-colors',
              isLive ? 'bg-red-600 text-white' : 'bg-red-600/20 text-red-300 hover:bg-red-600/40')}>
            <Circle size={7} className={isLive ? 'fill-white' : 'fill-red-400'} /> {isLive ? 'On Air' : 'Go Live'}
          </button>
          <button onClick={() => onStage(g)}
            className={cn('flex items-center justify-center gap-1 py-1 rounded-md text-[10px] font-semibold transition-colors',
              isStage ? 'bg-cyan-600 text-white' : 'bg-cyan-600/20 text-cyan-300 hover:bg-cyan-600/40')}>
            <MonitorSmartphone size={10} /> {isStage ? 'In-House' : 'Stage'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <Panel className="h-full">
      <div className="flex items-center gap-2 px-3 h-9 border-b border-white/[0.05]">
        <Brain size={15} className="text-purple-400" />
        <span className="text-[12px] font-semibold tracking-wide text-white/75 uppercase">Bible</span>
        <button
          onClick={() => setAiListening(!aiListening)}
          title={aiListening ? 'Click to stop voice detection' : 'Click to start voice detection'}
          className="ml-auto"
        >
          <AsrEngineBadge size="sm" accent="purple" />
        </button>
      </div>
      <div className="flex flex-col h-[calc(100%-2.25rem)]">
        {/* Manual lookup — always works offline from bundled KJV + WEB */}
        <div className="p-3 pb-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && runSearch()}
              placeholder={ready ? 'Reference or quote… e.g. John 3:16' : 'Loading Bible…'}
              disabled={!ready}
              className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-[11px] text-white/85 placeholder:text-white/25 outline-none focus:border-purple-500/40"
            />
            <button onClick={runSearch} disabled={!ready} className="w-8 h-8 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 flex items-center justify-center shrink-0">
              <BookOpen size={14} className="text-white" />
            </button>
          </div>
          {transcript && aiListening && <p className="text-[9px] text-white/30 italic mt-1.5 line-clamp-1">heard: …{transcript.slice(-90)}</p>}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-3 space-y-2">
          {results.length > 0 && (
            <>
              <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-white/35">
                <span className="flex items-center gap-1"><BookOpen size={10} className="text-purple-300" /> Results</span>
                <button onClick={() => { setResults([]); setQuery('') }} className="text-white/30 hover:text-white/60 normal-case">clear</button>
              </div>
              {results.map((g, i) => <Card key={`r${i}`} g={g} />)}
            </>
          )}

          {scriptures.length > 0 && (
            <>
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-white/35 pt-1">
                <Sparkles size={10} className="text-emerald-400" /> Voice-detected
              </div>
              {scriptures.map(d => <Card key={d.id} g={{ ref: d.reference, text: d.text, translation: d.subtitle }} conf={d.confidence} />)}
            </>
          )}

          {results.length === 0 && scriptures.length === 0 && (
            <div className="text-center py-8 text-white/25">
              <BookOpen size={24} className="mx-auto mb-2 opacity-30" />
              <p className="text-[11px]">Search a verse to project</p>
              <p className="text-[9.5px] text-white/15 mt-0.5">Type a reference or a remembered line</p>
            </div>
          )}
        </div>
      </div>
    </Panel>
  )
}

// ── Stage display panel (with working sermon timer) ────────────────────────

const STAGE_TABS = ['NEXT', 'NOTES', 'ANNOUNCEMENTS', 'TIMER']

function StagePanel({ graphic, clearGraphic }: { graphic: Graphic | null; clearGraphic: () => void }) {
  const [tab, setTab] = useState(0)
  const [secs, setSecs] = useState(5 * 60)
  const [running, setRunning] = useState(false)
  useEffect(() => {
    if (!running) return
    const t = setInterval(() => setSecs(s => (s <= 0 ? (clearInterval(t), 0) : s - 1)), 1000)
    return () => clearInterval(t)
  }, [running])

  return (
    <Panel className="h-full">
      <div className="flex items-center gap-2 px-3 h-9 border-b border-white/[0.05]">
        <MonitorSmartphone size={15} className="text-cyan-400" />
        <span className="text-[12px] font-semibold tracking-wide text-white/75 uppercase">Stage Display</span>
        <span className="text-[10px] text-white/35">(In-House)</span>
        {graphic && <button onClick={clearGraphic} title="Clear stage" className="ml-auto"><X size={13} className="text-white/40 hover:text-white/80" /></button>}
      </div>
      <div className="p-3 space-y-3">
        {graphic ? (
          <div className="relative overflow-hidden rounded-lg aspect-video p-4 flex flex-col justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-950">
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="relative z-10">
              <div className="text-2xl font-bold text-white drop-shadow">{graphic.ref}{graphic.translation && <span className="text-[11px] font-medium text-cyan-200/70 ml-2">{graphic.translation}</span>}</div>
              <p className="text-[12px] text-white/85 leading-snug mt-1.5 drop-shadow">{graphic.text}</p>
            </div>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-lg aspect-video flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-black text-white/30">
            <MonitorSmartphone size={26} className="mb-2 opacity-40" />
            <p className="text-[11px]">Stage display ready</p>
            <p className="text-[9px] text-white/15 mt-0.5">Push a verse from Bible AI → Stage</p>
          </div>
        )}

        <div className="flex items-center gap-1 border-b border-white/[0.06]">
          {STAGE_TABS.map((t, i) => (
            <button
              key={t}
              onClick={() => setTab(i)}
              className={cn(
                'px-2 py-1.5 text-[10px] font-semibold tracking-wide transition-colors border-b-2 -mb-px',
                tab === i ? 'text-purple-300 border-purple-400' : 'text-white/40 border-transparent hover:text-white/70',
              )}
            >{t}</button>
          ))}
        </div>

        {tab === 0 && (
          <div className="rounded-lg bg-black/30 border border-white/[0.06] p-3 text-[11px] text-white/40 leading-relaxed">
            {graphic ? <>Currently on stage: <span className="text-white/70 font-medium">{graphic.ref}</span></> : 'Nothing queued. Push a detected verse to In-House.'}
          </div>
        )}
        {tab === 1 && (
          <textarea placeholder="Type stage notes for the speaker…" className="w-full h-20 rounded-lg bg-black/30 border border-white/[0.06] p-3 text-[11px] text-white/70 placeholder:text-white/25 outline-none resize-none focus:border-cyan-500/30" />
        )}
        {tab === 2 && (
          <textarea placeholder="Type an announcement to show on stage…" className="w-full h-20 rounded-lg bg-black/30 border border-white/[0.06] p-3 text-[11px] text-white/70 placeholder:text-white/25 outline-none resize-none focus:border-cyan-500/30" />
        )}
        {tab === 3 && (
          <div className="rounded-lg bg-black/30 border border-white/[0.06] p-3 flex flex-col items-center justify-center">
            <div className={cn('text-3xl font-bold font-mono tabular-nums', secs === 0 ? 'text-red-400' : 'text-white')}>{fmtMS(secs)}</div>
            <div className="text-[10px] text-white/40 mt-1">Sermon Timer</div>
            <div className="flex items-center gap-2 mt-3">
              <button onClick={() => setRunning(r => !r)} className={cn('w-8 h-8 rounded-lg flex items-center justify-center', running ? 'bg-amber-600/80 hover:bg-amber-600' : 'bg-emerald-600/80 hover:bg-emerald-600')}>
                {running ? <Pause size={13} className="text-white" /> : <Play size={13} className="fill-white text-white ml-0.5" />}
              </button>
              <button onClick={() => { setRunning(false); setSecs(5 * 60) }} className="w-8 h-8 rounded-lg bg-white/[0.08] hover:bg-white/15 flex items-center justify-center"><RotateCw size={13} className="text-white/70" /></button>
              <button onClick={() => setSecs(s => s + 60)} className="w-8 h-8 rounded-lg bg-white/[0.08] hover:bg-white/15 flex items-center justify-center text-[10px] font-bold text-white/70">+1m</button>
            </div>
          </div>
        )}
      </div>
    </Panel>
  )
}

// ── Bottom deck ────────────────────────────────────────────────────────────

// Audio switcher + multi-view + streaming. (Chat/polls/quiz live on Webinar.)
function BottomDeck({ streaming, setStreaming }: { streaming: boolean; setStreaming: (v: boolean) => void }) {
  return (
    <div className="grid grid-cols-12 gap-3">
      <div className="col-span-6"><AudioMixer /></div>
      <div className="col-span-3"><StreamingPanel streaming={streaming} setStreaming={setStreaming} /></div>
      <div className="col-span-3"><MultiView /></div>
    </div>
  )
}

// ── Audio mixer (real input devices + master) ──────────────────────────────

interface Chan { name: string; sub: string; level: number; master?: boolean; mute: boolean; solo: boolean }

function AudioMixer() {
  const microphones = useMediaEngine(s => s.microphones)
  const permissionState = useMediaEngine(s => s.permissionState)
  const [chans, setChans] = useState<Chan[]>([])

  // Build channels from the machine's real audio inputs + a master bus.
  useEffect(() => {
    useMediaEngine.getState().enumerateDevices()
  }, [])
  useEffect(() => {
    const mics: Chan[] = microphones.map((m, i) => ({
      name: m.label?.split('(')[0].trim() || `Input ${i + 1}`,
      sub: 'Mic', level: 75, mute: false, solo: false,
    }))
    setChans([...mics, { name: 'Master', sub: 'Output', level: 85, master: true, mute: false, solo: false }])
  }, [microphones])

  const set = (i: number, patch: Partial<Chan>) =>
    setChans(cs => cs.map((c, j) => j === i ? { ...c, ...patch } : c))
  const dbOf = (lvl: number) => lvl === 0 ? '-∞' : (((lvl - 100) / 100) * 40).toFixed(1)

  const needsAccess = microphones.length === 0

  return (
    <Panel title="Audio Mixer" className="h-[230px]">
      {needsAccess ? (
        <div className="h-full flex flex-col items-center justify-center gap-2 text-white/40">
          <Mic size={22} className="opacity-50" />
          <p className="text-[11px]">{permissionState === 'denied' ? 'Microphone access denied' : 'No audio inputs detected'}</p>
          <button
            onClick={async () => { await useMediaEngine.getState().requestPermission(); useMediaEngine.getState().enumerateDevices() }}
            className="text-[11px] px-3 py-1.5 rounded-lg bg-purple-600/80 hover:bg-purple-600 text-white font-medium"
          >Grant Microphone Access</button>
        </div>
      ) : (
      <div className="flex gap-1.5 p-3 h-full overflow-x-auto">
        {chans.map((ch, i) => (
          <div key={ch.name} className={cn('flex flex-col items-center gap-1 px-1.5 py-1 rounded-lg shrink-0 w-[58px]',
            ch.master ? 'bg-purple-600/10 border border-purple-500/25' : 'bg-white/[0.02]')}>
            <div className="text-center leading-tight">
              <div className="text-[10px] font-semibold text-white/80 truncate w-full">{ch.name}</div>
              <div className="text-[8px] text-white/35 truncate w-full">{ch.sub}</div>
            </div>
            <div className="relative w-7 h-7 rounded-full bg-[#15151f] border border-white/10">
              <div className="absolute left-1/2 top-1 w-0.5 h-2.5 bg-purple-400 origin-bottom rounded-full" style={{ transform: `translateX(-50%) rotate(${(ch.level / 100) * 270 - 135}deg)` }} />
            </div>
            <div className="flex items-end gap-1 h-[78px] mt-1">
              <input
                type="range" min={0} max={100} value={ch.level}
                onChange={e => set(i, { level: +e.target.value })}
                className="gc-fader"
                style={{ writingMode: 'vertical-lr', direction: 'rtl', width: '14px', height: '78px', accentColor: ch.master ? '#a855f7' : '#10b981' } as React.CSSProperties}
              />
              <div className="w-2 h-full rounded-sm bg-black/40 overflow-hidden flex flex-col-reverse">
                <div className="w-full bg-gradient-to-t from-emerald-500 via-yellow-400 to-red-500" style={{ height: `${ch.mute ? 0 : ch.level}%` }} />
              </div>
            </div>
            <div className="text-[8px] font-mono text-white/45">{dbOf(ch.level)}</div>
            <div className="flex gap-1">
              <button onClick={() => set(i, { mute: !ch.mute })} className={cn('w-4 h-4 rounded-[3px] text-[7px] font-bold', ch.mute ? 'bg-red-600 text-white' : 'bg-white/[0.06] text-white/40 hover:bg-white/15')}>M</button>
              <button onClick={() => set(i, { solo: !ch.solo })} className={cn('w-4 h-4 rounded-[3px] text-[7px] font-bold', ch.solo ? 'bg-yellow-500 text-black' : 'bg-white/[0.06] text-white/40 hover:bg-white/15')}>S</button>
            </div>
          </div>
        ))}
      </div>
      )}
    </Panel>
  )
}

// ── Streaming destinations — the producer chooses what goes live ───────────

interface Dest { name: string; color: string; on: boolean }
const DEFAULT_DESTS: Dest[] = [
  { name: 'YouTube Live',    color: 'bg-red-600',    on: false },
  { name: 'Facebook Live',   color: 'bg-blue-600',   on: false },
  { name: 'Zoom Webinar',    color: 'bg-sky-500',    on: false },
  { name: 'Microsoft Teams', color: 'bg-indigo-600', on: false },
  { name: 'Custom RTMP',     color: 'bg-purple-600', on: false },
]

function StreamingPanel({ streaming, setStreaming }: { streaming: boolean; setStreaming: (v: boolean) => void }) {
  const destinations    = useAppStore(s => s.destinations)
  const setDestinations = useAppStore(s => s.setDestinations)
  const stream = useStreamController()

  const enabled = destinations.filter(d => d.enabled).length
  const live    = stream.state === 'live' || stream.state === 'starting'

  // Keep the page's local flag in step with the real encoder state.
  useEffect(() => { setStreaming(live) }, [live, setStreaming])

  const toggle = (id: string) => setDestinations(
    destinations.map(d => d.id === id ? { ...d, enabled: !d.enabled } : d),
  )

  const goLive = () => { void (live ? stream.stop() : stream.start()) }

  const blocked = stream.encoderAvailable === false

  return (
    <Panel
      title="Streaming"
      right={
        <span className="text-[10px] text-white/40 tabular-nums">
          {stream.stats ? `${stream.stats.bitrate} · ${stream.stats.speed.toFixed(2)}x` : `${enabled} selected`}
        </span>
      }
      className="h-[230px]"
    >
      <div className="flex flex-col h-full p-3 gap-2">
        <div className="flex-1 space-y-1.5 overflow-y-auto">
          {destinations.map((d) => {
            const configured = Boolean(d.rtmpUrl?.trim() && d.streamKey?.trim())
            return (
              <button
                key={d.id}
                onClick={() => toggle(d.id)}
                disabled={live}
                title={configured ? d.name : 'No stream key — set one in Settings → Streaming'}
                className={cn('w-full flex items-center gap-2 px-2 py-1.5 rounded-lg border transition-colors',
                  d.enabled ? 'bg-emerald-600/10 border-emerald-500/25' : 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04]',
                  live && 'opacity-70 cursor-not-allowed')}
              >
                <span className="w-5 h-5 rounded flex items-center justify-center text-[8px] font-bold text-white bg-white/15">
                  {d.name.charAt(0)}
                </span>
                <span className="text-[11px] text-white/70 flex-1 truncate text-left">{d.name}</span>

                {!configured && (
                  <span className="text-[8px] font-semibold text-amber-400/80 shrink-0">NO KEY</span>
                )}

                {live && d.enabled
                  ? <span className="flex items-center gap-1 text-[8px] font-bold text-red-400"><Circle size={5} className="fill-red-500 text-red-500 live-dot" /> LIVE</span>
                  : <span className={cn('w-7 h-3.5 rounded-full relative transition-colors shrink-0', d.enabled ? 'bg-emerald-500/80' : 'bg-white/15')}>
                      <span className={cn('absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all', d.enabled ? 'left-3.5' : 'left-0.5')} />
                    </span>}
              </button>
            )
          })}
        </div>

        {stream.error && (
          <p className="text-[10px] leading-snug text-red-400/90 line-clamp-2">{stream.error}</p>
        )}
        {blocked && !stream.error && stream.unavailableReason && (
          <p className="text-[10px] leading-snug text-amber-400/80">
            {stream.unavailableReason}
          </p>
        )}

        <button
          onClick={goLive}
          disabled={blocked || (!live && enabled === 0) || stream.state === 'stopping'}
          className={cn('w-full py-2 rounded-lg text-[12px] font-bold tracking-wide transition-colors flex items-center justify-center gap-2',
            live ? 'bg-red-600 text-white hover:bg-red-500'
              : !blocked && enabled > 0 ? 'bg-emerald-600 text-white hover:bg-emerald-500'
              : 'bg-white/[0.05] text-white/25 cursor-not-allowed')}
        >
          {stream.state === 'starting' ? 'Connecting…'
            : stream.state === 'stopping' ? 'Stopping…'
            : live ? <><Circle size={9} className="fill-white" /> Stop Stream</>
            : <><Radio size={13} /> Go Live{enabled > 0 ? ` · ${enabled}` : ''}</>}
        </button>
      </div>
    </Panel>
  )
}

// ── Multi-view (real sources) ──────────────────────────────────────────────

function MultiView() {
  const sources = useMediaEngine(s => s.sources)
  const previewId = useMediaEngine(s => s.previewId)
  const programId = useMediaEngine(s => s.programId)
  const assignToPreview = useMediaEngine(s => s.assignToPreview)
  const slots = Array.from({ length: 8 }, (_, i) => sources[i] ?? null)

  return (
    <Panel title="Multi-View" right={<span className="text-[10px] text-white/35">8 Views</span>} className="h-[230px]">
      <div className="grid grid-cols-4 grid-rows-2 gap-1.5 p-2.5 h-full">
        {slots.map((s, i) => (
          <div
            key={s?.id ?? i}
            onClick={() => s && assignToPreview(s.id)}
            className={cn('relative rounded-md overflow-hidden border cursor-pointer',
              s?.id === programId ? 'border-red-500 ring-1 ring-red-500/50' : s?.id === previewId ? 'border-emerald-500 ring-1 ring-emerald-400/50' : 'border-white/10')}
          >
            {s
              ? <SourceVideo id={s.id} type={s.type} label={s.label} className="w-full h-full" />
              : <div className="w-full h-full bg-white/[0.02] flex items-center justify-center text-[8px] text-white/20">Empty</div>}
            {s && <span className="absolute bottom-0.5 left-1 text-[8px] font-medium text-white/80 drop-shadow truncate max-w-[90%]">{i + 1} {s.label}</span>}
          </div>
        ))}
      </div>
    </Panel>
  )
}

// ── Bottom status bar ──────────────────────────────────────────────────────

