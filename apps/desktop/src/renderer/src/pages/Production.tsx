import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Crown, Menu, Bell, MessageSquare, HelpCircle, ChevronDown, Cpu, Wifi,
  Video, Film, Music2, BookOpen, Sparkles, Users, Image as ImageIcon,
  SlidersHorizontal, Play, Radio, MonitorSmartphone, Settings, Plus,
  LayoutGrid, List, Eye, ThumbsUp, Clock, Mic, Brain, Send, FileText,
  Scissors, RotateCw, Pause, Circle, Link2, ChevronRight,
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

  // Seed a few real, live-streaming generated sources on first mount so the
  // switcher is populated and fully functional out of the box (no hardware).
  const sources = useMediaEngine(s => s.sources)
  const seeded = useRef(false)
  useEffect(() => {
    if (seeded.current) return
    seeded.current = true
    const me = useMediaEngine.getState()
    if (me.sources.length === 0) {
      const clock = me.addClockSource()
      const bars  = me.addTestPattern()
      me.addCountdownSource(5, 'Countdown')
      me.addColorSource('#7c3aed', 'Brand Purple')
      me.addColorSource('#0f172a', 'Lower Third BG')
      me.assignToProgram(bars)
      me.assignToPreview(clock)
    }
  }, [])

  // Verse graphic overlaid on Program (set by the AI assistant actions).
  const [programVerse, setProgramVerse] = useState<{ ref: string; text: string } | null>({
    ref: 'Romans 8:28',
    text: 'And we know that in all things God works for the good of those who love him, who have been called according to his purpose.',
  })

  return (
    <div className="w-full h-full flex flex-col bg-[#070709] text-white/90 overflow-hidden select-none">
      <TopBar elapsed={elapsed} sourceCount={sources.length} />
      <div className="flex-1 flex min-h-0">
        <SceneRail />
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
            <TopDeck elapsed={elapsed} programVerse={programVerse} setProgramVerse={setProgramVerse} />
            <BottomDeck />
          </div>
        </div>
      </div>
      <BottomBar sourceCount={sources.length} />
    </div>
  )
}

// ── Top status bar ─────────────────────────────────────────────────────────

