import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  MonitorPlay, Video, Users, Sparkles, Radio, BookOpen,
  TrendingUp, Clock, ChevronRight, Zap, Globe, Activity,
  Play, Eye, Calendar, Mic2, BarChart3, Wifi, WifiOff,
  Circle, CheckCircle2, AlertCircle, Broadcast,
} from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { ScriptureAlertBanner } from '../components/scripture/ScriptureAlertBanner'
import { cn } from '../lib/utils'

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] },
}

const stagger = { animate: { transition: { staggerChildren: 0.05 } } }

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatRelativeDate(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  const now = new Date()
  const diffMs = d.getTime() - now.getTime()
  const diffDays = Math.round(diffMs / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays === -1) return 'Yesterday'
  if (diffDays < 0) return `${Math.abs(diffDays)} days ago`
  if (diffDays < 7) return `In ${diffDays} days`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function DashboardPage() {
  const navigate = useNavigate()
  const {
    isStreaming, viewerCount, currentDetectedScripture,
    streamHealth, church, userDisplayName, connectionStatus,
    upcomingService, lastServiceDate, lastDetectedScriptures,
    destinations,
  } = useAppStore()

  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 10000)
    return () => clearInterval(t)
  }, [])

  const activeDestinations = destinations.filter(d => d.enabled && d.status === 'live')
  const totalViewers = isStreaming
    ? destinations.filter(d => d.status === 'live').reduce((sum, d) => sum + d.viewers, 0)
    : 0

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden">
      <motion.div
        variants={stagger}
        initial="initial"
        animate="animate"
        className="p-6 space-y-5 max-w-[1600px] mx-auto"
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <motion.div variants={fadeUp} className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-purple-500 to-orange-500 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-black text-white">
                  {church.name.charAt(0)}
                </span>
              </div>
              <span className="text-[11px] text-white/40 font-medium">{church.name}</span>
              <span className="text-[11px] text-white/20">·</span>
              <span className="text-[11px] text-white/30 capitalize">{church.role.replace('_', ' ').toLowerCase()}</span>
            </div>
            <h1 className="text-2xl font-bold text-white/90 tracking-tight">
              {getGreeting()}, {userDisplayName.split(' ')[0]}
            </h1>
            <p className="text-sm text-white/40 mt-0.5">
              {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              {' · '}
              {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Connection status */}
            <div className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium border',
              connectionStatus === 'connected'
                ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                : 'bg-white/[0.04] border-white/10 text-white/30',
            )}>
              {connectionStatus === 'connected' ? <Wifi size={10} /> : <WifiOff size={10} />}
              {connectionStatus === 'connected' ? 'Connected' : 'Offline mode'}
            </div>

            {isStreaming && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/15 border border-red-500/30"
              >
                <span className="live-dot w-2 h-2 rounded-full bg-red-400" />
                <span className="text-sm font-semibold text-red-400">LIVE</span>
                {totalViewers > 0 && (
                  <span className="text-sm text-red-400/70 font-mono">
                    {totalViewers.toLocaleString()} viewers
                  </span>
                )}
              </motion.div>
            )}

            <button
              onClick={() => navigate('/production')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
                isStreaming
                  ? 'bg-red-600/15 text-red-400 border border-red-500/30 hover:bg-red-600/25'
                  : 'bg-red-600 text-white hover:bg-red-500 shadow-lg shadow-red-900/30',
              )}
            >
              <Play size={13} />
              {isStreaming ? 'Manage Stream' : 'Go Live'}
            </button>
          </div>
        </motion.div>

        {/* Scripture alert */}
        {currentDetectedScripture && (
          <motion.div variants={fadeUp}>
            <ScriptureAlertBanner scripture={currentDetectedScripture} />
          </motion.div>
        )}

        {/* ── Quick action cards ──────────────────────────────────────────── */}
        <motion.div variants={fadeUp} className="grid grid-cols-6 gap-3">
          {[
            { icon: MonitorPlay, label: 'Presentation', desc: 'Slides & lyrics',   color: 'purple', path: '/presentation' },
            { icon: Video,       label: 'Production',   desc: 'Camera switcher',   color: 'orange', path: '/production'  },
            { icon: Radio,       label: 'Webinar',      desc: 'Hybrid events',     color: 'blue',   path: '/webinar'     },
            { icon: BookOpen,    label: 'Bible Engine', desc: 'Search & display',  color: 'teal',   path: '/bible'       },
            { icon: Sparkles,    label: 'AI Studio',    desc: 'Sermon & content',  color: 'emerald',path: '/ai-studio'   },
            { icon: Users,       label: 'Engagement',   desc: 'Quiz & polls',      color: 'rose',   path: '/engagement'  },
          ].map(({ icon: Icon, label, desc, color, path }) => (
            <motion.button
              key={path}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate(path)}
              className="card-premium p-4 text-left group hover:border-white/15 transition-all"
            >
              <div className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center mb-3 transition-all',
                {
                  purple:  'bg-purple-500/15 group-hover:bg-purple-500/25',
                  orange:  'bg-orange-500/15 group-hover:bg-orange-500/25',
                  blue:    'bg-blue-500/15  group-hover:bg-blue-500/25',
                  teal:    'bg-teal-500/15  group-hover:bg-teal-500/25',
                  emerald: 'bg-emerald-500/15 group-hover:bg-emerald-500/25',
                  rose:    'bg-rose-500/15  group-hover:bg-rose-500/25',
                }[color],
              )}>
                <Icon size={16} className={cn({
                  purple:  'text-purple-400',
                  orange:  'text-orange-400',
                  blue:    'text-blue-400',
                  teal:    'text-teal-400',
                  emerald: 'text-emerald-400',
                  rose:    'text-rose-400',
                }[color])} />
              </div>
              <div className="text-sm font-semibold text-white/80 mb-0.5">{label}</div>
              <div className="text-[11px] text-white/35">{desc}</div>
            </motion.button>
          ))}
        </motion.div>

        {/* ── Main grid ──────────────────────────────────────────────────── */}
        <motion.div variants={fadeUp} className="grid grid-cols-12 gap-4">

          {/* Stream control — 8 cols */}
          <div className="col-span-8">
            <StreamControlCard />
          </div>

          {/* Upcoming service — 4 cols */}
          <div className="col-span-4">
            <UpcomingServiceCard />
          </div>
        </motion.div>

        {/* ── Secondary row ──────────────────────────────────────────────── */}
        <motion.div variants={fadeUp} className="grid grid-cols-12 gap-4">

          {/* Scripture detections — 4 cols */}
          <div className="col-span-4">
            <ScriptureHistoryCard />
          </div>

          {/* Service stats — 4 cols */}
          <div className="col-span-4">
            <ServiceStatsCard />
          </div>

          {/* Bible quick access — 4 cols */}
          <div className="col-span-4">
            <BibleQuickCard />
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}

