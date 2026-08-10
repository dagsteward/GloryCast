import { motion } from 'framer-motion'
import { Minus, Square, X, Wifi, WifiOff } from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import { cn } from '../../lib/utils'

export function TitleBar() {
  const { isStreaming, streamHealth, connectionStatus } = useAppStore()
  const isMac = navigator.platform.toLowerCase().includes('mac')

  // Optional: the renderer also runs in a plain browser during dev, where
  // no preload bridge exists and these would throw.
  const handleMinimize = () => window.glorycast?.window.minimize()
  const handleMaximize = () => window.glorycast?.window.maximize()
  const handleClose = () => window.glorycast?.window.close()

  return (
    <div
      className={cn(
        'drag-region flex items-center justify-between h-10 px-4',
        'bg-[#0d0d14] border-b border-white/[0.06]',
        'shrink-0',
      )}
    >
      {/* Left: macOS traffic lights space or Windows controls on right */}
      <div className={cn('flex items-center gap-3', isMac ? 'pl-16' : 'pl-0')}>
        {/* Logo */}
        <div className="flex items-center gap-2 no-drag">
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-purple-500 to-orange-500 flex items-center justify-center">
            <span className="text-[9px] font-black text-white">G</span>
          </div>
          <span className="text-xs font-semibold gradient-text-brand tracking-wide">
            GloryCast AI
          </span>
        </div>

        {/* Stream status pill */}
        {isStreaming && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="no-drag flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/15 border border-red-500/30"
          >
            <span className="live-dot w-1.5 h-1.5 rounded-full bg-red-400" />
            <span className="text-[10px] font-semibold text-red-400 uppercase tracking-widest">
              Live
            </span>
            {streamHealth && (
              <span className="text-[10px] text-red-400/70 font-mono">
                {streamHealth.bitrate}k
              </span>
            )}
          </motion.div>
        )}
      </div>

      {/* Center: App title */}
      <div className="absolute left-1/2 -translate-x-1/2 text-[11px] text-white/30 font-medium tracking-wider">
        Worship · Broadcast · AI
      </div>

      {/* Right: Connection + Window controls */}
      <div className="flex items-center gap-2 no-drag">
        {/* Connection indicator */}
        <div className="flex items-center gap-1.5">
          {connectionStatus === 'connected' ? (
            <Wifi size={12} className="text-emerald-400" />
          ) : (
            <WifiOff size={12} className="text-white/30" />
          )}
        </div>

        {/* Windows window controls */}
        {!isMac && (
          <div className="flex items-center ml-2">
            <button
              onClick={handleMinimize}
              className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 rounded transition-colors"
            >
              <Minus size={12} />
            </button>
            <button
              onClick={handleMaximize}
              className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 rounded transition-colors"
            >
              <Square size={11} />
            </button>
            <button
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white hover:bg-red-500 rounded transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
