import { Cpu, HardDrive, Wifi, Clock, Thermometer } from 'lucide-react'
import { useSystemStats } from '../../hooks/useSystemStats'
import { useAppStore } from '../../stores/appStore'
import { cn } from '../../lib/utils'

export function StatusBar() {
  const { cpu, memory, network, temperature } = useSystemStats()
  const { isStreaming, streamHealth, currentScene } = useAppStore()

  const now = new Date()
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  return (
    <footer className="flex items-center justify-between h-6 px-4 bg-[#080810] border-t border-white/[0.04] shrink-0">
      {/* Left: Scene info */}
      <div className="flex items-center gap-4">
        {currentScene && (
          <span className="text-[10px] text-white/40 font-mono">
            Scene: <span className="text-white/70">{currentScene}</span>
          </span>
        )}

        {/* Stream stats */}
        {isStreaming && streamHealth && (
          <div className="flex items-center gap-3 text-[10px] font-mono">
            <StatusItem color="text-red-400">
              LIVE {streamHealth.bitrate}k · {streamHealth.fps}fps · {streamHealth.time}
            </StatusItem>
          </div>
        )}
      </div>

      {/* Right: System stats */}
      <div className="flex items-center gap-4 text-[10px] font-mono text-white/30">
        <StatusItem icon={<Cpu size={10} />} color={cpu > 80 ? 'text-red-400' : 'text-white/30'}>
          {cpu}%
        </StatusItem>
        <StatusItem icon={<HardDrive size={10} />}>
          {memory}%
        </StatusItem>
        {temperature && (
          <StatusItem icon={<Thermometer size={10} />} color={temperature > 80 ? 'text-orange-400' : 'text-white/30'}>
            {temperature}°C
          </StatusItem>
        )}
        <StatusItem icon={<Wifi size={10} />}>
          {network}
        </StatusItem>
        <StatusItem icon={<Clock size={10} />}>
          {timeStr}
        </StatusItem>
        <span className="text-purple-500/50">GloryCast AI v1.0</span>
      </div>
    </footer>
  )
}

function StatusItem({
  icon,
  children,
  color,
}: {
  icon?: React.ReactNode
  children: React.ReactNode
  color?: string
}) {
  return (
    <span className={cn('flex items-center gap-1', color ?? 'text-white/30')}>
      {icon}
      {children}
    </span>
  )
}