// ── Stream Control Card ────────────────────────────────────────────────────────

function StreamControlCard() {
  const { isStreaming, setIsStreaming, streamHealth, destinations, setStreamUptime, resetStream } = useAppStore() as any
  const { streamUptime } = useAppStore()
  const [uptime, setUptime] = useState(0)

  useEffect(() => {
    if (!isStreaming) { setUptime(0); return }
    const t = setInterval(() => setUptime(u => u + 1), 1000)
    return () => clearInterval(t)
  }, [isStreaming])

  const fmt = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`
  }

  const { destinations: dests, updateDestination, setViewerCount } = useAppStore()

  // Simulate live data when streaming
  useEffect(() => {
    if (!isStreaming) return
    const t = setInterval(() => {
      dests.filter(d => d.enabled).forEach((d, i) => {
        const baseViewers = [1284, 842, 511][i] ?? 0
        const baseKbps    = [6000, 4500, 3000][i] ?? 3000
        updateDestination(d.id, {
          status:  'live',
          viewers: baseViewers + Math.floor(Math.random() * 30 - 15),
          bitrate: baseKbps  + Math.floor(Math.random() * 200 - 100),
          health:  95 + Math.floor(Math.random() * 5),
        })
      })
    }, 3000)
    return () => clearInterval(t)
  }, [isStreaming])

  const liveTotal = dests.filter(d => d.status === 'live').reduce((s, d) => s + d.viewers, 0)

  return (
    <div className="card-premium p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-white/80">Stream Control</h3>
          {isStreaming && (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/15 border border-red-500/30">
              <span className="live-dot w-1.5 h-1.5 rounded-full bg-red-400" />
              <span className="text-[10px] font-bold text-red-400 font-mono">{fmt(uptime)}</span>
            </div>
          )}
          {isStreaming && (
            <div className="flex items-center gap-1 text-[11px] text-white/40">
              <Eye size={11} />
              <span className="font-mono">{liveTotal.toLocaleString()}</span>
              <span>viewers</span>
            </div>
          )}
        </div>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            if (isStreaming) {
              useAppStore.getState().resetStream()
            } else {
              useAppStore.getState().setIsStreaming(true)
            }
          }}
          className={cn(
            'flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all',
            isStreaming
              ? 'bg-red-600/15 text-red-400 border border-red-500/30 hover:bg-red-600/25'
              : 'bg-red-600 text-white hover:bg-red-500 shadow-lg shadow-red-900/40',
          )}
        >
          {isStreaming
            ? <><span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block" /> Stop Stream</>
            : <><Play size={13} /> Go Live</>}
        </motion.button>
      </div>

      {/* Destinations */}
      <div className="grid grid-cols-4 gap-2.5">
        {dests.map(dest => (
          <DestCard key={dest.id} dest={dest} streaming={isStreaming} />
        ))}
      </div>

      {/* Encoder stats */}
      {isStreaming && streamHealth && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-3 pt-3 border-t border-white/[0.05] flex items-center gap-5 text-[11px] font-mono text-white/40"
        >
          <span><span className="text-white/25">Bitrate </span><span className="text-white/65">{streamHealth.bitrate.toLocaleString()} kbps</span></span>
          <span><span className="text-white/25">FPS </span><span className="text-white/65">{streamHealth.fps}</span></span>
          <span><span className="text-white/25">Dropped </span><span className="text-emerald-400">{streamHealth.droppedFrames}</span></span>
          <span><span className="text-white/25">Encoder </span><span className="text-white/65">H.264</span></span>
          <span><span className="text-white/25">Resolution </span><span className="text-white/65">1920×1080</span></span>
        </motion.div>
      )}

      {!isStreaming && (
        <div className="mt-3 pt-3 border-t border-white/[0.05] flex items-center gap-2 text-[11px] text-white/25">
          <AlertCircle size={12} />
          Stream is offline · Configure destinations in Settings then click Go Live
        </div>
      )}
    </div>
  )
}

function DestCard({ dest, streaming }: { dest: ReturnType<typeof useAppStore>['destinations'][0]; streaming: boolean }) {
  const isLive = streaming && dest.enabled && dest.status === 'live'
  return (
    <div className={cn(
      'rounded-xl border p-3 transition-all',
      !dest.enabled    && 'opacity-40 border-white/[0.04] bg-white/[0.01]',
      dest.enabled && !isLive && 'border-white/[0.07] bg-white/[0.02]',
      isLive && 'border-emerald-500/30 bg-emerald-600/[0.06]',
    )}>
      <div className="flex items-center gap-1.5 mb-2">
        <span className={cn(
          'w-1.5 h-1.5 rounded-full shrink-0',
          isLive ? 'bg-emerald-400 live-dot' : dest.enabled ? 'bg-white/20' : 'bg-white/10',
        )} />
        <span className="text-[10px] text-white/55 font-medium truncate">{dest.name}</span>
      </div>
      {isLive ? (
        <>
          <div className="text-lg font-bold text-white/90 font-mono">{dest.viewers.toLocaleString()}</div>
          <div className="text-[9px] text-white/30 font-mono mt-0.5">{(dest.bitrate / 1000).toFixed(1)} Mbps</div>
          <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${dest.health}%` }} />
          </div>
        </>
      ) : (
        <div className="text-[10px] text-white/20 mt-1">{dest.enabled ? 'Ready' : 'Disabled'}</div>
      )}
    </div>
  )
}

