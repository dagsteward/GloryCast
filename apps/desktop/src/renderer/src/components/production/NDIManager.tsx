import { useState } from 'react'
import { motion } from 'framer-motion'
import { Wifi, Plus, RefreshCw, Monitor, Video } from 'lucide-react'
import { cn } from '../../lib/utils'

const NDI_SOURCES = [
  { id: 'ndi1', name: 'DESKTOP-GHJ812 (NDI HX)', ip: '192.168.1.105', resolution: '1920x1080', fps: 60, bandwidth: '150 Mbps', connected: true },
  { id: 'ndi2', name: "Pastor's Laptop", ip: '192.168.1.112', resolution: '1920x1080', fps: 30, bandwidth: '100 Mbps', connected: true },
  { id: 'ndi3', name: 'PTZ Camera — NDI', ip: '192.168.1.88', resolution: '1920x1080', fps: 60, bandwidth: '150 Mbps', connected: false },
]

export function NDIManager() {
  const [scanning, setScanning] = useState(false)
  const [sources, setSources] = useState(NDI_SOURCES)

  const scan = async () => {
    setScanning(true)
    await new Promise(r => setTimeout(r, 2000))
    setScanning(false)
  }

  return (
    <div className="h-full p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white/80">NDI Sources</h3>
          <p className="text-[11px] text-white/35 mt-0.5">Discover and manage Network Device Interface feeds on your local network</p>
        </div>
        <button
          onClick={scan}
          disabled={scanning}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 text-xs font-medium hover:bg-blue-600/30 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={12} className={scanning ? 'animate-spin' : ''} />
          {scanning ? 'Scanning...' : 'Scan Network'}
        </button>
      </div>

      <div className="space-y-2">
        {sources.map(source => (
          <motion.div
            key={source.id}
            layout
            className={cn(
              'flex items-center gap-4 p-3 rounded-xl border transition-all',
              source.connected
                ? 'border-emerald-500/20 bg-emerald-600/5'
                : 'border-white/[0.06] bg-white/[0.02]',
            )}
          >
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', source.connected ? 'bg-emerald-600/20' : 'bg-white/[0.05]')}>
              <Video size={18} className={source.connected ? 'text-emerald-400' : 'text-white/25'} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white/80">{source.name}</div>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-[11px] font-mono text-white/35">{source.ip}</span>
                <span className="text-[11px] text-white/30">{source.resolution} @ {source.fps}fps</span>
                <span className="text-[11px] text-white/30">{source.bandwidth}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className={cn('text-[10px] font-medium', source.connected ? 'text-emerald-400' : 'text-white/30')}>
                {source.connected ? 'Connected' : 'Not Found'}
              </span>
              <button className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                source.connected
                  ? 'bg-purple-600 hover:bg-purple-500 text-white'
                  : 'bg-white/[0.06] text-white/40 hover:bg-white/10',
              )}>
                {source.connected ? 'Add to Scene' : 'Connect'}
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* NDI output config */}
      <div className="mt-6 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
        <h4 className="text-xs font-semibold text-white/60 uppercase tracking-widest mb-3">NDI Output</h4>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="text-sm text-white/70">Program Output</div>
            <div className="text-[11px] text-white/35 mt-0.5">Broadcasting program output as NDI source on local network</div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" defaultChecked className="sr-only" />
            <div className="w-9 h-5 rounded-full bg-purple-600 relative">
              <span className="absolute right-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow" />
            </div>
            <span className="text-xs text-white/60">Enabled</span>
          </label>
        </div>
      </div>
    </div>
  )
}
