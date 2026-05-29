import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  MonitorPlay, Video, Sparkles, Radio, BookOpen, Users,
  Clock, ChevronRight, Globe, Eye, Calendar,
  Wifi, WifiOff, CheckCircle2, Play, Square, ArrowRight,
  ListChecks, SlidersHorizontal,
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
const stagger = { animate: { transition: { staggerChildren: 0.05 } } }

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function fmtClock(s: number) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { church, userDisplayName, connectionStatus, destinations } = useAppStore()

  const serviceActive    = useServiceStore(s => s.serviceActive)
  const serviceTitle     = useServiceStore(s => s.serviceTitle)
  const serviceStartedAt = useServiceStore(s => s.serviceStartedAt)
  const proMode          = useServiceStore(s => s.proMode)
  const startService     = useServiceStore(s => s.startService)
  const stopService      = useServiceStore(s => s.stopService)
  const setProMode       = useServiceStore(s => s.setProMode)

  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  // Service drives the stream: starting a service goes live, ending resets it.
  const handleStart = () => {
    startService()
    useAppStore.getState().setIsStreaming(true)
  }
  const handleStop = () => {
    stopService()
    useAppStore.getState().resetStream()
  }

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
  const totalViewers = serviceActive
    ? destinations.filter(d => d.status === 'live').reduce((s, d) => s + d.viewers, 0)
    : 0

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden bg-broadcast">
      <motion.div
        variants={stagger}
        initial="initial"
        animate="animate"
        className="p-6 space-y-5 max-w-[1600px] mx-auto"
      >
        {/* ── Header ───────────────────────────────────────────────────────── */}
        <motion.div variants={fadeUp} className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-purple-500 to-orange-500 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-black text-white">{church.name.charAt(0)}</span>
              </div>
              <span className="text-[11px] text-white/40 font-medium">{church.name}</span>
              <span className="text-[11px] text-white/20">·</span>
              <span className="text-[11px] text-white/30 capitalize">{church.role.replace('_', ' ').toLowerCase()}</span>
            </div>
            <h1 className="text-2xl font-bold text-white/90 tracking-tight">
              {serviceActive ? serviceTitle : `${getGreeting()}, ${userDisplayName.split(' ')[0]}`}
            </h1>
            <p className="text-sm text-white/40 mt-0.5">
              {new Date(now).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              {' · '}
              {new Date(now).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Pro / Auto mode switch */}
            <button
              onClick={() => setProMode(!proMode)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium border transition-colors',
                proMode
                  ? 'bg-orange-500/10 border-orange-500/25 text-orange-400'
                  : 'bg-white/[0.04] border-white/10 text-white/40 hover:text-white/60',
              )}
            >
              <SlidersHorizontal size={10} />
              {proMode ? 'Pro Control' : 'Auto-Pilot'}
            </button>

            <div className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium border',
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
                <span className="text-sm text-red-400/70 font-mono">{fmtClock(elapsed)}</span>
              </motion.div>
            )}

            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={serviceActive ? handleStop : handleStart}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
                serviceActive
                  ? 'bg-red-600/15 text-red-400 border border-red-500/30 hover:bg-red-600/25'
                  : 'bg-red-600 text-white hover:bg-red-500 shadow-lg shadow-red-900/30',
              )}
            >
              {serviceActive ? <><Square size={13} /> End Service</> : <><Play size={13} /> Go Live</>}
            </motion.button>
          </div>
        </motion.div>

        {/* ── Live control room (centerpiece) ─────────────────────────────── */}
        <motion.div variants={fadeUp} className="grid grid-cols-12 gap-4">
          {/* Preview → Program */}
          <div className="col-span-8">
            <ProgramBusCard />
          </div>
          {/* AI Copilot */}
          <div className="col-span-4">
            <div className="card-premium overflow-hidden h-full min-h-[440px] flex flex-col bg-chrome">
              <CopilotFeed />
            </div>
          </div>
        </motion.div>

        {/* ── Service ops row ─────────────────────────────────────────────── */}
        <motion.div variants={fadeUp} className="grid grid-cols-12 gap-4">
          <div className="col-span-4"><RunsheetCard /></div>
          <div className="col-span-4"><DestinationsCard totalViewers={totalViewers} /></div>
          <div className="col-span-4"><NextServiceCard /></div>
        </motion.div>

        {/* ── Quick launch ────────────────────────────────────────────────── */}
        <motion.div variants={fadeUp} className="grid grid-cols-6 gap-3">
          {[
            { icon: MonitorPlay, label: 'Presentation', color: 'purple',  path: '/presentation' },
            { icon: Video,       label: 'Production',   color: 'orange',  path: '/production'  },
            { icon: BookOpen,    label: 'Bible',        color: 'teal',    path: '/bible'       },
            { icon: Radio,       label: 'Webinar',      color: 'blue',    path: '/webinar'     },
            { icon: Sparkles,    label: 'AI Studio',    color: 'emerald', path: '/ai-studio'   },
            { icon: Users,       label: 'Engagement',   color: 'rose',    path: '/engagement'  },
          ].map(({ icon: Icon, label, color, path }) => (
            <motion.button
              key={path}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate(path)}
              className="card-premium p-3.5 text-left group hover:border-white/15 transition-all flex items-center gap-3"
            >
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0', {
                purple:  'bg-purple-500/15 group-hover:bg-purple-500/25',
                orange:  'bg-orange-500/15 group-hover:bg-orange-500/25',
                blue:    'bg-blue-500/15 group-hover:bg-blue-500/25',
                teal:    'bg-teal-500/15 group-hover:bg-teal-500/25',
                emerald: 'bg-emerald-500/15 group-hover:bg-emerald-500/25',
                rose:    'bg-rose-500/15 group-hover:bg-rose-500/25',
              }[color])}>
                <Icon size={16} className={cn({
                  purple:  'text-purple-400', orange:  'text-orange-400', blue: 'text-blue-400',
                  teal:    'text-teal-400',   emerald: 'text-emerald-400', rose: 'text-rose-400',
                }[color])} />
              </div>
              <span className="text-sm font-semibold text-white/80">{label}</span>
            </motion.button>
          ))}
        </motion.div>
      </motion.div>
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
  const serviceActive = useServiceStore(s => s.serviceActive)

  return (
    <div className="card-premium p-4 h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white/80">Live Output</h3>
        <button
          onClick={() => navigate('/production')}
          className="flex items-center gap-1 text-[11px] text-white/35 hover:text-white/70 transition-colors"
        >
          Open Production <ChevronRight size={12} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 items-center">
        {/* Preview */}
        <div className="rounded-xl overflow-hidden border border-emerald-500/25">
          <LiveMonitor item={preview} variant="preview" label="Preview" />
        </div>
        {/* Program */}
        <div className="rounded-xl overflow-hidden border border-red-500/30">
          <LiveMonitor item={program} variant="program" label="Program" />
        </div>
      </div>

      {/* TAKE bar */}
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

      {!serviceActive && (
        <p className="mt-2.5 text-[11px] text-white/25 text-center">
          Click <span className="text-red-400/70 font-semibold">Go Live</span> — the AI Copilot starts listening and auto-queues scripture & songs to Preview.
        </p>
      )}
    </div>
  )
}

