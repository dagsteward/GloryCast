import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  MonitorPlay, Video, Sparkles, Radio, BookOpen, Users,
  Clock, ChevronRight, Eye, Calendar, Gauge,
  Wifi, WifiOff, CheckCircle2, ArrowRight,
  SlidersHorizontal, Cast, Mic2,
} from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { useServiceStore } from '../stores/serviceStore'
import { LiveMonitor } from '../components/live/LiveMonitor'
import { CopilotFeed } from '../components/live/CopilotFeed'
import { cn } from '../lib/utils'

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const },
}
const stagger = { animate: { transition: { staggerChildren: 0.06 } } }

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function fmtClock(s: number) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

function fmtCountdown(target: number, now: number) {
  const diff = target - now
  if (diff <= 0) return 'Starting soon'
  const d = Math.floor(diff / 86_400_000)
  const h = Math.floor((diff % 86_400_000) / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  if (d > 0) return `in ${d}d ${h}h`
  if (h > 0) return `in ${h}h ${m}m`
  return `in ${m}m`
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { church, userDisplayName, connectionStatus, destinations } = useAppStore()

  const serviceActive    = useServiceStore(s => s.serviceActive)
  const serviceTitle     = useServiceStore(s => s.serviceTitle)
  const serviceStartedAt = useServiceStore(s => s.serviceStartedAt)
  const proMode          = useServiceStore(s => s.proMode)
  const setProMode       = useServiceStore(s => s.setProMode)

  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  // Simulate destination viewer stats while a service is live.
  useEffect(() => {
    if (!serviceActive) return
    const { updateDestination } = useAppStore.getState()
    const t = setInterval(() => {
      useAppStore.getState().destinations.filter(d => d.enabled).forEach((d, i) => {
        const baseViewers = [1284, 842, 511, 0][i] ?? 0
        const baseKbps    = [6000, 4500, 3000, 0][i] ?? 3000
        updateDestination(d.id, {
          status:  'live',
          viewers: baseViewers + Math.floor(Math.random() * 30 - 15),
          bitrate: baseKbps + Math.floor(Math.random() * 200 - 100),
          health:  95 + Math.floor(Math.random() * 5),
        })
      })
    }, 3000)
    return () => clearInterval(t)
  }, [serviceActive])

  const elapsed = serviceStartedAt ? Math.floor((now - serviceStartedAt) / 1000) : 0
  const liveDests = destinations.filter(d => serviceActive && d.status === 'live')
  const totalViewers = liveDests.reduce((s, d) => s + d.viewers, 0)
  const avgHealth = liveDests.length
    ? Math.round(liveDests.reduce((s, d) => s + d.health, 0) / liveDests.length)
    : 0
  const totalBitrate = liveDests.reduce((s, d) => s + d.bitrate, 0)

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden bg-broadcast">
      <motion.div
        variants={stagger}
        initial="initial"
        animate="animate"
        className="px-6 py-6 space-y-5 max-w-[1560px] mx-auto"
      >
        {/* ── Header ───────────────────────────────────────────────────────── */}
        <motion.div variants={fadeUp} className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-500 to-orange-500 flex items-center justify-center shrink-0 shadow-lg shadow-purple-900/30">
                <span className="text-[10px] font-black text-white">{church.name.charAt(0)}</span>
              </div>
              <span className="text-[11px] text-white/55 font-medium truncate">{church.name}</span>
              <span className="text-[11px] text-white/15">·</span>
              <span className="text-[11px] text-white/35 capitalize">{church.role.replace('_', ' ').toLowerCase()}</span>
            </div>
            <h1 className="text-[28px] leading-none font-bold text-white tracking-tight">
              {serviceActive ? serviceTitle : `${getGreeting()}, ${userDisplayName.split(' ')[0]}`}
            </h1>
            <p className="text-[13px] text-white/40 mt-2">
              {new Date(now).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              {'  ·  '}
              <span className="font-mono">{new Date(now).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setProMode(!proMode)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-medium border transition-colors',
                proMode
                  ? 'bg-orange-500/10 border-orange-500/25 text-orange-400'
                  : 'bg-white/[0.04] border-white/10 text-white/45 hover:text-white/70',
              )}
            >
              <SlidersHorizontal size={10} />
              {proMode ? 'Pro Control' : 'Auto-Pilot'}
            </button>

            <div className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-medium border',
              connectionStatus === 'connected'
                ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                : 'bg-white/[0.04] border-white/10 text-white/30',
            )}>
              {connectionStatus === 'connected' ? <Wifi size={10} /> : <WifiOff size={10} />}
              {connectionStatus === 'connected' ? 'Connected' : 'Offline'}
            </div>

            {serviceActive && (
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/15 border border-red-500/30"
              >
                <span className="live-dot w-2 h-2 rounded-full bg-red-400" />
                <span className="text-sm font-semibold text-red-400">LIVE</span>
                <span className="text-sm text-red-400/70 font-mono tabular-nums">{fmtClock(elapsed)}</span>
              </motion.div>
            )}

            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => navigate('/production')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-purple-600 text-white hover:bg-purple-500 shadow-lg shadow-purple-900/30 transition-all"
            >
              <Video size={14} /> Production Desk
            </motion.button>
          </div>
        </motion.div>

        {serviceActive
          ? <LiveDashboard
              elapsed={elapsed}
              totalViewers={totalViewers}
              avgHealth={avgHealth}
              totalBitrate={totalBitrate}
            />
          : <IdleDashboard now={now} />}
      </motion.div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// LIVE — focused control room: output bus + copilot, slim ops strip below
