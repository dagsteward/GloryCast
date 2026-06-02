import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Crown, Menu, Bell, MessageSquare, HelpCircle, ChevronDown, Cpu, Wifi,
  Video, Film, Music2, BookOpen, Sparkles, Users, Image as ImageIcon,
  SlidersHorizontal, Play, Radio, MonitorSmartphone, Settings, Plus,
  LayoutGrid, List, Eye, ThumbsUp, Clock, Mic, Brain, Send,
  RotateCw, Pause, Circle, Link2, ChevronRight,
  Camera, Monitor, Palette, Timer as TimerIcon, X, Trash2,
} from 'lucide-react'
import { useAiCopilot } from '../hooks/useAiCopilot'
import { useMediaEngine, getStream, type SourceType } from '../hooks/useMediaEngine'
import { useServiceStore } from '../stores/serviceStore'
import { cn } from '../lib/utils'

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
  useAiCopilot()

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

  return (
    <div className="w-full h-full flex flex-col bg-[#070709] text-white/90 overflow-hidden select-none">
      <TopBar elapsed={elapsed} sourceCount={sources.length} streaming={streaming} />
      <div className="flex-1 flex min-h-0">
        <SceneRail />
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
            <TopDeck
              elapsed={elapsed} streaming={streaming}
              liveGraphic={liveGraphic} setLiveGraphic={setLiveGraphic}
              stageGraphic={stageGraphic} setStageGraphic={setStageGraphic}
            />
            <BottomDeck streaming={streaming} setStreaming={setStreaming} />
          </div>
        </div>
      </div>
      <BottomBar sourceCount={sources.length} streaming={streaming} />
    </div>
  )
}

export interface Graphic { ref: string; text: string; translation?: string }

// ── Top status bar ─────────────────────────────────────────────────────────

function TopBar({ elapsed, sourceCount, streaming }: { elapsed: number; sourceCount: number; streaming: boolean }) {
  return (
    <header className="h-14 shrink-0 flex items-center justify-between px-4 bg-gradient-to-b from-[#0c0c14] to-[#090910] border-b border-white/[0.06]">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-purple-900/40">
          <Crown size={18} className="text-white" />
        </div>
        <div className="leading-none">
          <div className="text-[15px] font-extrabold tracking-tight">GloryCast OS</div>
          <div className="text-[9px] tracking-[0.25em] text-purple-300/60 font-semibold mt-0.5">CINEMATIC BROADCAST</div>
        </div>
        <button className="ml-2 w-8 h-8 rounded-lg hover:bg-white/[0.06] flex items-center justify-center text-white/40">
          <Menu size={17} />
        </button>
      </div>

      <div className="flex items-center gap-5 text-[12px]">
        {streaming ? (
          <span className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/30">
            <span className="live-dot w-2 h-2 rounded-full bg-red-500" />
            <span className="font-bold text-red-400">LIVE</span>
            <span className="font-mono text-red-400/80 tabular-nums">{fmtClock(elapsed)}</span>
          </span>
        ) : (
          <span className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/10">
            <span className="w-2 h-2 rounded-full bg-white/30" />
            <span className="font-bold text-white/50">STANDBY</span>
          </span>
        )}
        <span className="flex items-center gap-1.5 text-white/55"><Cpu size={13} className="text-cyan-400" /> Sources <b className="text-white/80 font-semibold">{sourceCount}</b></span>
        <span className="flex items-center gap-1.5 text-white/55"><Film size={13} className="text-emerald-400" /> FPS <b className="text-white/80 font-semibold">60</b></span>
        <span className="flex items-center gap-1.5 text-white/55"><Wifi size={13} className="text-emerald-400" /> Internet <b className="text-emerald-400 font-semibold">Excellent</b></span>
      </div>

      <div className="flex items-center gap-3">
        <IconBtn icon={Bell} badge="12" />
        <IconBtn icon={MessageSquare} />
        <IconBtn icon={HelpCircle} />
        <div className="flex items-center gap-2 pl-2 ml-1 border-l border-white/10">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-orange-500 flex items-center justify-center text-[11px] font-bold">DA</div>
          <div className="leading-none">
            <div className="text-[12px] font-semibold">Daniel Admin</div>
            <div className="text-[9px] text-white/40 mt-0.5">Super Admin</div>
          </div>
          <ChevronDown size={14} className="text-white/40" />
        </div>
      </div>
    </header>
  )
}