// ── Upcoming Service Card ──────────────────────────────────────────────────────

function UpcomingServiceCard() {
  const { upcomingService, lastServiceDate } = useAppStore()
  const navigate = useNavigate()

  const serviceDate = upcomingService ? new Date(upcomingService.date) : null

  return (
    <div className="card-premium p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white/80">Schedule</h3>
        <Calendar size={14} className="text-white/25" />
      </div>

      {/* Next service */}
      {upcomingService && serviceDate && (
        <div className="glass rounded-xl p-3.5 mb-3 border border-purple-500/15">
          <div className="text-[10px] text-purple-400 font-semibold uppercase tracking-wider mb-2">
            Next Service
          </div>
          <div className="text-sm font-semibold text-white/85 mb-0.5">{upcomingService.title}</div>
          {upcomingService.speakerName && (
            <div className="text-[11px] text-white/40 mb-2">{upcomingService.speakerName}</div>
          )}
          <div className="flex items-center gap-3 text-[11px] text-white/40">
            <span className="flex items-center gap-1">
              <Calendar size={10} />
              {formatRelativeDate(upcomingService.date)}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={10} />
              {serviceDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </span>
          </div>
        </div>
      )}

      {/* Last service */}
      {lastServiceDate && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05] mb-2">
          <CheckCircle2 size={14} className="text-white/25 shrink-0" />
          <div>
            <div className="text-[11px] text-white/55">Last service completed</div>
            <div className="text-[10px] text-white/30">{formatRelativeDate(lastServiceDate)}</div>
          </div>
        </div>
      )}

      <div className="flex-1" />

      <button
        onClick={() => navigate('/production')}
        className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-colors mt-2"
      >
        Open Production
        <ChevronRight size={12} />
      </button>
    </div>
  )
}

