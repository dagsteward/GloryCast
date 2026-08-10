import { NavLink } from 'react-router-dom'
import { Crown, MapPin, Users, Radio, Brain } from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import { useWorkspace } from '../../stores/workspaceStore'
import { cn } from '../../lib/utils'
import { useEffect, useState } from 'react'

/**
 * Operations bar for the Command Center workspace.
 *
 * Where Cinematic's top bar reports the health of one machine, this reports the
 * state of an operation: how many viewers are connected, how many streams are
 * running, whether AI monitoring is armed. Teal accent throughout to keep the
 * three workspaces visually distinct at a glance.
 */
export function CommandBar() {
  const workspace   = useWorkspace()
  const isStreaming = useAppStore(s => s.isStreaming)
  const viewerCount = useAppStore(s => s.viewerCount)
  const destinations= useAppStore(s => s.destinations)

  const activeStreams = destinations.filter(d => d.status === 'live').length
  const clock = useClock()

  return (
    <header className="drag-region flex items-center gap-5 h-[52px] px-5 bg-chrome border-b border-white/[0.06] shrink-0">

      <div className="flex items-center gap-2.5 shrink-0">
        <div className="w-[26px] h-[26px] rounded-lg bg-gradient-to-br from-teal-400 to-cyan-600 flex items-center justify-center">
          <Crown size={14} className="text-white" strokeWidth={2.5} />
        </div>
        <span className="text-[14px] font-bold tracking-tight text-white/90">
          GloryCast <span className="font-medium text-white/55">Command Center</span>
        </span>
      </div>

      <span className={cn(
        'no-drag flex items-center gap-1.5 h-[22px] px-2.5 rounded-md text-[10px] font-bold tracking-[0.1em]',
        isStreaming
          ? 'bg-red-500/15 text-red-400 border border-red-500/30'
          : 'bg-white/[0.04] text-white/35 border border-white/[0.08]',
      )}>
        <span className={cn(
          'w-1.5 h-1.5 rounded-full',
          isStreaming ? 'bg-red-500 shadow-[0_0_6px_2px_rgba(239,68,68,0.5)]' : 'bg-white/25',
        )} />
        {isStreaming ? 'LIVE' : 'STANDBY'}
      </span>

      <div className="no-drag hidden lg:flex items-center gap-5 flex-1 min-w-0">
        <Counter
          icon={<Users size={12} />}
          value={isStreaming ? viewerCount.toLocaleString() : '0'}
          label="Connected"
        />
        <Counter
          icon={<Radio size={12} />}
          value={String(activeStreams)}
          label="Streams Active"
        />
        <Counter
          icon={<Brain size={12} />}
          value="AI Monitoring"
          label={workspace.features.includes('ai-monitoring') ? 'Enabled' : 'Off'}
          tone="teal"
        />
      </div>

      <nav className="no-drag flex items-center gap-0.5 shrink-0">
        {workspace.nav.map(({ label, path }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) => cn(
              'px-2.5 h-7 flex items-center rounded-md text-[11.5px] font-medium transition-colors',
              isActive
                ? 'text-teal-300 bg-teal-500/12'
                : 'text-white/40 hover:text-white/75 hover:bg-white/[0.04]',
            )}
          >
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="no-drag hidden xl:flex items-center gap-3 shrink-0 text-[11px] text-white/45">
        <span className="flex items-center gap-1.5">
          <MapPin size={11} className="text-teal-400/70" />
          {Intl.DateTimeFormat().resolvedOptions().timeZone}
        </span>
        <span className="font-mono tabular-nums text-white/65">{clock}</span>
      </div>
    </header>
  )
}

function Counter({
  icon, value, label, tone = 'neutral',
}: {
  icon: React.ReactNode
  value: string
  label: string
  tone?: 'neutral' | 'teal'
}) {
  return (
    <span className="flex items-center gap-1.5 text-[11.5px]">
      <span className={tone === 'teal' ? 'text-teal-400' : 'text-white/35'}>{icon}</span>
      <b className={cn('font-semibold tabular-nums', tone === 'teal' ? 'text-teal-300' : 'text-white/85')}>
        {value}
      </b>
      <span className="text-white/35">{label}</span>
    </span>
  )
}

function useClock(): string {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