function IconBtn({ icon: Icon, badge }: { icon: typeof Bell; badge?: string }) {
  return (
    <button className="relative w-8 h-8 rounded-lg hover:bg-white/[0.06] flex items-center justify-center text-white/50">
      <Icon size={17} />
      {badge && (
        <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-1 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center">{badge}</span>
      )}
    </button>
  )
}

// ── Left scene / nav rail ──────────────────────────────────────────────────

const NAV = [
  { icon: LayoutGrid,        label: 'Dashboard',        path: '/dashboard' },
  { icon: Video,             label: 'Production',       active: true,  path: '/production' },
  { icon: Film,              label: 'Media Library',    path: '/presentation' },
  { icon: Music2,            label: 'Worship',          path: '/presentation' },
  { icon: BookOpen,          label: 'Bible',            path: '/bible' },
  { icon: Sparkles,          label: 'AI Studio',        path: '/ai-studio' },
  { icon: Users,             label: 'Webinar & Guests', path: '/webinar' },
  { icon: ImageIcon,         label: 'Graphics',         path: '/presentation' },
  { icon: SlidersHorizontal, label: 'Audio Mixer',      path: '/production' },
  { icon: Play,              label: 'Playback',         path: '/production' },
  { icon: Radio,             label: 'Stream & Record',  path: '/production' },
  { icon: MonitorSmartphone, label: 'Stage Display',    path: '/stage-display' },
  { icon: Settings,          label: 'Settings',         path: '/settings' },
]

const SCENES = [
  'Worship Intro', 'Praise & Worship', 'Scripture Reading', 'Sermon',
  'Prayer', 'Offering', 'Announcements', 'Closing',
]

function SceneRail() {
  const navigate = useNavigate()
  const [active, setActive] = useState(0)
  return (
    <aside className="w-52 shrink-0 flex flex-col bg-[#0a0a12] border-r border-white/[0.06] overflow-y-auto">
      <nav className="p-2 space-y-0.5">
        {NAV.map(({ icon: Icon, label, active: on, path }) => (
          <button
            key={label}
            onClick={() => navigate(path)}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12.5px] font-medium transition-colors',
              on ? 'bg-gradient-to-r from-purple-600/40 to-purple-600/10 text-white border border-purple-500/30'
                 : 'text-white/45 hover:text-white/80 hover:bg-white/[0.04] border border-transparent',
            )}
          >
            <Icon size={15} className={on ? 'text-purple-300' : ''} />
            <span className="flex-1 text-left">{label}</span>
            {on && <ChevronRight size={13} className="text-purple-300/70" />}
          </button>
        ))}
      </nav>

      <div className="px-3 pt-3 pb-1 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.18em] text-white/40 font-semibold">Scenes</span>
        <button className="w-5 h-5 rounded-md bg-white/[0.06] hover:bg-white/10 flex items-center justify-center text-white/50">
          <Plus size={12} />
        </button>
      </div>
      <div className="px-2 pb-3 space-y-0.5">
        {SCENES.map((name, i) => (
          <button
            key={name}
            onClick={() => setActive(i)}
            className={cn(
              'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[12px] transition-colors',
              active === i ? 'bg-purple-600/25 text-white border border-purple-500/30'
                           : 'text-white/50 hover:bg-white/[0.04] border border-transparent',
            )}
          >
            <span className={cn('w-4 text-center text-[11px] font-mono', active === i ? 'text-purple-300' : 'text-white/30')}>{i + 1}</span>
            <span className="flex-1 text-left truncate">{name}</span>
            {active === i
              ? <Play size={11} className="text-purple-300 fill-purple-300" />
              : <ChevronRight size={11} className="text-white/20" />}
          </button>
        ))}
      </div>
    </aside>
  )
}

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