// ── Scripture History Card ────────────────────────────────────────────────────

function ScriptureHistoryCard() {
  const { lastDetectedScriptures, isStreaming } = useAppStore()
  const navigate = useNavigate()

  // Demo scriptures for last service (shown when not streaming)
  const fallback = [
    { reference: 'Romans 8:28',       time: '10:47 AM' },
    { reference: 'John 3:16',         time: '10:32 AM' },
    { reference: 'Psalms 23:1',       time: '10:18 AM' },
    { reference: 'Philippians 4:13',  time: '10:05 AM' },
    { reference: 'Hebrews 11:1',      time: '9:52 AM'  },
  ]
  const items = isStreaming
    ? lastDetectedScriptures
    : (lastDetectedScriptures.length > 0 ? lastDetectedScriptures : fallback)

  return (
    <div className="card-premium p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-white/80">Scripture Detections</h3>
          {!isStreaming && (
            <p className="text-[10px] text-white/25 mt-0.5">Last service</p>
          )}
        </div>
        <BookOpen size={14} className="text-white/25" />
      </div>

      <div className="flex-1 space-y-1.5">
        {items.length === 0 ? (
          <div className="text-center py-6 text-white/20">
            <BookOpen size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-xs">No scriptures detected yet</p>
          </div>
        ) : (
          items.slice(0, 6).map((s, i) => (
            <div key={i} className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-white/[0.03] transition-colors cursor-pointer">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-500/60 shrink-0" />
              <span className="text-xs text-white/70 flex-1 font-medium">{s.reference}</span>
              <span className="text-[10px] text-white/25 font-mono">{s.time}</span>
            </div>
          ))
        )}
      </div>

      <button
        onClick={() => navigate('/bible')}
        className="mt-3 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-colors"
      >
        Open Bible Engine
        <ChevronRight size={12} />
      </button>
    </div>
  )
}