// ── Runsheet card ──────────────────────────────────────────────────────────────

function RunsheetCard() {
  const segments = useServiceStore(s => s.segments)
  const activeSegmentId = useServiceStore(s => s.activeSegmentId)
  const toggleSegment   = useServiceStore(s => s.toggleSegment)
  const setActiveSegment = useServiceStore(s => s.setActiveSegment)

  const done = segments.filter(s => s.done).length

  return (
    <div className="card-premium p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white/80">Service Runsheet</h3>
        <div className="flex items-center gap-1.5 text-[10px] text-white/35">
          <ListChecks size={13} />
          {done}/{segments.length}
        </div>
      </div>

      <div className="flex-1 space-y-1">
        {segments.map(seg => (
          <button
            key={seg.id}
            onClick={() => setActiveSegment(seg.id)}
            className={cn(
              'w-full flex items-center gap-2.5 py-1.5 px-2 rounded-lg text-left transition-colors',
              activeSegmentId === seg.id ? 'bg-purple-600/15 border border-purple-500/25' : 'hover:bg-white/[0.03] border border-transparent',
            )}
          >
            <span
              onClick={(e) => { e.stopPropagation(); toggleSegment(seg.id) }}
              className={cn(
                'w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors',
                seg.done ? 'bg-emerald-500/80 border-emerald-400' : 'border-white/20 hover:border-white/40',
              )}
            >
              {seg.done && <CheckCircle2 size={11} className="text-white" />}
            </span>
            <span className={cn('text-xs flex-1', seg.done ? 'text-white/35 line-through' : 'text-white/70')}>
              {seg.label}
            </span>
            {activeSegmentId === seg.id && (
              <span className="text-[9px] text-purple-400 font-semibold uppercase">Now</span>
            )}
          </button>
        ))}
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
        <h3 className="text-sm font-semibold text-white/80">Destinations</h3>
        <div className="flex items-center gap-1 text-[11px] text-white/40">
          <Eye size={11} />
          <span className="font-mono">{totalViewers.toLocaleString()}</span>
        </div>
      </div>

      <div className="flex-1 space-y-2">
        {destinations.map(d => {
          const isLive = serviceActive && d.enabled && d.status === 'live'
          return (
            <div key={d.id} className={cn(
              'flex items-center gap-2.5 py-1.5 px-2.5 rounded-lg border transition-all',
              !d.enabled ? 'opacity-40 border-white/[0.04]'
                : isLive ? 'border-emerald-500/25 bg-emerald-600/[0.06]' : 'border-white/[0.06] bg-white/[0.02]',
            )}>
              <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', isLive ? 'bg-emerald-400 live-dot' : d.enabled ? 'bg-white/20' : 'bg-white/10')} />
              <span className="text-xs text-white/65 flex-1 truncate">{d.name}</span>
              {isLive ? (
                <span className="text-[11px] text-white/80 font-mono">{d.viewers.toLocaleString()}</span>
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

// ── Next service card ────────────────────────────────────────────────────────

function NextServiceCard() {
  const navigate = useNavigate()
  const { upcomingService } = useAppStore()
  const serviceDate = upcomingService ? new Date(upcomingService.date) : null

  return (
    <div className="card-premium p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white/80">Next Service</h3>
        <Calendar size={14} className="text-white/25" />
      </div>

      {upcomingService && serviceDate ? (
        <div className="glass rounded-xl p-3.5 border border-purple-500/15">
          <div className="text-sm font-semibold text-white/85 mb-0.5">{upcomingService.title}</div>
          {upcomingService.speakerName && (
            <div className="text-[11px] text-white/40 mb-2">{upcomingService.speakerName}</div>
          )}
          <div className="flex items-center gap-3 text-[11px] text-white/40">
            <span className="flex items-center gap-1"><Calendar size={10} />
              {serviceDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
            <span className="flex items-center gap-1"><Clock size={10} />
              {serviceDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </span>
          </div>
        </div>
      ) : (
        <div className="text-xs text-white/30">No upcoming service scheduled.</div>
      )}

      <div className="flex-1" />
      <button
        onClick={() => navigate('/bible')}
        className="mt-2 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-colors"
      >
        <Globe size={12} /> Bible Engine · 20 languages
      </button>
    </div>
  )
}
