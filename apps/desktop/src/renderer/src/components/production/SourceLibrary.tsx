import { useState } from 'react'
import { Plus, Camera, Monitor, Globe, Play, Wifi, ChevronDown } from 'lucide-react'
import { cn } from '../../lib/utils'

interface Source {
  id: string; name: string; type: string; icon: React.ElementType; active: boolean
}

const SOURCES: Source[] = [
  { id: 'cam1', name: 'Camera 1', type: 'NDI', icon: Camera, active: true },
  { id: 'cam2', name: 'Camera 2', type: 'USB', icon: Camera, active: true },
  { id: 'cam3', name: 'Camera 3 — PTZ', type: 'RTSP', icon: Camera, active: false },
  { id: 'hdmi1', name: 'HDMI Input 1', type: 'Capture', icon: Monitor, active: true },
  { id: 'screen1', name: 'Desktop', type: 'Screen', icon: Monitor, active: false },
  { id: 'browser1', name: 'Lower Third', type: 'Browser', icon: Globe, active: true },
  { id: 'media1', name: 'Promo Video', type: 'Media', icon: Play, active: false },
  { id: 'ndi1', name: 'NDI — Laptop', type: 'NDI', icon: Wifi, active: true },
]

export function SourceLibrary() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="p-2 space-y-1">
      <div className="flex items-center justify-between px-1 py-1 mb-1">
        <span className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">Sources</span>
        <button
          onClick={() => {/* add source */}}
          className="w-5 h-5 rounded flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-colors"
        >
          <Plus size={12} />
        </button>
      </div>

      {SOURCES.map(source => (
        <div
          key={source.id}
          className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.04] cursor-pointer transition-colors group"
        >
          <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', source.active ? 'bg-emerald-400' : 'bg-white/15')} />
          <source.icon size={12} className="text-white/30 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[11px] text-white/65 truncate">{source.name}</div>
            <div className="text-[9px] text-white/25">{source.type}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
