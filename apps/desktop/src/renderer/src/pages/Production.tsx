import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Crown, Menu, Bell, MessageSquare, HelpCircle, ChevronDown, Cpu, Wifi,
  Video, Film, Music2, BookOpen, Sparkles, Users, Image as ImageIcon,
  SlidersHorizontal, Play, Radio, MonitorSmartphone, Settings, Plus,
  LayoutGrid, List, Eye, ThumbsUp, Clock, Mic, Brain, Send, FileText,
  Scissors, RotateCw, Power, Pause, Circle, Link2, ChevronRight,
} from 'lucide-react'
import { useAiCopilot } from '../hooks/useAiCopilot'
import { cn } from '../lib/utils'

// ═══════════════════════════════════════════════════════════════════════════
// Production — full-screen cinematic broadcast control room (GloryCast OS)
// Self-contained chrome: top status bar, left scene/nav rail, bottom status bar.
// ═══════════════════════════════════════════════════════════════════════════

const ACCENT_GRADIENTS = [
  'from-purple-900 via-indigo-800 to-fuchsia-900',
  'from-blue-900 via-cyan-800 to-slate-900',
  'from-orange-900 via-red-800 to-rose-900',
  'from-emerald-900 via-teal-800 to-slate-900',
  'from-violet-900 via-purple-800 to-indigo-900',
  'from-rose-900 via-pink-800 to-purple-900',
]

function fmtClock(s: number) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

export function ProductionPage() {
  useAiCopilot()
  const [elapsed, setElapsed] = useState(28 * 60 + 56)
  useEffect(() => {
    const t = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="w-full h-full flex flex-col bg-[#070709] text-white/90 overflow-hidden select-none">
      <TopBar elapsed={elapsed} />
      <div className="flex-1 flex min-h-0">
        <SceneRail />
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
            <TopDeck elapsed={elapsed} />
            <BottomDeck />
          </div>
        </div>
      </div>
      <BottomBar />
    </div>
  )
}

// ── Top status bar ─────────────────────────────────────────────────────────

function TopBar({ elapsed }: { elapsed: number }) {
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
        <span className="flex items-center gap-1.5 text-white/55"><Cpu size={13} className="text-cyan-400" /> CPU <b className="text-white/80 font-semibold">23%</b></span>
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

// ── Reusable feed tile (simulated camera/source) ───────────────────────────

function Feed({ gradient, children, className }: { gradient: string; children?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('relative overflow-hidden bg-gradient-to-br', gradient, className)}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(255,255,255,0.12),transparent_60%)]" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      {children}
    </div>
  )
}

function Panel({ title, right, children, className, bodyClass }: {
  title?: string; right?: React.ReactNode; children: React.ReactNode; className?: string; bodyClass?: string
}) {
  return (
    <section className={cn('rounded-xl bg-[#0c0c15] border border-white/[0.06] flex flex-col min-h-0', className)}>
      {title && (
        <div className="flex items-center justify-between px-3 h-9 shrink-0 border-b border-white/[0.05]">
          <h3 className="text-[12px] font-semibold tracking-wide text-white/75 uppercase">{title}</h3>
          {right}
        </div>
      )}
      <div className={cn('flex-1 min-h-0', bodyClass)}>{children}</div>
    </section>
  )
}

// ── Top deck: PROGRAM / PREVIEW / AI / STAGE + sources ─────────────────────

function TopDeck({ elapsed }: { elapsed: number }) {
  return (
    <div className="grid grid-cols-12 gap-3">
      <div className="col-span-7 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <ProgramMonitor elapsed={elapsed} />
          <PreviewMonitor />
        </div>
        <SourcesPanel />
      </div>
      <div className="col-span-2"><AiAssistant /></div>
      <div className="col-span-3"><StagePanel /></div>
    </div>
  )
}

function VerseLowerThird() {
  return (
    <div className="absolute bottom-0 left-0 right-0 p-5">
      <div className="border-l-[3px] border-purple-400 pl-4">
        <div className="text-3xl font-bold text-white drop-shadow-lg">Romans <span className="text-purple-300">8:28</span></div>
        <p className="text-[15px] text-white/90 leading-snug mt-1 max-w-[92%] drop-shadow">
          And we know that in all things God works for the good of those who love him, who have been called according to his purpose.
        </p>
      </div>
    </div>
  )
}