function TopBar({ elapsed, sourceCount }: { elapsed: number; sourceCount: number }) {
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
        <span className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/30">
          <span className="live-dot w-2 h-2 rounded-full bg-red-500" />
          <span className="font-bold text-red-400">LIVE</span>
          <span className="font-mono text-red-400/80 tabular-nums">{fmtClock(elapsed)}</span>
        </span>
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

function TopDeck({ elapsed, programVerse, setProgramVerse }: {
  elapsed: number
  programVerse: { ref: string; text: string } | null
  setProgramVerse: (v: { ref: string; text: string } | null) => void
}) {
  return (
    <div className="grid grid-cols-12 gap-3">
      <div className="col-span-7 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <ProgramMonitor elapsed={elapsed} verse={programVerse} clearVerse={() => setProgramVerse(null)} />
          <PreviewMonitor />
        </div>
        <SourcesPanel />
      </div>
      <div className="col-span-2"><AiAssistant onDisplay={setProgramVerse} /></div>
      <div className="col-span-3"><StagePanel /></div>
    </div>
  )
}

function ProgramMonitor({ elapsed, verse, clearVerse }: {
  elapsed: number; verse: { ref: string; text: string } | null; clearVerse: () => void
}) {
  const programId = useMediaEngine(s => s.programId)
  const sources   = useMediaEngine(s => s.sources)
  const prog = sources.find(s => s.id === programId)
  return (
    <div className="rounded-xl overflow-hidden border border-red-500/40 bg-black flex flex-col">
      <div className="flex items-center justify-between px-3 h-8 bg-[#0c0c15] border-b border-white/[0.05]">
        <span className="flex items-center gap-2 text-[12px] font-bold">
          <span className="live-dot w-2 h-2 rounded-full bg-red-500" />
          <span className="text-red-400">PROGRAM</span>
          <span className="text-white/45 font-medium">(LIVE)</span>
        </span>
        <span className="text-[11px] text-white/40 font-mono truncate max-w-[110px]">{prog?.label ?? '1080p60'}</span>
      </div>
      <div className="relative aspect-video">
        <SourceVideo id={programId} type={prog?.type} label={prog?.label ?? 'No Program'} className="w-full h-full" />
        {verse && (
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <div className="border-l-[3px] border-purple-400 pl-4 group">
              <div className="text-3xl font-bold text-white drop-shadow-lg flex items-center gap-2">
                {verse.ref}
                <button onClick={clearVerse} className="opacity-0 group-hover:opacity-100 transition-opacity"><X size={16} className="text-white/60" /></button>
              </div>
              <p className="text-[15px] text-white/90 leading-snug mt-1 max-w-[92%] drop-shadow">{verse.text}</p>
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center gap-4 px-3 h-9 bg-[#0c0c15] text-[11px]">
        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-600 text-white font-bold"><Circle size={7} className="fill-white" /> LIVE</span>
        <span className="flex items-center gap-1 text-white/65"><Eye size={12} /> 12,452</span>
        <span className="flex items-center gap-1 text-white/65"><ThumbsUp size={12} /> 3,128</span>
        <span className="flex items-center gap-1 text-white/65 ml-auto font-mono"><Clock size={12} /> {fmtClock(elapsed)}</span>
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
      <SourceVideo id={previewId} type={prev?.type} label={prev?.label ?? 'Select a source below'} className="aspect-video" />
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

const CATEGORIES: { label: string; types: SourceType[] }[] = [
  { label: 'VIDEO SOURCES',   types: ['camera', 'screen', 'pattern'] },
  { label: 'MEDIA SOURCES',   types: ['media', 'image', 'color'] },
  { label: 'NDI SOURCES',     types: ['ndi', 'network'] },
  { label: 'CAPTURE CARDS',   types: ['camera'] },
  { label: 'VIRTUAL SOURCES', types: ['color', 'timer', 'clock', 'pattern', 'image'] },
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

  const addCamera = async () => {
    const me = useMediaEngine.getState()
    if (me.permissionState !== 'granted') await me.requestPermission()
    await me.addCamera('default', 'Camera')
    setMenuOpen(false)
  }
  const addScreen = async () => { await useMediaEngine.getState().addScreenSource(); setMenuOpen(false) }
  const addColor  = () => { useMediaEngine.getState().addColorSource('#1e293b', 'Color'); setMenuOpen(false) }
  const addClock  = () => { useMediaEngine.getState().addClockSource(); setMenuOpen(false) }
  const addTimer  = () => { useMediaEngine.getState().addCountdownSource(5, 'Countdown'); setMenuOpen(false) }
  const addBars   = () => { useMediaEngine.getState().addTestPattern(); setMenuOpen(false) }

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

      <input ref={fileRef} type="file" accept="video/*,audio/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) useMediaEngine.getState().addMediaFile(f); e.target.value = '' }} />
      <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) useMediaEngine.getState().addImageSource(f); e.target.value = '' }} />

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

function AiAssistant({ onDisplay }: { onDisplay: (v: { ref: string; text: string }) => void }) {
  const transcript = useServiceStore(s => s.transcript)
  const detections = useServiceStore(s => s.detections)
  const aiListening = useServiceStore(s => s.aiListening)
  const setAiListening = useServiceStore(s => s.setAiListening)
  const latest = detections.find(d => d.kind === 'scripture') ?? detections[0]

  return (
    <Panel className="h-full">
      <div className="flex items-center gap-2 px-3 h-9 border-b border-white/[0.05]">
        <Brain size={15} className="text-purple-400" />
        <span className="text-[12px] font-semibold tracking-wide text-white/75 uppercase">AI Assistant</span>
        <button onClick={() => setAiListening(!aiListening)} className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] text-white/50 hover:text-white/80">
          {aiListening ? 'Pause' : 'Listen'}
        </button>
      </div>
      <div className="p-3 space-y-3 overflow-y-auto">
        <div className="rounded-lg bg-black/30 border border-white/[0.05] p-2.5">
          <div className="flex items-center gap-1.5 text-[11px] text-white/50 mb-2">
            <Mic size={11} className={aiListening ? 'text-purple-400' : 'text-white/30'} /> {aiListening ? 'Listening...' : 'Idle'}
          </div>
          <div className="flex items-end gap-0.5 h-8">
            {Array.from({ length: 40 }).map((_, i) => (
              <span key={i} className="flex-1 rounded-full bg-gradient-to-t from-purple-600 to-fuchsia-400"
                style={{ height: `${aiListening ? 20 + Math.abs(Math.sin(i * 0.9 + Date.now() / 400)) * 80 : 8}%`, opacity: aiListening ? 0.5 + Math.abs(Math.sin(i)) * 0.5 : 0.2 }} />
            ))}
          </div>
          {transcript && <p className="text-[9.5px] text-white/35 italic mt-1.5 line-clamp-2">…{transcript.slice(-120)}</p>}
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
          <Sparkles size={12} /> {latest ? 'Scripture Detected' : 'Awaiting detection'}
        </div>

        <div>
          <div className="text-lg font-bold text-white">{latest?.reference ?? 'Romans 8:28'}</div>
          <p className="text-[11px] text-white/55 leading-relaxed mt-1 line-clamp-4">
            {latest?.text ?? 'Speak a scripture reference or quote — detections appear here live, ready to project.'}
          </p>
        </div>

        <div className="space-y-1.5 pt-1">
          <button
            onClick={() => latest && onDisplay({ ref: latest.reference, text: latest.text })}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white hover:from-purple-500 hover:to-fuchsia-500"
          >
            <MonitorSmartphone size={12} /> Display on Screen
          </button>
          <button
            onClick={() => latest && onDisplay({ ref: latest.reference, text: latest.text })}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold bg-white/[0.05] text-white/65 hover:bg-white/[0.09]"
          ><FileText size={12} /> Add as Lower Third</button>
          <button className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold bg-white/[0.05] text-white/65 hover:bg-white/[0.09]"><FileText size={12} /> Add to Notes</button>
          <button className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold bg-white/[0.05] text-white/65 hover:bg-white/[0.09]"><Scissors size={12} /> Generate Social Clip</button>
          <button className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold bg-white/[0.05] text-white/65 hover:bg-white/[0.09]"><Brain size={12} /> AI Sermon Notes</button>
        </div>
      </div>
    </Panel>
  )
}

// ── Stage display panel (with working sermon timer) ────────────────────────

const STAGE_TABS = ['NEXT', 'NOTES', 'ANNOUNCEMENTS', 'TIMER']

function StagePanel() {
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
        <span className="text-[10px] text-white/35">(Live Feed)</span>
      </div>
      <div className="p-3 space-y-3">
        <div className="relative overflow-hidden rounded-lg aspect-video p-4 flex flex-col justify-center bg-gradient-to-br from-orange-800 via-red-900 to-amber-950">
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="relative z-10">
            <div className="text-2xl font-bold text-white drop-shadow">Romans 8:28</div>
            <p className="text-[12px] text-white/85 leading-snug mt-1.5 drop-shadow">
              And we know that in all things God works for the good of those who love him, who have been called according to his purpose.
            </p>
          </div>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-40 text-5xl">✝</div>
        </div>

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
          <div className="rounded-lg bg-black/30 border border-white/[0.06] p-3">
            <div className="text-sm font-bold text-white mb-1">Romans 8:29 — Up Next</div>
            <p className="text-[10px] text-white/50 leading-relaxed">For those God foreknew he also predestined to be conformed to the image of his Son...</p>
          </div>
        )}
        {tab === 1 && (
          <div className="rounded-lg bg-black/30 border border-white/[0.06] p-3 text-[11px] text-white/60 leading-relaxed">
            Sermon notes: God's sovereignty in all circumstances. Point 1 — His purpose. Point 2 — His calling.
          </div>
        )}
        {tab === 2 && (
          <div className="rounded-lg bg-black/30 border border-white/[0.06] p-3 text-[11px] text-white/60 leading-relaxed">
            📣 Youth night Friday 7pm · Baptism class Sunday · Volunteers needed for next week.
          </div>
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

function BottomDeck() {
  return (
    <div className="grid grid-cols-12 gap-3">
      <div className="col-span-5"><AudioMixer /></div>
      <div className="col-span-3"><StreamingPanel /></div>
      <div className="col-span-4"><MultiView /></div>
      <div className="col-span-5"><LiveChat /></div>
      <div className="col-span-4"><Polling /></div>
      <div className="col-span-3"><Leaderboard /></div>
    </div>
  )
}

// ── Audio mixer (interactive faders) ───────────────────────────────────────

const INITIAL_CHANNELS = [
  { name: 'Mic 1', sub: 'Pastor',      level: 70 },
  { name: 'Mic 2', sub: 'Worship Ldr', level: 60 },
  { name: 'Mic 3', sub: 'Guest',       level: 45 },
  { name: 'Music', sub: 'Playback',    level: 80 },
  { name: 'SFX',   sub: 'Ambience',    level: 30 },
  { name: 'NDI',   sub: 'Audio 1',     level: 50 },
  { name: 'Zoom',  sub: 'Guest',       level: 40 },
  { name: 'Teams', sub: 'Guest',       level: 42 },
  { name: 'Master', sub: 'Output',     level: 85, master: true },
]

function AudioMixer() {
  const [chans, setChans] = useState(INITIAL_CHANNELS.map(c => ({ ...c, mute: false, solo: false })))
  const set = (i: number, patch: Partial<(typeof chans)[number]>) =>
    setChans(cs => cs.map((c, j) => j === i ? { ...c, ...patch } : c))
  const dbOf = (lvl: number) => lvl === 0 ? '-∞' : (((lvl - 100) / 100) * 40).toFixed(1)

  return (
    <Panel title="Audio Mixer" className="h-[230px]">
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
    </Panel>
  )
}

// ── Streaming & recording (toggleable destinations + recorder) ─────────────

const INITIAL_STREAMS = [
  { name: 'YouTube Live',    color: 'bg-red-600',    on: true },
  { name: 'Facebook Live',   color: 'bg-blue-600',   on: true },
  { name: 'Zoom Webinar',    color: 'bg-sky-500',    on: true },
  { name: 'Microsoft Teams', color: 'bg-indigo-600', on: false },
  { name: 'Custom RTMP',     color: 'bg-purple-600', on: false },
]

function StreamingPanel() {
  const [streams, setStreams] = useState(INITIAL_STREAMS)
  const [recording, setRecording] = useState(true)
  const [recSecs, setRecSecs] = useState(28 * 60 + 56)
  useEffect(() => {
    if (!recording) return
    const t = setInterval(() => setRecSecs(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [recording])

  return (
    <Panel
      title="Streaming & Recording"
      right={<span className="flex items-center gap-1 text-[10px] text-red-400 font-bold"><Circle size={6} className="fill-red-500 text-red-500" /> REC</span>}
      className="h-[230px]"
    >
      <div className="flex gap-3 p-3 h-full">
        <div className="flex-1 space-y-1.5">
          {streams.map((s, i) => (
            <button
              key={s.name}
              onClick={() => setStreams(st => st.map((x, j) => j === i ? { ...x, on: !x.on } : x))}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04]"
            >
              <span className={cn('w-5 h-5 rounded flex items-center justify-center text-[8px] font-bold text-white', s.color)}>{s.name.charAt(0)}</span>
              <span className="text-[11px] text-white/70 flex-1 truncate text-left">{s.name}</span>
              <span className={cn('w-7 h-3.5 rounded-full relative transition-colors', s.on ? 'bg-emerald-500/80' : 'bg-white/15')}>
                <span className={cn('absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all', s.on ? 'left-3.5' : 'left-0.5')} />
              </span>
            </button>
          ))}
        </div>
        <div className="w-[110px] rounded-lg bg-red-950/20 border border-red-500/20 p-2.5 flex flex-col items-center">
          <span className="flex items-center gap-1 text-[10px] font-bold text-red-400"><Circle size={6} className={cn('text-red-500 fill-red-500', recording && 'live-dot')} /> {recording ? 'LIVE' : 'IDLE'}</span>
          <div className="text-[10px] text-white/50 mt-2">Recording</div>
          <div className="text-[13px] font-mono font-bold text-white tabular-nums">{fmtClock(recSecs)}</div>
          <div className="flex gap-1.5 mt-2.5">
            <button onClick={() => setRecording(r => !r)} className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center">
              {recording ? <span className="w-2.5 h-2.5 bg-white rounded-[2px]" /> : <Circle size={12} className="fill-white text-white" />}
            </button>
            <button className="w-8 h-8 rounded-full bg-white/[0.08] flex items-center justify-center"><Pause size={13} className="text-white/70" /></button>
          </div>
          <div className="text-[9px] text-white/40 mt-2.5">File Size</div>
          <div className="text-[11px] font-mono text-white/70">{(recSecs * 0.0014).toFixed(2)} GB</div>
        </div>
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

const INITIAL_CHAT = [
  { name: 'Sarah J.',   msg: 'This is powerful!! 🙌' },
  { name: 'Michael T.', msg: 'Glory to God! 🙏' },
  { name: 'James K.',   msg: 'Amen! 🙏' },
  { name: 'Grace A.',   msg: 'So blessed today 💜' },
  { name: 'David P.',   msg: 'Hallelujah! 🙌' },
]

function LiveChat() {
  const [chat, setChat] = useState(INITIAL_CHAT)
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
      right={<span className="flex items-center gap-1 text-[10px] text-emerald-400"><Users size={11} /> {428 + chat.length - INITIAL_CHAT.length}</span>}
      className="h-[230px]"
    >
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {chat.map((c, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0', c.name === 'You' ? 'bg-purple-600' : 'bg-gradient-to-br from-purple-500 to-orange-500')}>{c.name.charAt(0)}</div>
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

// ── Polling ────────────────────────────────────────────────────────────────

const POLL = [
  { label: 'Facebook',       pct: 42, color: 'bg-blue-500' },
  { label: 'Church Website', pct: 28, color: 'bg-emerald-500' },
  { label: 'Friend',         pct: 18, color: 'bg-purple-500' },
  { label: 'YouTube',        pct: 8,  color: 'bg-red-500' },
  { label: 'Other',          pct: 4,  color: 'bg-orange-500' },
]

function Polling() {
  return (
    <Panel title="Polling" className="h-[230px]">
      <div className="p-3 flex flex-col h-full">
        <div className="text-[11px] text-white/55 mb-2.5">How did you hear about this event?</div>
        <div className="space-y-2 flex-1">
          {POLL.map(p => (
            <div key={p.label}>
              <div className="flex items-center justify-between text-[10px] mb-0.5">
                <span className="text-white/60">{p.label}</span>
                <span className="text-white/45 font-mono">{p.pct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div className={cn('h-full rounded-full', p.color)} style={{ width: `${p.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between text-[10px] pt-2 border-t border-white/[0.05] mt-2">
          <span className="text-white/40">Total Votes: 1,245</span>
          <span className="flex items-center gap-1 text-emerald-400"><Circle size={5} className="fill-emerald-400 text-emerald-400" /> Live</span>
        </div>
      </div>
    </Panel>
  )
}

// ── Leaderboard ────────────────────────────────────────────────────────────

const LEADERS = [
  { rank: 1, name: 'David K.',   pts: 950 },
  { rank: 2, name: 'Grace A.',   pts: 870 },
  { rank: 3, name: 'Michael T.', pts: 760 },
  { rank: 4, name: 'Sarah J.',   pts: 640 },
  { rank: 5, name: 'James K.',   pts: 540 },
]
const MEDALS = ['bg-yellow-500', 'bg-slate-300', 'bg-amber-700']

function Leaderboard() {
  return (
    <Panel title="Quiz Leaderboard" className="h-[230px]">
      <div className="p-3 flex flex-col h-full">
        <div className="space-y-1.5 flex-1">
          {LEADERS.map(l => (
            <div key={l.rank} className={cn('flex items-center gap-2.5 px-2 py-1.5 rounded-lg', l.rank <= 3 ? 'bg-white/[0.04]' : '')}>
              <span className={cn('w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold',
                l.rank <= 3 ? `${MEDALS[l.rank - 1]} text-black` : 'text-white/40')}>{l.rank}</span>
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-orange-500 flex items-center justify-center text-[9px] font-bold">{l.name.charAt(0)}</div>
              <span className="text-[12px] text-white/75 flex-1 truncate">{l.name}</span>
              <span className="text-[11px] font-bold text-purple-300 font-mono">{l.pts} pts</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-white/40 pt-2 border-t border-white/[0.05] mt-2">
          <Plus size={11} /> Participants: 1,204
        </div>
      </div>
    </Panel>
  )
}

// ── Bottom status bar ──────────────────────────────────────────────────────

function BottomBar({ sourceCount }: { sourceCount: number }) {
  return (
    <footer className="h-7 shrink-0 flex items-center justify-between px-4 bg-[#0a0a12] border-t border-white/[0.06] text-[10.5px] text-white/45">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5 font-semibold text-white/65"><Crown size={11} className="text-purple-400" /> GloryCast OS v1.0.0</span>
        <span className="flex items-center gap-1 text-emerald-400"><Circle size={5} className="fill-emerald-400 text-emerald-400" /> Online</span>
      </div>
      <div className="flex items-center gap-5">
        <span>Project: <b className="text-white/65 font-medium">Sunday Service</b></span>
        <span>Sources: <b className="text-white/65 font-medium">{sourceCount}</b></span>
        <span>Resolution: <b className="text-white/65 font-medium">1080p60</b></span>
        <span>FPS: <b className="text-white/65 font-medium">60</b></span>
        <span>Memory: <b className="text-white/65 font-medium">6.2 GB / 16 GB</b></span>
      </div>
      <span className="flex items-center gap-1.5">Auto Save: <b className="text-emerald-400">Enabled</b> <Circle size={5} className="fill-emerald-400 text-emerald-400" /></span>
    </footer>
  )
}