// ── Service Stats Card ────────────────────────────────────────────────────────

function ServiceStatsCard() {
  const { isStreaming, destinations } = useAppStore()

  const liveViewers = isStreaming
    ? destinations.filter(d => d.status === 'live').reduce((s, d) => s + d.viewers, 0)
    : 0

  const stats = isStreaming
    ? [
        { label: 'Live Viewers',   value: liveViewers.toLocaleString(), icon: Eye,      color: 'text-red-400',     note: 'Across all platforms' },
        { label: 'Platforms',      value: destinations.filter(d => d.status === 'live').length.toString(), icon: Globe, color: 'text-blue-400', note: 'Active streams' },
        { label: 'Stream Quality', value: '99%',     icon: Activity,  color: 'text-emerald-400', note: 'No dropped frames' },
        { label: 'Avg Bitrate',    value: '5.8 Mbps',icon: Zap,       color: 'text-orange-400',  note: 'Encoder output' },
      ]
    : [
        { label: 'Last Service',   value: '2,637', icon: Eye,      color: 'text-purple-400',  note: 'Total viewers' },
        { label: 'Countries',      value: '14',    icon: Globe,    color: 'text-blue-400',    note: 'Reached worldwide' },
        { label: 'Watch Time',     value: '1h 24m',icon: Clock,    color: 'text-orange-400',  note: 'Average duration' },
        { label: 'Engagement',     value: '78%',   icon: Activity, color: 'text-emerald-400', note: 'Interaction rate' },
      ]

  return (
    <div className="card-premium p-4 h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white/80">
            {isStreaming ? 'Live Stats' : 'Last Service Stats'}
          </h3>
          {!isStreaming && (
            <p className="text-[10px] text-white/25 mt-0.5">Sunday · Last week</p>
          )}
        </div>
        <BarChart3 size={14} className="text-white/25" />
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {stats.map(({ label, value, icon: Icon, color, note }) => (
          <div key={label} className="glass rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-white/35">{label}</span>
              <Icon size={12} className={color} />
            </div>
            <div className="text-xl font-bold text-white/90">{value}</div>
            <div className="text-[9px] text-white/25 mt-0.5">{note}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Bible Quick Card ──────────────────────────────────────────────────────────

const VERSE_OF_DAY = {
  reference: 'Philippians 4:13',
  text: '"I can do all things through Christ who strengthens me."',
  translation: 'NKJV',
}

function BibleQuickCard() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  return (
    <div className="card-premium p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white/80">Bible</h3>
        <BookOpen size={14} className="text-white/25" />
      </div>

      {/* Verse of the day */}
      <div className="glass rounded-xl p-3 mb-3 border border-purple-500/10">
        <div className="text-[10px] text-purple-400 font-semibold uppercase tracking-wider mb-1.5">
          Verse of the Day
        </div>
        <p className="text-xs text-white/65 leading-relaxed italic">{VERSE_OF_DAY.text}</p>
        <div className="text-[10px] text-white/30 mt-1.5">
          {VERSE_OF_DAY.reference} · {VERSE_OF_DAY.translation}
        </div>
      </div>

      {/* Search */}
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && navigate('/bible')}
        type="text"
        placeholder="Search scripture…"
        className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.07] text-xs text-white/80 placeholder:text-white/20 outline-none focus:border-purple-500/40 transition-colors"
      />

      <div className="flex-1" />

      <button
        onClick={() => navigate('/bible')}
        className="mt-3 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-colors"
      >
        Open Bible Engine
        <ChevronRight size={12} />
      </button>
    </div>
  )
}