function ProgramMonitor({ elapsed }: { elapsed: number }) {
  return (
    <div className="rounded-xl overflow-hidden border border-red-500/40 bg-black flex flex-col">
      <div className="flex items-center justify-between px-3 h-8 bg-[#0c0c15] border-b border-white/[0.05]">
        <span className="flex items-center gap-2 text-[12px] font-bold">
          <span className="live-dot w-2 h-2 rounded-full bg-red-500" />
          <span className="text-red-400">PROGRAM</span>
          <span className="text-white/45 font-medium">(LIVE)</span>
        </span>
        <span className="text-[11px] text-white/40 font-mono">1080p60</span>
      </div>
      <Feed gradient="from-purple-950 via-indigo-900 to-fuchsia-950" className="aspect-video">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-28 h-28 rounded-full bg-white/10 blur-2xl" />
        <VerseLowerThird />
      </Feed>
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
  const [trans, setTrans] = useState<string>('FADE')
  return (
    <div className="rounded-xl overflow-hidden border border-white/10 bg-black flex flex-col">
      <div className="flex items-center justify-between px-3 h-8 bg-[#0c0c15] border-b border-white/[0.05]">
        <span className="text-[12px] font-bold text-white/70">PREVIEW</span>
        <span className="text-[11px] text-white/40 font-mono">1080p60</span>
      </div>
      <Feed gradient="from-blue-950 via-cyan-900 to-slate-950" className="aspect-video flex items-center justify-center">
        <button className="relative z-10 w-14 h-14 rounded-full bg-white/15 backdrop-blur border border-white/25 flex items-center justify-center hover:bg-white/25 transition-colors">
          <Play size={22} className="text-white fill-white ml-0.5" />
        </button>
      </Feed>
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
          <span className="text-[10px] text-white/40 uppercase tracking-wider">Next</span>
          <div className="flex-1 h-1 rounded-full bg-white/10 relative">
            <div className="absolute left-0 top-0 h-full w-3/4 rounded-full bg-purple-500" />
            <div className="absolute left-3/4 -top-1 w-3 h-3 rounded-full bg-purple-400 -translate-x-1/2" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[12px] text-white/55 font-mono">⏱ 1.0s</span>
          <button className="flex-1 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white text-[13px] font-bold tracking-wider hover:from-purple-500 hover:to-fuchsia-500 transition-colors">
            TAKE
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Sources panel ──────────────────────────────────────────────────────────

const SOURCE_TABS = ['VIDEO SOURCES', 'MEDIA SOURCES', 'NDI SOURCES', 'CAPTURE CARDS', 'VIRTUAL SOURCES']

const SOURCES = [
  { n: 1,  name: 'Camera 1',  sub: 'Sony A7S III',     live: true,  g: 0 },
  { n: 2,  name: 'Camera 2',  sub: 'Blackmagic 4K',    live: true,  g: 1 },
  { n: 3,  name: 'Camera 3',  sub: 'Canon XA60',       live: true,  g: 2 },
  { n: 4,  name: 'NDI Stage Left', sub: 'NDI',         live: false, g: 4 },
  { n: 5,  name: 'Zoom Guest', sub: 'Pastor David',    live: true,  g: 3 },
  { n: 6,  name: 'Microsoft Teams', sub: 'Guest',      live: true,  g: 1 },
  { n: 7,  name: 'Presentation', sub: 'Main Screen',   live: false, g: 5 },
  { n: 8,  name: 'Media Player', sub: 'Worship Motion', live: true, g: 0 },
  { n: 9,  name: 'Lower Third', sub: 'Announcements',  live: false, g: 2 },
  { n: 10, name: 'Bible Verses', sub: 'ESV',           live: false, g: 4 },
  { n: 11, name: 'YouTube Feed', sub: 'Live Chat',     live: false, g: 3 },
  { n: 12, name: 'Image', sub: 'Church Logo',          live: false, g: 5, special: 'logo' },
  { n: 13, name: 'Countdown', sub: '05',               live: false, g: 1, special: 'timer' },
  { n: 14, name: 'Screen Capture', sub: 'Stage Display', live: true, g: 0 },
]

function SourcesPanel() {
  const [tab, setTab] = useState(0)
  return (
    <Panel className="bg-[#0c0c15]">
      <div className="flex items-center gap-1 px-3 h-10 border-b border-white/[0.05] overflow-x-auto">
        {SOURCE_TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(i)}
            className={cn(
              'px-2.5 py-1 rounded-md text-[10.5px] font-semibold tracking-wide whitespace-nowrap transition-colors',
              tab === i ? 'text-purple-300 bg-purple-600/15' : 'text-white/40 hover:text-white/70',
            )}
          >{t}</button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.06] hover:bg-white/10 text-[11px] font-medium text-white/70">
            <Plus size={12} /> Add Source
          </button>
          <button className="w-7 h-7 rounded-md bg-white/[0.04] flex items-center justify-center text-white/40 hover:text-white/70"><List size={13} /></button>
          <button className="w-7 h-7 rounded-md bg-purple-600/20 flex items-center justify-center text-purple-300"><LayoutGrid size={13} /></button>
        </div>
      </div>
      <div className="p-2.5 grid grid-cols-7 gap-2">
        {SOURCES.map(s => (
          <div key={s.n} className="rounded-lg overflow-hidden border border-white/[0.07] bg-black/40 group cursor-pointer hover:border-purple-500/40 transition-colors">
            <Feed gradient={ACCENT_GRADIENTS[s.g]} className="aspect-video">
              {s.live && (
                <span className="absolute top-1 right-1 px-1 py-px rounded bg-red-600 text-[7px] font-bold text-white">LIVE</span>
              )}
              {s.special === 'logo' && <div className="absolute inset-0 flex items-center justify-center"><div className="w-7 h-7 rounded-md bg-cyan-400/80" /></div>}
              {s.special === 'timer' && <div className="absolute inset-0 flex items-center justify-center font-mono text-sm font-bold text-white/90">05:00</div>}
            </Feed>
            <div className="px-1.5 py-1 bg-[#0a0a12]">
              <div className="text-[9.5px] font-medium text-white/75 truncate">{s.n} {s.name}</div>
              <div className="text-[8.5px] text-white/35 truncate">{s.sub}</div>
            </div>
          </div>
        ))}
        <button className="rounded-lg border border-dashed border-white/15 bg-white/[0.02] hover:bg-white/[0.04] flex flex-col items-center justify-center aspect-video text-white/40 hover:text-white/70 transition-colors">
          <Plus size={18} />
          <span className="text-[9px] mt-1 font-medium">Add Source</span>
        </button>
      </div>
    </Panel>
  )
}

// ── AI Assistant panel ─────────────────────────────────────────────────────

function AiAssistant() {
  const actions = [
    { label: 'Display on Screen', primary: true,  icon: MonitorSmartphone },
    { label: 'Add as Lower Third', icon: FileText },
    { label: 'Add to Notes',       icon: FileText },
    { label: 'Generate Social Clip', icon: Scissors },
    { label: 'AI Sermon Notes',    icon: Brain },
  ]
  return (
    <Panel className="h-full">
      <div className="flex items-center gap-2 px-3 h-9 border-b border-white/[0.05]">
        <Brain size={15} className="text-purple-400" />
        <span className="text-[12px] font-semibold tracking-wide text-white/75 uppercase">AI Assistant</span>
      </div>
      <div className="p-3 space-y-3 overflow-y-auto">
        <div className="rounded-lg bg-black/30 border border-white/[0.05] p-2.5">
          <div className="flex items-center gap-1.5 text-[11px] text-white/50 mb-2">
            <Mic size={11} className="text-purple-400" /> Listening...
          </div>
          <div className="flex items-end gap-0.5 h-8">
            {Array.from({ length: 40 }).map((_, i) => (
              <span key={i} className="flex-1 rounded-full bg-gradient-to-t from-purple-600 to-fuchsia-400"
                style={{ height: `${20 + Math.abs(Math.sin(i * 0.9)) * 80}%`, opacity: 0.5 + Math.abs(Math.sin(i)) * 0.5 }} />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
          <Sparkles size={12} /> Scripture Detected
        </div>

        <div>
          <div className="text-lg font-bold text-white">Romans <span className="text-purple-300">8:28</span></div>
          <p className="text-[11px] text-white/55 leading-relaxed mt-1">
            And we know that in all things God works for the good of those who love him, who have been called according to his purpose.
          </p>
        </div>

        <div className="space-y-1.5 pt-1">
          {actions.map(({ label, primary, icon: Icon }) => (
            <button
              key={label}
              className={cn(
                'w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors',
                primary
                  ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white hover:from-purple-500 hover:to-fuchsia-500'
                  : 'bg-white/[0.05] text-white/65 hover:bg-white/[0.09]',
              )}
            >
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>
      </div>
    </Panel>
  )
}

// ── Stage display panel ────────────────────────────────────────────────────

const STAGE_TABS = ['NEXT', 'NOTES', 'ANNOUNCEMENTS', 'TIMER']

function StagePanel() {
  const [tab, setTab] = useState(0)
  return (
    <Panel className="h-full">
      <div className="flex items-center gap-2 px-3 h-9 border-b border-white/[0.05]">
        <MonitorSmartphone size={15} className="text-cyan-400" />
        <span className="text-[12px] font-semibold tracking-wide text-white/75 uppercase">Stage Display</span>
        <span className="text-[10px] text-white/35">(Live Feed)</span>
      </div>
      <div className="p-3 space-y-3">
        <Feed gradient="from-orange-800 via-red-900 to-amber-950" className="rounded-lg aspect-video p-4 flex flex-col justify-center">
          <div className="relative z-10">
            <div className="text-2xl font-bold text-white drop-shadow">Romans 8:28</div>
            <p className="text-[12px] text-white/85 leading-snug mt-1.5 drop-shadow">
              And we know that in all things God works for the good of those who love him, who have been called according to his purpose.
            </p>
          </div>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-40 text-5xl">✝</div>
        </Feed>

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

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-black/30 border border-white/[0.06] p-3">
            <div className="text-sm font-bold text-white mb-1">Romans 8:29</div>
            <p className="text-[10px] text-white/50 leading-relaxed">
              For those God foreknew he also predestined to be conformed to the image of his Son...
            </p>
            <div className="mt-2 text-2xl opacity-30 text-orange-300">📖</div>
          </div>
          <div className="rounded-lg bg-black/30 border border-white/[0.06] p-3 flex flex-col items-center justify-center">
            <div className="text-3xl font-bold font-mono text-white tabular-nums">05:00</div>
            <div className="text-[10px] text-white/40 mt-1">Sermon Timer</div>
            <div className="flex items-center gap-2 mt-3">
              <button className="w-8 h-8 rounded-lg bg-emerald-600/80 hover:bg-emerald-600 flex items-center justify-center"><Play size={13} className="fill-white text-white ml-0.5" /></button>
              <button className="w-8 h-8 rounded-lg bg-white/[0.08] hover:bg-white/15 flex items-center justify-center"><RotateCw size={13} className="text-white/70" /></button>
              <button className="w-8 h-8 rounded-lg bg-white/[0.08] hover:bg-white/15 flex items-center justify-center"><Power size={13} className="text-white/70" /></button>
            </div>
          </div>
        </div>
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

// ── Audio mixer ────────────────────────────────────────────────────────────

const CHANNELS = [
  { name: 'Mic 1', sub: 'Pastor',      db: '-3.2', level: 0.7 },
  { name: 'Mic 2', sub: 'Worship Ldr', db: '-4.5', level: 0.6 },
  { name: 'Mic 3', sub: 'Guest',       db: '-6.0', level: 0.45 },
  { name: 'Music', sub: 'Playback',    db: '-2.0', level: 0.8 },
  { name: 'SFX',   sub: 'Ambience',    db: '-8.3', level: 0.3 },
  { name: 'NDI',   sub: 'Audio 1',     db: '-5.1', level: 0.5 },
  { name: 'Zoom',  sub: 'Guest',       db: '-6.2', level: 0.4 },
  { name: 'Teams', sub: 'Guest',       db: '-6.4', level: 0.42 },
  { name: 'Master', sub: 'Output',     db: '-1.8', level: 0.85, master: true },
]

function AudioMixer() {
  return (
    <Panel title="Audio Mixer" className="h-[230px]">
      <div className="flex gap-1.5 p-3 h-full overflow-x-auto">
        {CHANNELS.map(ch => (
          <div key={ch.name} className={cn('flex flex-col items-center gap-1.5 px-1.5 py-1 rounded-lg shrink-0 w-[58px]',
            ch.master ? 'bg-purple-600/10 border border-purple-500/25' : 'bg-white/[0.02]')}>
            <div className="text-center leading-tight">
              <div className="text-[10px] font-semibold text-white/80 truncate w-full">{ch.name}</div>
              <div className="text-[8px] text-white/35 truncate w-full">{ch.sub}</div>
            </div>
            <div className="relative w-7 h-7 rounded-full bg-[#15151f] border border-white/10">
              <div className="absolute left-1/2 top-1 w-0.5 h-2.5 bg-purple-400 origin-bottom rounded-full" style={{ transform: `translateX(-50%) rotate(${ch.level * 270 - 135}deg)` }} />
            </div>
            <div className="flex items-end gap-1 h-[90px] mt-1">
              <div className="relative w-1.5 h-full bg-white/[0.06] rounded-full">
                <div className="absolute left-1/2 -translate-x-1/2 w-3 h-3 rounded-sm bg-white/80 border border-white/30" style={{ bottom: `${ch.level * 100}%` }} />
              </div>
              <div className="w-2 h-full rounded-sm bg-black/40 overflow-hidden flex flex-col-reverse">
                <div className="w-full bg-gradient-to-t from-emerald-500 via-yellow-400 to-red-500" style={{ height: `${ch.level * 100}%` }} />
              </div>
            </div>
            <div className="text-[8px] font-mono text-white/45">{ch.db}</div>
            <div className="flex gap-1">
              <button className="w-4 h-4 rounded-[3px] bg-white/[0.06] text-[7px] font-bold text-white/40 hover:bg-white/15">M</button>
              <button className="w-4 h-4 rounded-[3px] bg-white/[0.06] text-[7px] font-bold text-white/40 hover:bg-white/15">S</button>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  )
}

// ── Streaming & recording ──────────────────────────────────────────────────

const STREAMS = [
  { name: 'YouTube Live',    color: 'bg-red-600' },
  { name: 'Facebook Live',   color: 'bg-blue-600' },
  { name: 'Zoom Webinar',    color: 'bg-sky-500' },
  { name: 'Microsoft Teams', color: 'bg-indigo-600' },
  { name: 'Custom RTMP',     color: 'bg-purple-600' },
]

function StreamingPanel() {
  return (
    <Panel
      title="Streaming & Recording"
      right={<span className="flex items-center gap-2 text-[10px]"><span className="flex items-center gap-1 text-red-400 font-bold"><Circle size={6} className="fill-red-500 text-red-500" /> REC</span><Link2 size={12} className="text-white/30" /></span>}
      className="h-[230px]"
    >
      <div className="flex gap-3 p-3 h-full">
        <div className="flex-1 space-y-1.5">
          {STREAMS.map(s => (
            <div key={s.name} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.05]">
              <span className={cn('w-5 h-5 rounded flex items-center justify-center text-[8px] font-bold text-white', s.color)}>{s.name.charAt(0)}</span>
              <span className="text-[11px] text-white/70 flex-1 truncate">{s.name}</span>
              <span className="text-[9px] text-white/35 font-mono">1080p60</span>
            </div>
          ))}
        </div>
        <div className="w-[110px] rounded-lg bg-red-950/20 border border-red-500/20 p-2.5 flex flex-col items-center">
          <span className="flex items-center gap-1 text-[10px] font-bold text-red-400"><Circle size={6} className="fill-red-500 text-red-500 live-dot" /> LIVE</span>
          <div className="text-[10px] text-white/50 mt-2">Recording</div>
          <div className="text-[13px] font-mono font-bold text-white tabular-nums">00:28:56</div>
          <div className="flex gap-1.5 mt-2.5">
            <button className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center"><Circle size={12} className="fill-white text-white" /></button>
            <button className="w-8 h-8 rounded-full bg-white/[0.08] flex items-center justify-center"><Pause size={13} className="text-white/70" /></button>
          </div>
          <div className="text-[9px] text-white/40 mt-2.5">File Size</div>
          <div className="text-[11px] font-mono text-white/70">2.45 GB</div>
          <div className="w-full h-1 rounded-full bg-white/10 mt-1.5 overflow-hidden">
            <div className="h-full w-2/3 bg-emerald-500" />
          </div>
        </div>
      </div>
    </Panel>
  )
}

// ── Multi-view ─────────────────────────────────────────────────────────────

const MV = [
  { n: 1, name: 'Cam 1', g: 0 }, { n: 2, name: 'Cam 2', g: 1 },
  { n: 3, name: 'Cam 3', g: 2 }, { n: 4, name: 'NDI Left', g: 4, ring: 'ring-emerald-400' },
  { n: 5, name: 'Zoom Guest', g: 3 }, { n: 6, name: 'Slides', g: 5 },
  { n: 7, name: 'Media', g: 0 }, { n: 8, name: 'Preview', g: 1, ring: 'ring-cyan-400' },
]

function MultiView() {
  return (
    <Panel title="Multi-View" right={<span className="text-[10px] text-white/35">8 Views</span>} className="h-[230px]">
      <div className="grid grid-cols-4 grid-rows-2 gap-1.5 p-2.5 h-full">
        {MV.map(m => (
          <div key={m.n} className={cn('relative rounded-md overflow-hidden border border-white/10', m.ring && `ring-1 ${m.ring}`)}>
            <Feed gradient={ACCENT_GRADIENTS[m.g]} className="w-full h-full">
              <span className="absolute bottom-0.5 left-1 text-[8px] font-medium text-white/80 drop-shadow">{m.n} {m.name}</span>
            </Feed>
          </div>
        ))}
      </div>
    </Panel>
  )
}

// ── Live chat ──────────────────────────────────────────────────────────────

const CHAT = [
  { name: 'Sarah J.',   msg: 'This is powerful!! 🙌' },
  { name: 'Michael T.', msg: 'Glory to God! 🙏' },
  { name: 'James K.',   msg: 'Amen! 🙏' },
  { name: 'Grace A.',   msg: 'So blessed today 💜' },
  { name: 'David P.',   msg: 'Hallelujah! 🙌' },
]

function LiveChat() {
  return (
    <Panel
      title="Live Chat"
      right={<span className="flex items-center gap-1 text-[10px] text-emerald-400"><Users size={11} /> 428</span>}
      className="h-[230px]"
    >
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {CHAT.map((c, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-orange-500 flex items-center justify-center text-[9px] font-bold shrink-0">{c.name.charAt(0)}</div>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-white/75">{c.name}</div>
                <div className="text-[11px] text-white/50">{c.msg}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="p-2.5 border-t border-white/[0.05] flex items-center gap-2">
          <input placeholder="Type a message..." className="flex-1 bg-white/[0.04] border border-white/[0.07] rounded-lg px-3 py-1.5 text-[11px] text-white/80 placeholder:text-white/25 outline-none focus:border-purple-500/40" />
          <button className="w-8 h-8 rounded-lg bg-purple-600 hover:bg-purple-500 flex items-center justify-center"><Send size={13} className="text-white" /></button>
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
    <Panel title="Polling" right={<button className="text-white/30 hover:text-white/60 text-[14px] leading-none">✕</button>} className="h-[230px]">
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
    <Panel title="Quiz Leaderboard" right={<button className="text-white/30 hover:text-white/60 text-[14px] leading-none">✕</button>} className="h-[230px]">
      <div className="p-3 flex flex-col h-full">
        <div className="space-y-1.5 flex-1">
          {LEADERS.map(l => (
            <div key={l.rank} className={cn('flex items-center gap-2.5 px-2 py-1.5 rounded-lg',
              l.rank <= 3 ? 'bg-white/[0.04]' : 'bg-transparent')}>
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

function BottomBar() {
  return (
    <footer className="h-7 shrink-0 flex items-center justify-between px-4 bg-[#0a0a12] border-t border-white/[0.06] text-[10.5px] text-white/45">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5 font-semibold text-white/65"><Crown size={11} className="text-purple-400" /> GloryCast OS v1.0.0</span>
        <span className="flex items-center gap-1 text-emerald-400"><Circle size={5} className="fill-emerald-400 text-emerald-400" /> Online</span>
      </div>
      <div className="flex items-center gap-5">
        <span>Project: <b className="text-white/65 font-medium">Sunday Service</b></span>
        <span>Resolution: <b className="text-white/65 font-medium">1080p60</b></span>
        <span>FPS: <b className="text-white/65 font-medium">60</b></span>
        <span>CPU: <b className="text-white/65 font-medium">23%</b></span>
        <span>GPU: <b className="text-white/65 font-medium">35%</b></span>
        <span>Memory: <b className="text-white/65 font-medium">6.2 GB / 16 GB</b></span>
      </div>
      <span className="flex items-center gap-1.5">Auto Save: <b className="text-emerald-400">Enabled</b> <Circle size={5} className="fill-emerald-400 text-emerald-400" /></span>
    </footer>
  )
}
