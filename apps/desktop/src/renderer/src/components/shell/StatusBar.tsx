import { Crown, Check } from 'lucide-react'
import { useSystemStats, formatMemory } from '../../hooks/useSystemStats'
import { useAppStore } from '../../stores/appStore'
import { useEngineStore } from '../../stores/engineStore'
import { cn } from '../../lib/utils'

/**
 * The bottom rail. Everything here is a real reading or a dash — an operator
 * glances at this to decide whether the machine is coping mid-service, so a
 * plausible-looking invented number would be actively dangerous.
 */
export function StatusBar() {
  const { cpu, gpu, memoryUsedMb, memoryTotalMb, available } = useSystemStats()
  const connectionStatus = useAppStore(s => s.connectionStatus)
  const upcomingService  = useAppStore(s => s.upcomingService)
  const fps          = useEngineStore(s => s.fps)
  const outputFormat = useEngineStore(s => s.outputFormat)

  const online = connectionStatus === 'connected'
  const dash = (v: string) => (available ? v : '—')

  return (
    <footer className="flex items-center justify-between h-[26px] px-3.5 bg-chrome border-t border-white/[0.06] shrink-0 text-[10.5px]">

      {/* Left: product identity + connectivity */}
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 text-white/55 font-medium">
          <Crown size={11} className="text-purple-400" />
          GloryCast OS v1.0.0
        </span>

        <span className={cn(
          'flex items-center gap-1.5 px-1.5 py-px rounded-full',
          online ? 'text-emerald-400' : 'text-white/35',
        )}>
          <span className={cn(
            'w-1.5 h-1.5 rounded-full',
            online ? 'bg-emerald-400' : 'bg-white/25',
          )} />
          {online ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* Centre: session and machine vitals */}
      <div className="hidden lg:flex items-center gap-4 text-white/40 font-mono tabular-nums">
        <Stat label="Project"    value={upcomingService?.title ?? 'Untitled Service'} />
        <Stat label="Resolution" value={outputFormat ?? '—'} />
        <Stat label="FPS"        value={fps === null ? '—' : String(fps)} />
        <Stat label="CPU"        value={dash(`${cpu}%`)} />
        <Stat label="GPU"        value={gpu === null ? '—' : `${gpu}%`} />
        <Stat
          label="Memory"
          value={available ? `${formatMemory(memoryUsedMb)} / ${formatMemory(memoryTotalMb)}` : '—'}
        />
      </div>

      {/* Right: persistence state */}
      <span className="flex items-center gap-1.5 text-white/40">
        Auto Save: <span className="text-white/65">Enabled</span>
        <Check size={11} className="text-emerald-400" />
      </span>
    </footer>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-white/30">{label}:</span>
      <span className="text-white/65">{value}</span>
    </span>
  )
}