// ═══════════════════════════════════════════════════════════════════════════

function LiveDashboard({ elapsed, totalViewers, avgHealth, totalBitrate }: {
  elapsed: number; totalViewers: number; avgHealth: number; totalBitrate: number
}) {
  return (
    <>
      {/* Live telemetry strip */}
      <motion.div variants={fadeUp} className="grid grid-cols-4 gap-3">
        <Stat icon={Eye}    tone="emerald" label="Live viewers" value={totalViewers.toLocaleString()} />
        <Stat icon={Clock}  tone="red"     label="On air"       value={fmtClock(elapsed)} mono />
        <Stat icon={Gauge}  tone="purple"  label="Stream health" value={`${avgHealth}%`} />
        <Stat icon={Cast}   tone="blue"    label="Total bitrate" value={`${(totalBitrate / 1000).toFixed(1)} Mbps`} />
      </motion.div>

      {/* Output bus + Copilot */}
      <motion.div variants={fadeUp} className="grid grid-cols-12 gap-4">
        <div className="col-span-8"><ProgramBusCard /></div>
        <div className="col-span-4">
          <div className="card-premium overflow-hidden h-full min-h-[460px] flex flex-col bg-chrome">
            <CopilotFeed />
          </div>
        </div>
      </motion.div>

      {/* Ops row */}
      <motion.div variants={fadeUp} className="grid grid-cols-12 gap-4">
        <div className="col-span-12"><DestinationsCard totalViewers={totalViewers} /></div>
      </motion.div>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// IDLE — premium pre-flight: hero + readiness, plan, quick launch
// ═══════════════════════════════════════════════════════════════════════════

function IdleDashboard({ now }: { now: number }) {
  const navigate = useNavigate()
  const { upcomingService, destinations, connectionStatus } = useAppStore()
  const serviceDate = upcomingService ? new Date(upcomingService.date) : null
  const readyDests = destinations.filter(d => d.enabled).length

  const readiness = [
    { icon: Cast,        label: 'Destinations', detail: `${readyDests} ready`,        ok: readyDests > 0 },
    { icon: Wifi,        label: 'Connection',   detail: connectionStatus === 'connected' ? 'Online' : 'Offline', ok: connectionStatus === 'connected' },
    { icon: Sparkles,    label: 'AI Copilot',   detail: 'Standing by',                ok: true },
    { icon: BookOpen,    label: 'Bible engine', detail: 'KJV · WEB loaded',           ok: true },
  ]

  return (
    <>
      {/* Hero */}
      <motion.div variants={fadeUp} className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-br from-[#15101f] via-[#0d0c16] to-[#0a0a12]">
        <div className="absolute -top-24 -right-16 w-[420px] h-[420px] rounded-full bg-purple-600/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-28 -left-10 w-[360px] h-[360px] rounded-full bg-orange-600/10 blur-3xl pointer-events-none" />

        <div className="relative grid grid-cols-12 gap-6 p-7">
          {/* Left: next service + go live */}
          <div className="col-span-7 flex flex-col">
            <span className="text-[10px] uppercase tracking-[0.22em] text-purple-300/70 font-semibold">
              {upcomingService ? 'Next service' : 'No service scheduled'}
            </span>

            {upcomingService && serviceDate ? (
              <>
                <h2 className="text-3xl font-bold text-white tracking-tight mt-2">{upcomingService.title}</h2>
                <div className="flex items-center gap-4 mt-3 text-sm text-white/55">
                  {upcomingService.speakerName && (
                    <span className="flex items-center gap-1.5"><Mic2 size={13} className="text-white/35" />{upcomingService.speakerName}</span>
                  )}
                  <span className="flex items-center gap-1.5"><Calendar size={13} className="text-white/35" />
                    {serviceDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </span>
                  <span className="flex items-center gap-1.5"><Clock size={13} className="text-white/35" />
                    {serviceDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
                <div className="inline-flex items-center gap-2 mt-4 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] w-fit">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 live-dot" />
                  <span className="text-sm font-semibold text-white/80">{fmtCountdown(serviceDate.getTime(), now)}</span>
                </div>
              </>
            ) : (
              <h2 className="text-2xl font-bold text-white/85 tracking-tight mt-2">Ready when you are</h2>
            )}

            <div className="flex-1" />

            <div className="flex items-center gap-3 mt-7">
              <motion.button
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/production')}
                className="flex items-center gap-2.5 px-6 py-3 rounded-xl text-base font-bold text-white bg-purple-600 hover:bg-purple-500 shadow-xl shadow-purple-900/40 transition-colors"
              >
                <Video size={17} /> Open Production Desk
              </motion.button>
              <p className="text-[12px] text-white/35 max-w-[230px] leading-relaxed">
                Switch sources, run the AI Copilot, and go live from the broadcast control room.
              </p>
            </div>
          </div>

          {/* Right: pre-flight readiness */}
          <div className="col-span-5">
            <div className="rounded-xl bg-black/25 border border-white/[0.06] p-4 h-full">
              <div className="flex items-center gap-1.5 mb-3">
                <CheckCircle2 size={13} className="text-emerald-400/80" />
                <span className="text-[10px] uppercase tracking-[0.18em] text-white/45 font-semibold">Pre-flight check</span>
              </div>
              <div className="space-y-1.5">
                {readiness.map(({ icon: Icon, label, detail, ok }) => (
                  <div key={label} className="flex items-center gap-3 py-1.5">
                    <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                      ok ? 'bg-emerald-500/12 text-emerald-400' : 'bg-white/[0.04] text-white/30')}>
                      <Icon size={13} />
                    </div>
                    <span className="text-[13px] text-white/70 flex-1">{label}</span>
                    <span className="text-[11px] text-white/40">{detail}</span>
                    <span className={cn('w-1.5 h-1.5 rounded-full', ok ? 'bg-emerald-400' : 'bg-white/20')} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Destinations */}
      <motion.div variants={fadeUp} className="grid grid-cols-12 gap-4">
        <div className="col-span-12"><DestinationsCard totalViewers={0} /></div>
      </motion.div>

      {/* Quick launch */}
      <QuickLaunch />
    </>
  )
}

// ── Small stat tile ──────────────────────────────────────────────────────────

const TONES: Record<string, string> = {
  emerald: 'text-emerald-400 bg-emerald-500/12',
  red:     'text-red-400 bg-red-500/12',
  purple:  'text-purple-400 bg-purple-500/12',
  blue:    'text-blue-400 bg-blue-500/12',
}

function Stat({ icon: Icon, tone, label, value, mono }: {
  icon: typeof Eye; tone: keyof typeof TONES | string; label: string; value: string; mono?: boolean
}) {
  return (
    <div className="card-premium px-4 py-3 flex items-center gap-3">
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', TONES[tone])}>
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-white/35">{label}</div>
        <div className={cn('text-lg font-bold text-white/90 leading-tight', mono && 'font-mono tabular-nums')}>{value}</div>
      </div>
    </div>
  )
}

// ── Program bus card (Preview → Program with TAKE) ─────────────────────────────

function ProgramBusCard() {
  const navigate = useNavigate()
  const preview = useServiceStore(s => s.preview)
  const program = useServiceStore(s => s.program)
  const take    = useServiceStore(s => s.take)
  const clearProgram = useServiceStore(s => s.clearProgram)

  return (
    <div className="card-premium p-4 h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="live-dot w-1.5 h-1.5 rounded-full bg-red-500" />
          <h3 className="text-sm font-semibold text-white/85">Live Output</h3>
        </div>
        <button
          onClick={() => navigate('/production')}
          className="flex items-center gap-1 text-[11px] text-white/35 hover:text-white/70 transition-colors"
        >
          Open Production <ChevronRight size={12} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 items-center">
        <div className="rounded-xl overflow-hidden border border-emerald-500/25">
          <LiveMonitor item={preview} variant="preview" label="Preview" />
        </div>
        <div className="rounded-xl overflow-hidden border border-red-500/30">
          <LiveMonitor item={program} variant="program" label="Program" />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <motion.button
          whileTap={{ scale: 0.96 }}
          disabled={!preview}
          onClick={take}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all',
            preview
              ? 'bg-red-600 text-white hover:bg-red-500 shadow-lg shadow-red-900/40'
              : 'bg-white/[0.04] text-white/20 cursor-not-allowed',
          )}
        >
          <ArrowRight size={15} /> Take to Program
        </motion.button>
        <button
          onClick={clearProgram}
          disabled={!program}
          className={cn(
            'px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors',
            program ? 'bg-white/[0.06] text-white/60 hover:bg-white/[0.1]' : 'bg-white/[0.02] text-white/20 cursor-not-allowed',
          )}
        >
          Clear
        </button>
      </div>
    </div>
  )
}

// ── Destinations card ──────────────────────────────────────────────────────────

function DestinationsCard({ totalViewers }: { totalViewers: number }) {
  const destinations = useAppStore(s => s.destinations)
  const serviceActive = useServiceStore(s => s.serviceActive)

  return (
    <div className="card-premium p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white/85">Destinations</h3>
        <div className="flex items-center gap-1 text-[11px] text-white/40">
          <Eye size={11} />
          <span className="font-mono tabular-nums">{totalViewers.toLocaleString()}</span>
        </div>
      </div>

      <div className="flex-1 space-y-2">
        {destinations.map(d => {
          const isLive = serviceActive && d.enabled && d.status === 'live'
          return (
            <div key={d.id} className={cn(
              'flex items-center gap-2.5 py-2 px-2.5 rounded-lg border transition-all',
              !d.enabled ? 'opacity-40 border-white/[0.04]'
                : isLive ? 'border-emerald-500/25 bg-emerald-600/[0.06]' : 'border-white/[0.06] bg-white/[0.02]',
            )}>
              <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', isLive ? 'bg-emerald-400 live-dot' : d.enabled ? 'bg-white/25' : 'bg-white/10')} />
              <span className="text-[13px] text-white/65 flex-1 truncate">{d.name}</span>
              {isLive ? (
                <span className="text-[11px] text-white/80 font-mono tabular-nums">{d.viewers.toLocaleString()}</span>
              ) : (
                <span className="text-[10px] text-white/25">{d.enabled ? 'Ready' : 'Off'}</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Quick launch ──────────────────────────────────────────────────────────────

function QuickLaunch() {
  const navigate = useNavigate()
  const items = [
    { icon: MonitorPlay, label: 'Presentation', hint: 'Slides & lyrics',  color: 'purple',  path: '/presentation' },
    { icon: Video,       label: 'Production',   hint: 'Switcher & sources', color: 'orange', path: '/production' },
    { icon: BookOpen,    label: 'Bible',        hint: 'Verses & lower-thirds', color: 'teal', path: '/bible' },
    { icon: Radio,       label: 'Webinar',      hint: 'Hybrid events',     color: 'blue',    path: '/webinar' },
    { icon: Sparkles,    label: 'AI Studio',    hint: 'Sermon to content', color: 'emerald', path: '/ai-studio' },
    { icon: Users,       label: 'Engagement',   hint: 'Quiz, polls, Q&A',  color: 'rose',    path: '/engagement' },
  ]
  return (
    <motion.div variants={fadeUp} className="grid grid-cols-3 lg:grid-cols-6 gap-3">
      {items.map(({ icon: Icon, label, hint, color, path }) => (
        <motion.button
          key={path}
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate(path)}
          className="card-premium p-4 text-left group hover:border-white/15 transition-all flex flex-col gap-3"
        >
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center transition-all', {
            purple:  'bg-purple-500/15 group-hover:bg-purple-500/25',
            orange:  'bg-orange-500/15 group-hover:bg-orange-500/25',
            blue:    'bg-blue-500/15 group-hover:bg-blue-500/25',
            teal:    'bg-teal-500/15 group-hover:bg-teal-500/25',
            emerald: 'bg-emerald-500/15 group-hover:bg-emerald-500/25',
            rose:    'bg-rose-500/15 group-hover:bg-rose-500/25',
          }[color])}>
            <Icon size={18} className={cn({
              purple:  'text-purple-400', orange:  'text-orange-400', blue: 'text-blue-400',
              teal:    'text-teal-400',   emerald: 'text-emerald-400', rose: 'text-rose-400',
            }[color])} />
          </div>
          <div>
            <div className="text-sm font-semibold text-white/85">{label}</div>
            <div className="text-[11px] text-white/35 mt-0.5">{hint}</div>
          </div>
        </motion.button>
      ))}
    </motion.div>
  )
}
