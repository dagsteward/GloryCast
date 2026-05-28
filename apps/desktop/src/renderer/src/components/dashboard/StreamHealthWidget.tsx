import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Play, Square, Zap, AlertTriangle } from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import { cn } from '../../lib/utils'

const DESTINATIONS = [
  { name: 'YouTube Live', status: 'live', bitrate: 6000, viewers: 1284, health: 99 },
  { name: 'Facebook Live', status: 'live', bitrate: 4500, viewers: 842, health: 97 },
  { name: 'Church Website', status: 'live', bitrate: 3000, viewers: 511, health: 100 },
  { name: 'Twitch', status: 'idle', bitrate: 0, viewers: 0, health: 0 },
]

export function StreamHealthWidget() {
  const { isStreaming, setIsStreaming, streamHealth, setStreamHealth } = useAppStore()
  const [uptime, setUptime] = useState(0)

  useEffect(() => {
    if (!isStreaming) return
    const interval = setInterval(() => {
      setUptime(u => u + 1)
      setStreamHealth({
        bitrate: 6000 + Math.floor(Math.random() * 200 - 100),
        fps: 60,
        time: formatDuration(uptime + 1),
        droppedFrames: 0,
        uptime: uptime + 1,
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [isStreaming, uptime, setStreamHealth])

  const formatDuration = (secs: number): string => {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const toggleStream = () => {
    if (isStreaming) {
      setIsStreaming(false)
      setStreamHealth(null)
      setUptime(0)
    } else {
      setIsStreaming(true)
    }
  }

  return (
    <div className="card-premium p-4 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-white/80">Stream Control</h3>
          {isStreaming && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30">
              <span className="live-dot w-1.5 h-1.5 rounded-full bg-red-400" />
              <span className="text-[10px] font-bold text-red-400">{formatDuration(uptime)}</span>
            </div>
          )}
        </div>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={toggleStream}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
            isStreaming
              ? 'bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30'
              : 'bg-red-600 text-white hover:bg-red-500 glow-red',
          )}
        >
          {isStreaming ? <><Square size={12} />Stop Stream</> : <><Play size={12} />Go Live</>}
        </motion.button>
      </div>

      {/* Destination grid */}
      <div className="grid grid-cols-4 gap-2">
        {DESTINATIONS.map(dest => (
          <div
            key={dest.name}
            className={cn(
              'rounded-lg border p-2.5 transition-all',
              dest.status === 'live' && isStreaming
                ? 'border-emerald-500/30 bg-emerald-600/8'
                : 'border-white/[0.06] bg-white/[0.02]',
            )}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <span className={cn(
                'w-1.5 h-1.5 rounded-full',
                dest.status === 'live' && isStreaming ? 'bg-emerald-400 live-dot' : 'bg-white/20',
              )} />
              <span className="text-[10px] text-white/60 font-medium truncate">{dest.name}</span>
            </div>

            {dest.status === 'live' && isStreaming ? (
              <>
                <div className="text-base font-bold text-white/90">
                  {dest.viewers.toLocaleString()}
                </div>
                <div className="text-[9px] text-white/35 font-mono mt-0.5">
                  {(dest.bitrate / 1000).toFixed(1)} Mbps
                </div>
                <div className="mt-1.5 flex items-center gap-1">
                  <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${dest.health}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-white/30 font-mono">{dest.health}%</span>
                </div>
              </>
            ) : (
              <div className="text-[10px] text-white/25 mt-2">Idle</div>
            )}
          </div>
        ))}
      </div>

      {/* Encoder stats row */}
      {isStreaming && streamHealth && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-3 pt-3 border-t border-white/[0.05] flex items-center gap-6 text-[11px] font-mono"
        >
          <StatChip label="Bitrate" value={`${streamHealth.bitrate.toLocaleString()} kbps`} />
          <StatChip label="FPS" value={`${streamHealth.fps}`} />
          <StatChip label="Dropped" value={`${streamHealth.droppedFrames} (0.0%)`} good />
          <StatChip label="Encoder" value="NVENC H.264" />
          <StatChip label="Resolution" value="1920×1080" />
        </motion.div>
      )}
    </div>
  )
}

function StatChip({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div>
      <span className="text-white/30">{label} </span>
      <span className={good ? 'text-emerald-400' : 'text-white/65'}>{value}</span>
    </div>
  )
}
