import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Mic2, MicOff, Volume2, VolumeX, Headphones, Settings2 } from 'lucide-react'
import { cn } from '../../lib/utils'

interface AudioChannel {
  id: string
  name: string
  type: 'mic' | 'line' | 'virtual' | 'mix'
  level: number
  muted: boolean
  solo: boolean
  pan: number
  eq: { low: number; mid: number; high: number }
  peakLevel: number
}

const INITIAL_CHANNELS: AudioChannel[] = [
  { id: 'pastor-mic', name: 'Pastor Mic', type: 'mic', level: 75, muted: false, solo: false, pan: 0, eq: { low: 0, mid: 2, high: 1 }, peakLevel: 78 },
  { id: 'worship-mic', name: 'Worship Lead', type: 'mic', level: 68, muted: false, solo: false, pan: -15, eq: { low: -2, mid: 0, high: 3 }, peakLevel: 65 },
  { id: 'choir', name: 'Choir', type: 'mic', level: 55, muted: false, solo: false, pan: 0, eq: { low: 0, mid: 0, high: 0 }, peakLevel: 52 },
  { id: 'keys', name: 'Keys', type: 'line', level: 62, muted: false, solo: false, pan: 10, eq: { low: 1, mid: -1, high: 0 }, peakLevel: 60 },
  { id: 'guitar', name: 'Guitar', type: 'line', level: 58, muted: false, solo: false, pan: -20, eq: { low: -3, mid: 2, high: 1 }, peakLevel: 55 },
  { id: 'drums', name: 'Drums', type: 'line', level: 70, muted: false, solo: false, pan: 0, eq: { low: 3, mid: 0, high: -1 }, peakLevel: 72 },
  { id: 'playback', name: 'Playback', type: 'virtual', level: 45, muted: false, solo: false, pan: 0, eq: { low: 0, mid: 0, high: 0 }, peakLevel: 43 },
  { id: 'stream-mix', name: 'Stream Mix', type: 'mix', level: 85, muted: false, solo: false, pan: 0, eq: { low: 0, mid: 0, high: 0 }, peakLevel: 83 },
]

