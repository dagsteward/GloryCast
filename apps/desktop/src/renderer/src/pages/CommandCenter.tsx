import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Camera, Monitor, Radio, Users, Presentation, Film, Globe,
  Circle, Play, Send, Cast, AlertTriangle, Brain, Check,
} from 'lucide-react'
import { useMediaEngine, getStream, type MediaSourceMeta } from '../hooks/useMediaEngine'
import { useServiceStore } from '../stores/serviceStore'
import { AsrEngineBadge } from '../components/ai/AsrEngineBadge'
import { useAppStore } from '../stores/appStore'
import { useEngineStore } from '../stores/engineStore'
import { cn } from '../lib/utils'

// ═════════════════════════════════════════════════════════════════════════════
// Command Center — operations view for large events.
//
// Where Cinematic asks "what is on air right now", this asks "is the whole
// operation healthy": every source at a glance, engagement trends, AI
// monitoring, and every destination's state in one table.
//
// Metrics read zero (not plausible-looking invented figures) until a stream is
// actually running — an operations screen that lies is worse than no screen.
// ═════════════════════════════════════════════════════════════════════════════

export function CommandCenterPage() {
  const sources = useMediaEngine(s => s.sources)

  useEffect(() => {
    useMediaEngine.getState().enumerateDevices()
  }, [])

  return (
    <div className="w-full h-full overflow-y-auto p-3">
      <div className="grid gap-3 grid-cols-1 2xl:grid-cols-[210px_minmax(0,1fr)_330px]">
        <SourcesRail sources={sources} />

        <div className="space-y-3 min-w-0">
          <SourceGrid sources={sources} />
          <ProgramOutputBar />
          <StreamDestinations />
        </div>

        <div className="space-y-3">
          <EngagementPanel />
          <AiMonitorPanel />
          <AlertsPanel />
        </div>
      </div>
    </div>
  )
}

// ── Shared card ─────────────────────────────────────────────────────────────

function Panel({
  title, action, children, className,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn('rounded-xl bg-chrome border border-white/[0.06] overflow-hidden', className)}>
      <header className="flex items-center justify-between h-8 px-3 border-b border-white/[0.05]">
        <h3 className="text-[9.5px] font-bold tracking-[0.14em] text-white/40">{title}</h3>
        {action}
      </header>
      {children}
    </section>
  )
}

// ── Sources rail ────────────────────────────────────────────────────────────

const SOURCE_ICONS: Record<string, typeof Camera> = {
  camera: Camera, screen: Monitor, media: Film, ndi: Radio,
  network: Globe, image: Presentation, pattern: Monitor,
  color: Monitor, timer: Monitor, clock: Monitor,
}

function SourcesRail({ sources }: { sources: MediaSourceMeta[] }) {
  return (
    <Panel title="SOURCES" className="self-start">
      <div className="p-1.5 space-y-0.5 max-h-[420px] overflow-y-auto">
        {sources.map((source) => {
          const Icon = SOURCE_ICONS[source.type] ?? Camera
          return (
            <div
              key={source.id}
              className="flex items-center gap-2 h-8 px-2 rounded-lg hover:bg-white/[0.04] transition-colors"
            >
              <Icon size={12} className="text-teal-400/70 shrink-0" />
              <span className="flex-1 truncate text-[11.5px] text-white/70">{source.label}</span>
              <span className={cn(
                'w-1.5 h-1.5 rounded-full shrink-0',
                source.active ? 'bg-emerald-500' : 'bg-white/15',
              )} />
            </div>
          )
        })}

        {sources.length === 0 && (
          <p className="px-2 py-6 text-[11px] text-white/30 text-center leading-relaxed">
            No sources yet. Add cameras and network feeds to begin.
          </p>
        )}
      </div>
    </Panel>
  )
}

// ── Multi-source grid ───────────────────────────────────────────────────────

function SourceGrid({ sources }: { sources: MediaSourceMeta[] }) {
  const shown = sources.slice(0, 6)

  return (
    <Panel title={`SOURCE MONITOR (${sources.length})`}>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 p-2">
        {shown.map((source) => (
          <SourceTile key={source.id} source={source} />
        ))}

        {shown.length === 0 && (
          <div className="col-span-full py-12 text-center text-[11.5px] text-white/30">
            No sources to monitor.
          </div>
        )}
      </div>
    </Panel>
  )
}

