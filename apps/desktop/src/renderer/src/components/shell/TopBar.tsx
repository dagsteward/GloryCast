import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Menu, Cpu, Gauge, Wifi, WifiOff, Bell, MessageSquare,
  HelpCircle, ChevronDown,
} from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import { useEngineStore } from '../../stores/engineStore'
import { useSystemStats } from '../../hooks/useSystemStats'
import { cn } from '../../lib/utils'

/** Elapsed live time, counted from the moment streaming actually started. */
function useLiveClock(isStreaming: boolean): string {
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [, forceTick] = useState(0)

  useEffect(() => {
    if (!isStreaming) {
      setStartedAt(null)
      return
    }
    setStartedAt(Date.now())
    const interval = setInterval(() => forceTick(t => t + 1), 1000)
    return () => clearInterval(interval)
  }, [isStreaming])

  if (!isStreaming || startedAt === null) return '00:00:00'

  const total = Math.floor((Date.now() - startedAt) / 1000)
  const h = String(Math.floor(total / 3600)).padStart(2, '0')
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0')
  const s = String(total % 60).padStart(2, '0')
  return `${h}:${m}:${s}`
}

export function TopBar() {
  const isStreaming      = useAppStore(s => s.isStreaming)
  const connectionStatus = useAppStore(s => s.connectionStatus)
  const church           = useAppStore(s => s.church)
  const userDisplayName  = useAppStore(s => s.userDisplayName)
  const toggleAiPanel    = useAppStore(s => s.toggleAiPanel)

  const fps = useEngineStore(s => s.fps)
  const { cpu, available } = useSystemStats()
  const clock = useLiveClock(isStreaming)

  const online = connectionStatus === 'connected'

  return (
    <header className="drag-region flex items-center gap-3 h-[58px] px-4 bg-chrome border-b border-white/[0.06] shrink-0">

      <button
        onClick={toggleAiPanel}
        className="no-drag w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors"
        title="Toggle panels"
      >
        <Menu size={17} />
      </button>

      {/* ── Centre cluster: live state and engine vitals ─────────────────── */}
      <div className="flex-1 flex items-center justify-center gap-5">

        <motion.div
          animate={isStreaming ? { opacity: [1, 0.82, 1] } : { opacity: 1 }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          className={cn(
            'no-drag flex items-center gap-2 h-[26px] px-3 rounded-full border',
            isStreaming
              ? 'bg-red-500/12 border-red-500/35'
              : 'bg-white/[0.03] border-white/[0.08]',
          )}
        >
          <span className={cn(
            'w-[7px] h-[7px] rounded-full',
            isStreaming ? 'bg-red-500 shadow-[0_0_8px_2px_rgba(239,68,68,0.6)]' : 'bg-white/20',
          )} />
          <span className={cn(
            'text-[10.5px] font-bold tracking-[0.1em]',
            isStreaming ? 'text-red-400' : 'text-white/35',
          )}>
            {isStreaming ? 'LIVE' : 'OFF AIR'}
          </span>
          <span className="text-[11.5px] font-mono tabular-nums text-white/75">{clock}</span>
        </motion.div>

        {/* Sub-10% CPU keeps a decimal so a light-but-real load reads as
            "2.4%" instead of an alarming-looking flat "0%". */}
        <Vital
          icon={<Cpu size={12} />}
          label="CPU"
          value={available ? `${cpu < 10 ? cpu.toFixed(1) : Math.round(cpu)}%` : '—'}
          tone={cpu > 85 ? 'danger' : cpu > 65 ? 'warn' : 'normal'}
        />

        <Vital
          icon={<Gauge size={12} />}
          label="FPS"
          value={fps === null ? '—' : String(fps)}
          tone="normal"
        />

        {/* "Excellent" implied a measured link quality that was never sampled —
            we only know whether an interface exists. */}
        <Vital
          icon={online ? <Wifi size={12} /> : <WifiOff size={12} />}
          label="Internet"
          value={online ? 'Online' : 'Offline'}
          tone={online ? 'good' : 'danger'}
        />
      </div>

      {/* ── Right cluster: alerts and identity ──────────────────────────── */}
      <div className="no-drag flex items-center gap-1">
        <IconButton icon={<Bell size={16} />} label="Notifications" />
        <IconButton icon={<MessageSquare size={16} />} label="Messages" />
        <IconButton icon={<HelpCircle size={16} />} label="Help" />

        <div className="w-px h-6 bg-white/[0.08] mx-2" />

        <button className="flex items-center gap-2.5 pl-1 pr-2 h-9 rounded-lg hover:bg-white/[0.05] transition-colors">
          <div className="w-[30px] h-[30px] rounded-full bg-gradient-to-br from-[#a855f7] to-[#f97316] flex items-center justify-center text-[11px] font-bold text-white shrink-0">
            {userDisplayName.charAt(0).toUpperCase()}
          </div>
          <div className="text-left leading-tight hidden lg:block">
            <div className="text-[11.5px] font-semibold text-white/90">{userDisplayName}</div>
            <div className="text-[9.5px] text-white/40">{church.role}</div>
          </div>
          <ChevronDown size={13} className="text-white/35" />
        </button>
      </div>
    </header>
  )
}

function Vital({
  icon, label, value, tone,
}: {
  icon: React.ReactNode
  label: string
  value: string
  tone: 'normal' | 'good' | 'warn' | 'danger'
}) {
  const toneClass = {
    normal: 'text-white/70',
    good:   'text-emerald-400',
    warn:   'text-amber-400',
    danger: 'text-red-400',
  }[tone]

  return (
    <div className="no-drag hidden md:flex items-center gap-1.5">
      <span className={cn('shrink-0', tone === 'normal' ? 'text-white/35' : toneClass)}>
        {icon}
      </span>
      <span className="text-[11px] text-white/40">{label}</span>
      <span className={cn('text-[11px] font-semibold tabular-nums', toneClass)}>{value}</span>
    </div>
  )
}

function IconButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button
      title={label}
      className="relative w-8 h-8 rounded-lg flex items-center justify-center text-white/45 hover:text-white hover:bg-white/[0.06] transition-colors"
    >
      {icon}
    </button>
  )
}