export function AudioMixer() {
  const [channels, setChannels] = useState<AudioChannel[]>(INITIAL_CHANNELS)
  const [masterLevel, setMasterLevel] = useState(80)
  const [masterMuted, setMasterMuted] = useState(false)

  const updateChannel = (id: string, updates: Partial<AudioChannel>) => {
    setChannels(prev => prev.map(ch => ch.id === id ? { ...ch, ...updates } : ch))
  }

  return (
    <div className="h-full flex flex-col bg-[#080810]">
      {/* Mixer header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.05] shrink-0">
        <h3 className="text-xs font-semibold text-white/60 uppercase tracking-widest">Audio Mixer</h3>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1 rounded text-[11px] text-white/50 hover:text-white hover:bg-white/[0.05] transition-colors">
            <Settings2 size={11} />
            Routing
          </button>
        </div>
      </div>

      {/* Channel strips */}
      <div className="flex-1 flex overflow-x-auto overflow-y-hidden">
        <div className="flex gap-0 h-full">
          {channels.map(channel => (
            <ChannelStrip
              key={channel.id}
              channel={channel}
              onUpdate={(updates) => updateChannel(channel.id, updates)}
            />
          ))}

          {/* Master fader */}
          <div className="flex flex-col items-center border-l border-white/10 bg-white/[0.02] px-4 py-3 min-w-[72px]">
            <span className="text-[9px] text-white/40 uppercase tracking-widest mb-3">Master</span>
            <VUMeter level={masterMuted ? 0 : masterLevel} peak={masterLevel + 2} color="purple" />
            <div className="flex-1 flex items-center">
              <VerticalFader
                value={masterLevel}
                onChange={setMasterLevel}
                color="purple"
              />
            </div>
            <div className="text-[10px] font-mono text-white/60 mb-2">
              {masterLevel === 0 ? '-∞' : `${masterLevel > 0 ? '+' : ''}${(masterLevel - 100) / 10 * 6}`} dB
            </div>
            <button
              onClick={() => setMasterMuted(!masterMuted)}
              className={cn(
                'w-10 h-7 rounded text-[9px] font-bold uppercase tracking-wide transition-colors',
                masterMuted ? 'bg-red-600 text-white' : 'bg-white/10 text-white/50 hover:bg-white/20',
              )}
            >
              {masterMuted ? 'MUTE' : 'M'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ChannelStrip({
  channel,
  onUpdate,
}: {
  channel: AudioChannel
  onUpdate: (updates: Partial<AudioChannel>) => void
}) {
  const typeColor = {
    mic: 'text-purple-400',
    line: 'text-blue-400',
    virtual: 'text-orange-400',
    mix: 'text-emerald-400',
  }[channel.type]

  return (
    <div className={cn(
      'flex flex-col items-center border-r border-white/[0.05] py-3 px-2.5 min-w-[64px] transition-colors',
      channel.solo && 'bg-yellow-500/5',
    )}>
      {/* Channel name */}
      <span className="text-[9px] text-white/50 mb-1 text-center leading-tight truncate w-full text-center">
        {channel.name}
      </span>
      <span className={cn('text-[8px] uppercase tracking-wide mb-2', typeColor)}>
        {channel.type}
      </span>

      {/* EQ knobs */}
      <div className="flex flex-col gap-1 mb-2">
        {(['high', 'mid', 'low'] as const).map(band => (
          <div key={band} className="flex items-center gap-1">
            <span className="text-[7px] text-white/25 w-5 text-right uppercase">{band[0]}</span>
            <EQKnob
              value={channel.eq[band]}
              onChange={v => onUpdate({ eq: { ...channel.eq, [band]: v } })}
            />
          </div>
        ))}
      </div>

      {/* Pan */}
      <div className="w-full mb-2">
        <input
          type="range"
          min={-100}
          max={100}
          value={channel.pan}
          onChange={e => onUpdate({ pan: Number(e.target.value) })}
          className="w-full accent-blue-500"
          style={{ height: '2px' }}
        />
      </div>

      {/* VU meter + fader */}
      <div className="flex gap-1 items-end flex-1">
        <VUMeter level={channel.muted ? 0 : channel.level} peak={channel.peakLevel} />
        <VerticalFader
          value={channel.level}
          onChange={v => onUpdate({ level: v })}
        />
      </div>

      {/* dB readout */}
      <div className="text-[9px] font-mono text-white/40 my-1">
        {channel.level === 0 ? '-∞' : `${((channel.level - 100) / 100 * 60).toFixed(1)}`}
      </div>

      {/* Mute / Solo */}
      <div className="flex gap-1">
        <button
          onClick={() => onUpdate({ solo: !channel.solo })}
          className={cn(
            'w-[22px] h-[18px] rounded text-[8px] font-bold uppercase transition-colors',
            channel.solo ? 'bg-yellow-500 text-black' : 'bg-white/8 text-white/30 hover:bg-white/15',
          )}
        >
          S
        </button>
        <button
          onClick={() => onUpdate({ muted: !channel.muted })}
          className={cn(
            'w-[22px] h-[18px] rounded text-[8px] font-bold uppercase transition-colors',
            channel.muted ? 'bg-red-600 text-white' : 'bg-white/8 text-white/30 hover:bg-white/15',
          )}
        >
          M
        </button>
      </div>
    </div>
  )
}

function VUMeter({ level, peak, color = 'default' }: { level: number; peak: number; color?: string }) {
  const bars = 20
  const filledBars = Math.round((level / 100) * bars)
  const peakBar = Math.round((peak / 100) * bars)

  return (
    <div className="flex flex-col-reverse gap-px" style={{ height: '80px', width: '8px' }}>
      {Array.from({ length: bars }).map((_, i) => {
        const isLit = i < filledBars
        const isPeak = i === peakBar - 1
        const isRed = i >= bars * 0.85
        const isYellow = i >= bars * 0.7

        return (
          <div
            key={i}
            className={cn(
              'rounded-sm transition-all duration-75',
              isLit || isPeak
                ? isRed
                  ? 'bg-red-500'
                  : isYellow
                  ? 'bg-yellow-400'
                  : color === 'purple'
                  ? 'bg-purple-500'
                  : 'bg-emerald-500'
                : 'bg-white/10',
              isPeak && 'opacity-100',
            )}
            style={{ flex: 1 }}
          />
        )
      })}
    </div>
  )
}

function VerticalFader({
  value,
  onChange,
  color = 'default',
}: {
  value: number
  onChange: (v: number) => void
  color?: string
}) {
  return (
    <div className="relative flex justify-center" style={{ height: '80px', width: '16px' }}>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className={cn('absolute', color === 'purple' ? 'accent-purple-500' : 'accent-emerald-500')}
        style={{
          writingMode: 'vertical-lr',
          direction: 'rtl',
          width: '80px',
          height: '16px',
          transform: 'rotate(180deg)',
          cursor: 'ns-resize',
        }}
      />
    </div>
  )
}

function EQKnob({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const rotation = (value / 12) * 135

  return (
    <motion.div
      className="w-5 h-5 rounded-full bg-white/10 border border-white/15 relative cursor-pointer flex items-center justify-center"
      style={{ transform: `rotate(${rotation}deg)` }}
      title={`${value > 0 ? '+' : ''}${value} dB`}
    >
      <div className="w-0.5 h-2 bg-white/60 rounded-full absolute top-0.5" />
    </motion.div>
  )
}
