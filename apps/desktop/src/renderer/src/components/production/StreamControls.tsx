import { Play, Square, Settings } from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import { cn } from '../../lib/utils'

export function StreamControls({ compact }: { compact?: boolean }) {
  const { isStreaming, setIsStreaming, streamHealth } = useAppStore()

  return (
    <div className="flex items-center gap-2">
      {isStreaming && streamHealth && (
        <div className="flex items-center gap-2 text-[11px] font-mono text-white/50">
          <span className="live-dot w-1.5 h-1.5 rounded-full bg-red-400" />
          <span className="text-red-400 font-semibold">LIVE</span>
          <span>{streamHealth.bitrate.toLocaleString()}k</span>
          <span>{streamHealth.fps}fps</span>
        </div>
      )}

      <button
        onClick={() => setIsStreaming(!isStreaming)}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
          isStreaming
            ? 'bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30'
            : 'bg-red-600 text-white hover:bg-red-500',
        )}
      >
        {isStreaming ? <><Square size={11} />Stop</> : <><Play size={11} />Go Live</>}
      </button>
    </div>
  )
}
