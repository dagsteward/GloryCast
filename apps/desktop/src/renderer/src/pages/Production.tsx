import { useState } from 'react'
import { motion } from 'framer-motion'
import { VideoSwitcher } from '../components/production/VideoSwitcher'
import { AudioMixer } from '../components/production/AudioMixer'
import { StreamControls } from '../components/production/StreamControls'
import { SourceLibrary } from '../components/production/SourceLibrary'
import { MultiView } from '../components/production/MultiView'
import { SceneManager } from '../components/production/SceneManager'
import { NDIManager } from '../components/production/NDIManager'
import { cn } from '../lib/utils'

type Tab = 'switcher' | 'audio' | 'scenes' | 'ndi'

export function ProductionPage() {
  const [activeTab, setActiveTab] = useState<Tab>('switcher')

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Production header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] bg-[#0a0a12] shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-white/80">Production Control</h2>
          <div className="flex gap-1">
            {(['switcher', 'audio', 'scenes', 'ndi'] as Tab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-3 py-1 rounded-md text-[11px] font-medium capitalize transition-colors',
                  activeTab === tab
                    ? 'bg-purple-600/25 text-purple-400 border border-purple-500/30'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]',
                )}
              >
                {tab === 'ndi' ? 'NDI' : tab}
              </button>
            ))}
          </div>
        </div>

        {/* Stream controls always visible */}
        <StreamControls compact />
      </div>

      {/* Main production layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Source library */}
        <div className="w-52 shrink-0 border-r border-white/[0.05] overflow-y-auto">
          <SourceLibrary />
        </div>

        {/* Center: Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {activeTab === 'switcher' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Multi-view monitor */}
              <div className="flex-1 p-3">
                <MultiView />
              </div>
              {/* Video switcher bus */}
              <div className="shrink-0 border-t border-white/[0.05]">
                <VideoSwitcher />
              </div>
            </div>
          )}

          {activeTab === 'audio' && (
            <div className="flex-1 overflow-hidden">
              <AudioMixer />
            </div>
          )}

          {activeTab === 'scenes' && (
            <div className="flex-1 overflow-hidden">
              <SceneManager />
            </div>
          )}

          {activeTab === 'ndi' && (
            <div className="flex-1 overflow-hidden">
              <NDIManager />
            </div>
          )}
        </div>

        {/* Right: Stream info panel */}
        <div className="w-64 shrink-0 border-l border-white/[0.05] overflow-y-auto">
          <StreamInfoPanel />
        </div>
      </div>
    </div>
  )
}

function StreamInfoPanel() {
  const destinations = [
    { name: 'YouTube', status: 'connected', viewers: 842, color: 'text-red-400' },
    { name: 'Facebook', status: 'connected', viewers: 391, color: 'text-blue-400' },
    { name: 'Church Website', status: 'connected', viewers: 51, color: 'text-purple-400' },
    { name: 'Twitch', status: 'idle', viewers: 0, color: 'text-white/30' },
  ]

  return (
    <div className="p-3 space-y-4">
      <div>
        <h3 className="text-xs font-semibold text-white/60 uppercase tracking-widest mb-2">
          Stream Destinations
        </h3>
        <div className="space-y-1.5">
          {destinations.map(dest => (
            <div key={dest.name} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
              <div className="flex items-center gap-2">
                <span className={cn('w-1.5 h-1.5 rounded-full', dest.status === 'connected' ? 'bg-emerald-400' : 'bg-white/20')} />
                <span className="text-xs text-white/70">{dest.name}</span>
              </div>
              {dest.viewers > 0 && (
                <span className="text-[10px] font-mono text-white/40">{dest.viewers.toLocaleString()}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-white/60 uppercase tracking-widest mb-2">
          Encoder Stats
        </h3>
        <div className="space-y-2 text-[11px] font-mono">
          {[
            { label: 'Video Bitrate', value: '6,000 kbps' },
            { label: 'Audio Bitrate', value: '320 kbps' },
            { label: 'Resolution', value: '1920×1080' },
            { label: 'Frame Rate', value: '60 fps' },
            { label: 'Encoder', value: 'NVENC H.264' },
            { label: 'Dropped Frames', value: '0 (0.0%)' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-white/35">{label}</span>
              <span className="text-white/65">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