function TopDeck({ elapsed, streaming, liveGraphic, setLiveGraphic, stageGraphic, setStageGraphic }: {
  elapsed: number
  streaming: boolean
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
          <PreviewMonitor />
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
      <div className="relative aspect-video">
        <SourceVideo key={programId ?? 'none'} id={programId} type={prog?.type} label={prog?.label ?? 'No Program'} className="w-full h-full" />
        {graphic && (
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <div className="border-l-[3px] border-purple-400 pl-4 group">
              <div className="text-3xl font-bold text-white drop-shadow-lg flex items-center gap-2">
                {graphic.ref}
                {graphic.translation && <span className="text-[11px] font-medium text-purple-200/70 self-end mb-1">{graphic.translation}</span>}
                <button onClick={clearGraphic} title="Clear live graphic" className="opacity-0 group-hover:opacity-100 transition-opacity"><X size={16} className="text-white/60" /></button>
              </div>
              <p className="text-[15px] text-white/90 leading-snug mt-1 max-w-[92%] drop-shadow">{graphic.text}</p>
            </div>
          </div>
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

const TRANSITIONS = ['CUT', 'FADE', 'MOVE', 'WIPE'] as const

function PreviewMonitor() {
  const previewId = useMediaEngine(s => s.previewId)
  const sources   = useMediaEngine(s => s.sources)
  const cutToProgram = useMediaEngine(s => s.cutToProgram)
  const prev = sources.find(s => s.id === previewId)
  const [trans, setTrans] = useState<string>('FADE')

  const take = () => { if (previewId) cutToProgram() }

  return (
    <div className="rounded-xl overflow-hidden border border-emerald-500/30 bg-black flex flex-col">
      <div className="flex items-center justify-between px-3 h-8 bg-[#0c0c15] border-b border-white/[0.05]">
        <span className="text-[12px] font-bold text-emerald-300/90">PREVIEW</span>
        <span className="text-[11px] text-white/40 font-mono truncate max-w-[110px]">{prev?.label ?? '—'}</span>
      </div>
      <SourceVideo key={previewId ?? 'none'} id={previewId} type={prev?.type} label={prev?.label ?? 'Select a source below'} className="aspect-video" />
      <div className="px-3 py-2.5 bg-[#0c0c15] space-y-2.5">
        <div className="grid grid-cols-4 gap-1.5">
          {TRANSITIONS.map(t => (
            <button
              key={t}
              onClick={() => setTrans(t)}
              className={cn(
                'py-1.5 rounded-lg text-[11px] font-bold tracking-wide transition-colors',
                trans === t ? 'bg-purple-600 text-white' : 'bg-white/[0.05] text-white/50 hover:bg-white/10',
              )}
            >{t}</button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[12px] text-white/55 font-mono">⏱ 1.0s · {trans}</span>
          <button
            onClick={take}
            disabled={!previewId}
            className={cn(
              'flex-1 py-2 rounded-lg text-[13px] font-bold tracking-wider transition-colors',
              previewId ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white hover:from-purple-500 hover:to-fuchsia-500'
                        : 'bg-white/[0.05] text-white/25 cursor-not-allowed',
            )}
          >
            TAKE
          </button>
        </div>
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

  // After adding, reveal it: jump to ALL and load it onto Preview.
  const reveal = (id: string | null) => {
    setMenuOpen(false)
    setTab(0)
    if (id) useMediaEngine.getState().assignToPreview(id)
  }
  const [camError, setCamError] = useState<string | null>(null)

  const addCamera = async () => {
    const me = useMediaEngine.getState()
    setCamError(null)
    if (me.permissionState !== 'granted') {
      const ok = await me.requestPermission()
      if (!ok) { setCamError('Camera/mic permission denied'); setMenuOpen(false); return }
    }
    const id = await me.addCamera('default', 'Camera')
    if (!id) setCamError('No camera found')
    reveal(id)
  }
  const addScreen = async () => { reveal(await useMediaEngine.getState().addScreenSource()) }
  const addColor  = () => reveal(useMediaEngine.getState().addColorSource('#1e293b', 'Color'))
  const addClock  = () => reveal(useMediaEngine.getState().addClockSource())
  const addTimer  = () => reveal(useMediaEngine.getState().addCountdownSource(5, 'Countdown'))
  const addBars   = () => reveal(useMediaEngine.getState().addTestPattern())

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
              <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-8 z-40 w-44 rounded-lg bg-[#15151f] border border-white/10 shadow-2xl p-1.5 space-y-0.5">
                <AddItem icon={Camera}  label="Camera"       onClick={addCamera} />
                <AddItem icon={Monitor} label="Screen Share" onClick={addScreen} />
                <AddItem icon={Film}    label="Media File"   onClick={() => fileRef.current?.click()} />
                <AddItem icon={ImageIcon} label="Image"      onClick={() => imageRef.current?.click()} />
                <AddItem icon={Palette} label="Color"        onClick={addColor} />
                <AddItem icon={TimerIcon} label="Countdown"  onClick={addTimer} />
                <AddItem icon={Clock}   label="Clock"        onClick={addClock} />
                <AddItem icon={Cpu}     label="Test Pattern" onClick={addBars} />
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

  return (
    <Panel className="h-full">
      <div className="flex items-center gap-2 px-3 h-9 border-b border-white/[0.05]">
        <Brain size={15} className="text-purple-400" />
        <span className="text-[12px] font-semibold tracking-wide text-white/75 uppercase">Bible AI</span>
        <button
          onClick={() => setAiListening(!aiListening)}
          className={cn('ml-auto text-[9px] px-1.5 py-0.5 rounded font-semibold', aiListening ? 'bg-purple-600/30 text-purple-300' : 'bg-white/[0.06] text-white/50 hover:text-white/80')}
        >{aiListening ? 'Listening' : 'Paused'}</button>
      </div>
      <div className="flex flex-col h-[calc(100%-2.25rem)]">
        <div className="p-3 pb-2 shrink-0">
          <div className="rounded-lg bg-black/30 border border-white/[0.05] p-2.5">
            <div className="flex items-center gap-1.5 text-[11px] text-white/50 mb-2">
              <Mic size={11} className={aiListening ? 'text-purple-400' : 'text-white/30'} /> {aiListening ? 'Listening for scripture…' : 'Paused'}
            </div>
            <div className="flex items-end gap-0.5 h-7">
              {Array.from({ length: 36 }).map((_, i) => (
                <span key={i} className="flex-1 rounded-full bg-gradient-to-t from-purple-600 to-fuchsia-400"
                  style={{ height: `${aiListening ? 15 + Math.abs(Math.sin(i * 0.9)) * 85 : 6}%`, opacity: aiListening ? 0.5 + Math.abs(Math.sin(i)) * 0.5 : 0.2 }} />
              ))}
            </div>
            {transcript && <p className="text-[9.5px] text-white/35 italic mt-1.5 line-clamp-2">…{transcript.slice(-120)}</p>}
          </div>
        </div>

        <div className="px-3 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/35 shrink-0">
          <Sparkles size={11} className="text-emerald-400" /> Detected · push to output
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-3 pt-2 space-y-2">
          {scriptures.length === 0 ? (
            <div className="text-center py-6 text-white/25">
              <BookOpen size={22} className="mx-auto mb-2 opacity-30" />
              <p className="text-[11px]">Speak or quote a verse</p>
              <p className="text-[9.5px] text-white/15 mt-0.5">References & paraphrases detected live</p>
            </div>
          ) : scriptures.map(d => {
            const g: Graphic = { ref: d.reference, text: d.text, translation: d.subtitle }
            const isLive = liveRef === d.reference, isStage = stageRef === d.reference
            return (
              <div key={d.id} className="rounded-lg border border-purple-500/20 bg-purple-600/[0.07] p-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <BookOpen size={11} className="text-purple-300 shrink-0" />
                  <span className="text-[12px] font-bold text-purple-200 truncate">{d.reference}</span>
                  {d.subtitle && <span className="text-[8.5px] text-white/30">{d.subtitle}</span>}
                  <span className="ml-auto text-[8px] font-mono text-emerald-400/70">{Math.round(d.confidence * 100)}%</span>
                </div>
                <p className="text-[10.5px] text-white/55 leading-snug line-clamp-2 mb-2">{d.text}</p>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => onLive(g)}
                    className={cn('flex items-center justify-center gap-1 py-1 rounded-md text-[10px] font-semibold transition-colors',
                      isLive ? 'bg-red-600 text-white' : 'bg-red-600/20 text-red-300 hover:bg-red-600/40')}
                  ><Circle size={7} className={isLive ? 'fill-white' : 'fill-red-400'} /> {isLive ? 'On Air' : 'Go Live'}</button>
                  <button
                    onClick={() => onStage(g)}
                    className={cn('flex items-center justify-center gap-1 py-1 rounded-md text-[10px] font-semibold transition-colors',
                      isStage ? 'bg-cyan-600 text-white' : 'bg-cyan-600/20 text-cyan-300 hover:bg-cyan-600/40')}
                  ><MonitorSmartphone size={10} /> {isStage ? 'In-House' : 'Stage'}</button>
                </div>
              </div>
            )
          })}
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

// Polling + Quiz Leaderboard live on the Webinar page, not the broadcast desk.
function BottomDeck({ streaming, setStreaming }: { streaming: boolean; setStreaming: (v: boolean) => void }) {
  return (
    <div className="grid grid-cols-12 gap-3">
      <div className="col-span-6"><AudioMixer /></div>
      <div className="col-span-3"><StreamingPanel streaming={streaming} setStreaming={setStreaming} /></div>
      <div className="col-span-3"><MultiView /></div>
      <div className="col-span-12"><LiveChat /></div>
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
  const [dests, setDests] = useState<Dest[]>(DEFAULT_DESTS)
  const enabled = dests.filter(d => d.on).length

  const toggle = (i: number) => setDests(ds => ds.map((d, j) => j === i ? { ...d, on: !d.on } : d))
  const goLive = () => {
    if (streaming) { setStreaming(false); return }
    if (enabled === 0) return
    setStreaming(true)
  }

  return (
    <Panel
      title="Streaming"
      right={<span className="text-[10px] text-white/40">{enabled} selected</span>}
      className="h-[230px]"
    >
      <div className="flex flex-col h-full p-3 gap-2">
        <div className="flex-1 space-y-1.5 overflow-y-auto">
          {dests.map((s, i) => (
            <button
              key={s.name}
              onClick={() => toggle(i)}
              disabled={streaming}
              className={cn('w-full flex items-center gap-2 px-2 py-1.5 rounded-lg border transition-colors',
                s.on ? 'bg-emerald-600/10 border-emerald-500/25' : 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04]',
                streaming && 'opacity-70 cursor-not-allowed')}
            >
              <span className={cn('w-5 h-5 rounded flex items-center justify-center text-[8px] font-bold text-white', s.color)}>{s.name.charAt(0)}</span>
              <span className="text-[11px] text-white/70 flex-1 truncate text-left">{s.name}</span>
              {streaming && s.on
                ? <span className="flex items-center gap-1 text-[8px] font-bold text-red-400"><Circle size={5} className="fill-red-500 text-red-500 live-dot" /> LIVE</span>
                : <span className={cn('w-7 h-3.5 rounded-full relative transition-colors', s.on ? 'bg-emerald-500/80' : 'bg-white/15')}>
                    <span className={cn('absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all', s.on ? 'left-3.5' : 'left-0.5')} />
                  </span>}
            </button>
          ))}
        </div>
        <button
          onClick={goLive}
          disabled={!streaming && enabled === 0}
          className={cn('w-full py-2 rounded-lg text-[12px] font-bold tracking-wide transition-colors flex items-center justify-center gap-2',
            streaming ? 'bg-red-600 text-white hover:bg-red-500'
              : enabled > 0 ? 'bg-emerald-600 text-white hover:bg-emerald-500'
              : 'bg-white/[0.05] text-white/25 cursor-not-allowed')}
        >
          {streaming ? <><Circle size={9} className="fill-white" /> Stop Stream</> : <><Radio size={13} /> Go Live{enabled > 0 ? ` · ${enabled}` : ''}</>}
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

// ── Live chat (functional input) ───────────────────────────────────────────

function LiveChat() {
  const [chat, setChat] = useState<{ name: string; msg: string }[]>([])
  const [draft, setDraft] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const send = () => {
    const t = draft.trim()
    if (!t) return
    setChat(c => [...c, { name: 'You', msg: t }])
    setDraft('')
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 0)
  }
  return (
    <Panel
      title="Live Chat"
      right={<span className="flex items-center gap-1 text-[10px] text-white/40"><Users size={11} /> {chat.length}</span>}
      className="h-[230px]"
    >
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {chat.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-white/25">
              <MessageSquare size={22} className="mb-2 opacity-40" />
              <p className="text-[11px]">No messages yet</p>
              <p className="text-[9px] text-white/15 mt-0.5">Connect a platform to sync live chat</p>
            </div>
          ) : chat.map((c, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 bg-purple-600">{c.name.charAt(0)}</div>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-white/75">{c.name}</div>
                <div className="text-[11px] text-white/50">{c.msg}</div>
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <div className="p-2.5 border-t border-white/[0.05] flex items-center gap-2">
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Type a message..."
            className="flex-1 bg-white/[0.04] border border-white/[0.07] rounded-lg px-3 py-1.5 text-[11px] text-white/80 placeholder:text-white/25 outline-none focus:border-purple-500/40"
          />
          <button onClick={send} className="w-8 h-8 rounded-lg bg-purple-600 hover:bg-purple-500 flex items-center justify-center"><Send size={13} className="text-white" /></button>
        </div>
      </div>
    </Panel>
  )
}

// ── Bottom status bar ──────────────────────────────────────────────────────

function BottomBar({ sourceCount, streaming }: { sourceCount: number; streaming: boolean }) {
  return (
    <footer className="h-7 shrink-0 flex items-center justify-between px-4 bg-[#0a0a12] border-t border-white/[0.06] text-[10.5px] text-white/45">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5 font-semibold text-white/65"><Crown size={11} className="text-purple-400" /> GloryCast OS v1.0.0</span>
        <span className="flex items-center gap-1 text-emerald-400"><Circle size={5} className="fill-emerald-400 text-emerald-400" /> Ready</span>
      </div>
      <div className="flex items-center gap-5">
        <span>Sources: <b className="text-white/65 font-medium">{sourceCount}</b></span>
        <span>Output: <b className="text-white/65 font-medium">1080p60</b></span>
        <span>Stream: {streaming ? <b className="text-red-400 font-medium">● Live</b> : <b className="text-white/50 font-medium">Standby</b>}</span>
      </div>
      <span className="flex items-center gap-1.5">Auto Save: <b className="text-emerald-400">Enabled</b> <Circle size={5} className="fill-emerald-400 text-emerald-400" /></span>
    </footer>
  )
}