function SourceTile({ source }: { source: MediaSourceMeta }) {
  const ref = useRef<HTMLVideoElement>(null)
  const stream = getStream(source.id)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (stream && el.srcObject !== stream) {
      el.srcObject = stream
      el.play().catch(() => { /* autoplay can be refused; poster state covers it */ })
    } else if (!stream) {
      el.srcObject = null
    }
  }, [stream])

  return (
    <div className="relative rounded-lg overflow-hidden bg-black aspect-video border border-white/[0.06]">
      {stream ? (
        <video ref={ref} muted playsInline autoPlay className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-slate-800 via-slate-900 to-black flex items-center justify-center">
          <span className="text-[10px] text-white/25">offline</span>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 px-1.5 py-1 bg-gradient-to-t from-black/85 to-transparent">
        <span className="text-[10px] font-medium text-white/85 truncate block">{source.label}</span>
      </div>

      {source.active && (
        <span className="absolute top-1.5 right-1.5 px-1 py-px rounded text-[8px] font-bold tracking-wider bg-red-600 text-white">
          LIVE
        </span>
      )}
    </div>
  )
}

// ── Program output transport ────────────────────────────────────────────────

function ProgramOutputBar() {
  const isStreaming = useAppStore(s => s.isStreaming)
  const fps         = useEngineStore(s => s.fps)

  return (
    <Panel
      title="PROGRAM OUTPUT"
      action={
        <span className="text-[10px] text-white/35 tabular-nums">
          {fps === null ? 'engine idle' : `${fps} fps`}
        </span>
      }
    >
      <div className="flex flex-wrap items-center gap-2 p-2.5">
        <TransportPill
          icon={<Circle size={11} className={isStreaming ? 'fill-current' : ''} />}
          label={isStreaming ? 'LIVE' : 'GO LIVE'}
          tone={isStreaming ? 'live' : 'idle'}
        />
        <TransportPill icon={<Circle size={11} />} label="REC" tone="idle" />
        <TransportPill icon={<Play size={11} />} label="REPLAY" tone="idle" />
        <TransportPill icon={<Send size={11} />} label="STREAM" tone="idle" />
        <TransportPill icon={<Cast size={11} />} label="NDI OUT" tone="idle" />
      </div>
    </Panel>
  )
}

function TransportPill({
  icon, label, tone,
}: {
  icon: React.ReactNode
  label: string
  tone: 'live' | 'idle'
}) {
  return (
    <button className={cn(
      'flex items-center gap-1.5 h-8 px-3.5 rounded-lg text-[11px] font-bold tracking-wider transition-colors',
      tone === 'live'
        ? 'bg-red-600 text-white hover:bg-red-500'
        : 'bg-white/[0.05] text-white/60 border border-white/[0.08] hover:bg-white/[0.09] hover:text-white/90',
    )}>
      {icon}
      {label}
    </button>
  )
}

// ── Stream destinations ─────────────────────────────────────────────────────

function StreamDestinations() {
  const destinations = useAppStore(s => s.destinations)

  return (
    <Panel title="STREAM DESTINATIONS">
      <div className="divide-y divide-white/[0.04]">
        {destinations.map((d) => (
          <div key={d.id} className="flex items-center gap-3 h-9 px-3">
            <span className={cn(
              'w-1.5 h-1.5 rounded-full shrink-0',
              d.status === 'live' ? 'bg-emerald-500'
                : d.status === 'error' ? 'bg-red-500' : 'bg-white/20',
            )} />
            <span className="flex-1 truncate text-[11.5px] text-white/75">{d.name}</span>
            <span className="text-[10.5px] tabular-nums text-white/40">
              {d.status === 'live' ? `${d.bitrate} kbps` : '—'}
            </span>
            <span className={cn(
              'text-[10px] font-semibold w-14 text-right',
              d.status === 'live' ? 'text-emerald-400'
                : d.status === 'error' ? 'text-red-400' : 'text-white/30',
            )}>
              {d.status === 'live' ? 'Live' : d.status === 'error' ? 'Error' : 'Idle'}
            </span>
          </div>
        ))}

        {destinations.length === 0 && (
          <p className="px-3 py-6 text-[11px] text-white/30 text-center">
            No destinations configured. Add them in Settings → Streaming.
          </p>
        )}
      </div>
    </Panel>
  )
}

// ── Engagement ──────────────────────────────────────────────────────────────

function EngagementPanel() {
  const isStreaming = useAppStore(s => s.isStreaming)
  const viewerCount = useAppStore(s => s.viewerCount)

  // Engagement figures come from the backend Quiz/Poll/QA modules. Until a
  // service is live there is nothing to report, and we say so rather than
  // filling the tiles with invented momentum.
  const live = isStreaming

  return (
    <Panel title="ENGAGEMENT">
      <div className="grid grid-cols-2 gap-px bg-white/[0.05]">
        <Metric label="Viewers"        value={live ? viewerCount.toLocaleString() : '0'} />
        <Metric label="Live Questions" value={live ? '—' : '0'} />
        <Metric label="Poll Response"  value={live ? '—' : '0%'} />
        <Metric label="Quiz Players"   value={live ? '—' : '0'} />
      </div>

      {!live && (
        <p className="px-3 py-2.5 text-[10.5px] text-white/30 leading-relaxed border-t border-white/[0.05]">
          Engagement tracking starts when the service goes live.
        </p>
      )}
    </Panel>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-chrome px-3 py-2.5">
      <div className="text-[17px] font-bold tabular-nums text-white/90 leading-none">{value}</div>
      <div className="mt-1 text-[10px] text-white/35">{label}</div>
    </div>
  )
}

// ── AI monitoring ───────────────────────────────────────────────────────────

function AiMonitorPanel() {
  const aiListening  = useServiceStore(s => s.aiListening)
  const detections   = useServiceStore(s => s.detections)
  const cutToProgram = useServiceStore(s => s.cutToProgram)

  const latest = detections.find(d => d.kind === 'scripture')

  return (
    <Panel
      title="AI SCRIPTURE MONITORING"
      action={<AsrEngineBadge size="sm" accent="teal" />}
    >
      <div className="p-3">
        {latest ? (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-[10px] text-white/35">Detected</span>
              <span className="flex items-center gap-1 text-[10px] font-semibold text-teal-400">
                <Brain size={10} />
                {Math.round(latest.confidence * 100)}% confidence
              </span>
            </div>

            <h4 className="text-[17px] font-bold text-white/90 tracking-tight">
              {latest.reference}
            </h4>
            <p className="mt-1 text-[11px] leading-relaxed text-white/45 line-clamp-3">
              {latest.text}
            </p>

            <button
              onClick={() => cutToProgram({
                kind: 'scripture',
                title: latest.reference,
                body: latest.text,
                subtitle: latest.subtitle,
                source: 'ai',
              })}
              className="mt-2.5 w-full h-8 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-[11.5px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Check size={12} strokeWidth={3} />
              Display on Screen
            </button>
          </motion.div>
        ) : (
          <p className="py-4 text-[11px] text-white/30 text-center leading-relaxed">
            {aiListening
              ? 'Monitoring the service audio for scripture…'
              : 'AI monitoring is off.'}
          </p>
        )}
      </div>
    </Panel>
  )
}

// ── Alerts ──────────────────────────────────────────────────────────────────

interface Alert {
  id: string
  severity: 'warn' | 'error' | 'info'
  message: string
}

/**
 * Alerts are derived from state the app can actually observe — dropped frames,
 * failed destinations, a disconnected backend. Nothing is fabricated, so an
 * empty list genuinely means nothing is wrong.
 */
function useDerivedAlerts(): Alert[] {
  const droppedFrames    = useEngineStore(s => s.droppedFrames)
  const destinations     = useAppStore(s => s.destinations)
  const connectionStatus = useAppStore(s => s.connectionStatus)

  const alerts: Alert[] = []

  if (connectionStatus !== 'connected') {
    alerts.push({
      id: 'backend',
      severity: 'warn',
      message: 'Backend disconnected — analytics and engagement are unavailable.',
    })
  }

  for (const d of destinations) {
    if (d.status === 'error') {
      alerts.push({ id: `dest-${d.id}`, severity: 'error', message: `${d.name} failed to connect.` })
    }
  }

  if (droppedFrames > 0) {
    alerts.push({
      id: 'dropped',
      severity: 'warn',
      message: `${droppedFrames} frame${droppedFrames === 1 ? '' : 's'} dropped by the compositor.`,
    })
  }

  return alerts
}

function AlertsPanel() {
  const alerts = useDerivedAlerts()

  return (
    <Panel title={`ALERTS (${alerts.length})`}>
      <div className="divide-y divide-white/[0.04]">
        {alerts.map((a) => (
          <div key={a.id} className="flex items-start gap-2 px-3 py-2">
            <AlertTriangle
              size={12}
              className={cn(
                'mt-px shrink-0',
                a.severity === 'error' ? 'text-red-400' : 'text-amber-400',
              )}
            />
            <span className="text-[11px] leading-relaxed text-white/60">{a.message}</span>
          </div>
        ))}

        {alerts.length === 0 && (
          <p className="px-3 py-5 text-[11px] text-white/30 text-center">
            All systems nominal.
          </p>
        )}
      </div>
    </Panel>
  )
}
