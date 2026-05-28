import { useState, useEffect, useRef, useCallback } from 'react'
import { Mic2, MicOff, Volume2, VolumeX, Settings2, Activity } from 'lucide-react'
import { cn } from '../../lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

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
  realLevel?: number    // 0–100, filled in by Web Audio API when live
  isLive?: boolean
}

// ─── Initial channel layout ───────────────────────────────────────────────────

const INITIAL_CHANNELS: AudioChannel[] = [
  { id: 'live-mic',     name: 'Live Mic',    type: 'mic',     level: 80, muted: false, solo: false, pan: 0,   eq: { low:0, mid:0, high:0 }, peakLevel: 0,  isLive: true  },
  { id: 'worship-mic',  name: 'Worship',     type: 'mic',     level: 68, muted: false, solo: false, pan: -15, eq: { low:-2, mid:0, high:3 }, peakLevel: 65 },
  { id: 'choir',        name: 'Choir',       type: 'mic',     level: 55, muted: false, solo: false, pan: 0,   eq: { low:0,  mid:0, high:0  }, peakLevel: 52 },
  { id: 'keys',         name: 'Keys',        type: 'line',    level: 62, muted: false, solo: false, pan: 10,  eq: { low:1,  mid:-1, high:0  }, peakLevel: 60 },
  { id: 'guitar',       name: 'Guitar',      type: 'line',    level: 58, muted: false, solo: false, pan: -20, eq: { low:-3, mid:2, high:1   }, peakLevel: 55 },
  { id: 'drums',        name: 'Drums',       type: 'line',    level: 70, muted: false, solo: false, pan: 0,   eq: { low:3,  mid:0, high:-1  }, peakLevel: 72 },
  { id: 'playback',     name: 'Playback',    type: 'virtual', level: 45, muted: false, solo: false, pan: 0,   eq: { low:0,  mid:0, high:0  }, peakLevel: 43 },
  { id: 'stream-mix',   name: 'Stream Mix',  type: 'mix',     level: 85, muted: false, solo: false, pan: 0,   eq: { low:0,  mid:0, high:0  }, peakLevel: 83 },
]

// ─── Web Audio helpers ────────────────────────────────────────────────────────

function getRms(analyser: AnalyserNode): number {
  const buf = new Uint8Array(analyser.frequencyBinCount)
  analyser.getByteTimeDomainData(buf)
  let sum = 0
  for (let i = 0; i < buf.length; i++) {
    const v = (buf[i] - 128) / 128
    sum += v * v
  }
  return Math.sqrt(sum / buf.length) * 100
}

// ─── VU Meter ─────────────────────────────────────────────────────────────────

function VUMeter({ level, peak, color = 'emerald', isLive }: {
  level: number; peak: number; color?: string; isLive?: boolean
}) {
  const pct    = Math.min(100, Math.max(0, level))
  const peakPct = Math.min(100, Math.max(0, peak))

  const barColor =
    pct > 85 ? 'bg-red-500' :
    pct > 70 ? 'bg-yellow-400' :
    isLive    ? 'bg-emerald-400' :
                `bg-${color}-500`

  return (
    <div className="relative w-3 flex flex-col-reverse bg-white/[0.05] rounded-full overflow-hidden" style={{ height: '80px' }}>
      {/* Level bar */}
      <motion_div pct={pct} barColor={barColor} />
      {/* Peak indicator */}
      <div
        className="absolute w-full h-0.5 bg-white/80 transition-none"
        style={{ bottom: `${peakPct}%` }}
      />
      {/* Live dot */}
      {isLive && pct > 2 && (
        <div className="absolute top-1 right-0 left-0 mx-auto w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" style={{ width: '6px', margin: '0 auto' }} />
      )}
    </div>
  )
}

// Framer-motion-free animated bar (CSS transition)
function motion_div({ pct, barColor }: { pct: number; barColor: string }) {
  return (
    <div
      className={cn('w-full rounded-full transition-all duration-75', barColor)}
      style={{ height: `${pct}%` }}
    />
  )
}

// ─── Vertical fader ───────────────────────────────────────────────────────────

function VerticalFader({ value, onChange, color = 'white' }: {
  value: number; onChange: (v: number) => void; color?: string
}) {
  return (
    <input
      type="range" min={0} max={100} value={value}
      onChange={e => onChange(Number(e.target.value))}
      className="h-20 cursor-pointer"
      style={{
        writingMode: 'vertical-lr' as const,
        direction: 'rtl' as const,
        appearance: 'slider-vertical',
        width: '20px',
        accentColor: color === 'purple' ? '#7c3aed' : '#fff',
      }}
    />
  )
}

// ─── EQ knob (small rotary) ───────────────────────────────────────────────────

function EQKnob({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const deg = (value / 12) * 135
  return (
    <div
      className="w-4 h-4 rounded-full bg-white/10 border border-white/20 flex items-center justify-center cursor-ns-resize relative"
      title={`${value > 0 ? '+' : ''}${value} dB`}
      onPointerDown={e => {
        e.currentTarget.setPointerCapture(e.pointerId)
        let startY = e.clientY, startV = value
        const move = (me: PointerEvent) => {
          const delta = Math.round((startY - me.clientY) / 5)
          onChange(Math.max(-12, Math.min(12, startV + delta)))
        }
        const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
        window.addEventListener('pointermove', move)
        window.addEventListener('pointerup', up)
      }}
    >
      <div
        className="w-0.5 h-1.5 bg-white/60 rounded-full absolute bottom-1"
        style={{ transform: `rotate(${deg}deg)`, transformOrigin: 'bottom center', bottom: '3px' }}
      />
    </div>
  )
}

// ─── Channel strip ────────────────────────────────────────────────────────────

function ChannelStrip({ channel, onUpdate }: {
  channel: AudioChannel
  onUpdate: (updates: Partial<AudioChannel>) => void
}) {
  const typeColor = {
    mic:     'text-purple-400',
    line:    'text-blue-400',
    virtual: 'text-orange-400',
    mix:     'text-emerald-400',
  }[channel.type]

  const displayLevel = channel.isLive && channel.realLevel !== undefined
    ? (channel.muted ? 0 : channel.realLevel * (channel.level / 100))
    : (channel.muted ? 0 : channel.level)

  return (
    <div className={cn(
      'flex flex-col items-center border-r border-white/[0.05] py-3 px-2.5 min-w-[64px] transition-colors',
      channel.solo && 'bg-yellow-500/5',
      channel.isLive && 'bg-emerald-500/[0.03]',
    )}>
      {/* Name */}
      <span className="text-[9px] text-white/50 mb-0.5 text-center leading-tight truncate w-full">{channel.name}</span>
      <span className={cn('text-[7px] uppercase tracking-wide mb-2', typeColor)}>
        {channel.isLive ? '● LIVE' : channel.type}
      </span>

      {/* EQ */}
      <div className="flex flex-col gap-1 mb-2">
        {(['high','mid','low'] as const).map(band => (
          <div key={band} className="flex items-center gap-1">
            <span className="text-[7px] text-white/25 w-4 text-right uppercase">{band[0]}</span>
            <EQKnob value={channel.eq[band]} onChange={v => onUpdate({ eq: { ...channel.eq, [band]: v } })} />
          </div>
        ))}
      </div>

      {/* Pan */}
      <input type="range" min={-100} max={100} value={channel.pan}
        onChange={e => onUpdate({ pan: Number(e.target.value) })}
        className="w-full mb-2 accent-blue-500" style={{ height: '2px' }} />

      {/* VU + fader */}
      <div className="flex gap-1 items-end flex-1">
        <VUMeter level={displayLevel} peak={channel.peakLevel} isLive={channel.isLive} />
        <VerticalFader value={channel.level} onChange={v => onUpdate({ level: v })} />
      </div>

      {/* dB */}
      <div className="text-[9px] font-mono text-white/40 my-1">
        {channel.level === 0 ? '-∞' : `${((channel.level - 100) / 100 * 60).toFixed(1)}`}
      </div>

      {/* Mute / Solo */}
      <div className="flex gap-1">
        <button onClick={() => onUpdate({ muted: !channel.muted })}
          className={cn('px-1.5 py-0.5 rounded text-[8px] font-bold uppercase transition-colors',
            channel.muted ? 'bg-red-600 text-white' : 'bg-white/10 text-white/40 hover:bg-white/20')}>
          M
        </button>
        <button onClick={() => onUpdate({ solo: !channel.solo })}
          className={cn('px-1.5 py-0.5 rounded text-[8px] font-bold uppercase transition-colors',
            channel.solo ? 'bg-yellow-500 text-black' : 'bg-white/10 text-white/40 hover:bg-white/20')}>
          S
        </button>
      </div>
    </div>
  )
}

// ─── AudioMixer ───────────────────────────────────────────────────────────────

export function AudioMixer() {
  const [channels, setChannels] = useState<AudioChannel[]>(INITIAL_CHANNELS)
  const [masterLevel, setMasterLevel] = useState(80)
  const [masterMuted, setMasterMuted] = useState(false)
  const [micStatus, setMicStatus] = useState<'idle'|'active'|'denied'>('idle')

  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const rafRef      = useRef<number>(0)

  const startMicMonitor = useCallback(async () => {
    if (analyserRef.current) return  // already running
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      const ctx     = new AudioContext()
      const source  = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 1024
      source.connect(analyser)

      audioCtxRef.current = ctx
      analyserRef.current = analyser
      setMicStatus('active')

      const tick = () => {
        const rms = getRms(analyser)
        setChannels(chs => chs.map(ch =>
          ch.isLive ? { ...ch, realLevel: rms, peakLevel: Math.max(ch.peakLevel * 0.97, rms) } : ch
        ))
        rafRef.current = requestAnimationFrame(tick)
      }
      tick()
    } catch {
      setMicStatus('denied')
    }
  }, [])

  useEffect(() => {
    startMicMonitor()
    return () => {
      cancelAnimationFrame(rafRef.current)
      audioCtxRef.current?.close()
    }
  }, [startMicMonitor])

  function updateChannel(id: string, updates: Partial<AudioChannel>) {
    setChannels(prev => prev.map(ch => ch.id === id ? { ...ch, ...updates } : ch))
  }

  const masterDisplay = masterMuted ? 0 : masterLevel

  return (
    <div className="h-full flex flex-col bg-[#080810]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.05] shrink-0">
        <h3 className="text-xs font-semibold text-white/60 uppercase tracking-widest">Audio Mixer</h3>
        <div className="flex items-center gap-3">
          {/* Mic status */}
          <div className={cn('flex items-center gap-1.5 text-[10px]',
            micStatus === 'active' ? 'text-emerald-400' :
            micStatus === 'denied' ? 'text-red-400' : 'text-white/30')}>
            {micStatus === 'active' ? (
              <><Activity size={10} className="animate-pulse" /> Live input active</>
            ) : micStatus === 'denied' ? (
              <><MicOff size={10} /> Mic denied</>
            ) : (
              <><Mic2 size={10} /> Waiting for mic…</>
            )}
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1 rounded text-[11px] text-white/50 hover:text-white hover:bg-white/[0.05] transition-colors">
            <Settings2 size={11} /> Routing
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
              onUpdate={updates => updateChannel(channel.id, updates)}
            />
          ))}

          {/* Master */}
          <div className="flex flex-col items-center border-l border-white/10 bg-white/[0.02] px-4 py-3 min-w-[72px]">
            <span className="text-[9px] text-white/40 uppercase tracking-widest mb-3">Master</span>
            <VUMeter level={masterDisplay} peak={masterDisplay + 2} color="purple" />
            <div className="flex-1 flex items-center">
              <VerticalFader value={masterLevel} onChange={setMasterLevel} color="purple" />
            </div>
            <div className="text-[10px] font-mono text-white/60 mb-2">
              {masterLevel === 0 ? '-∞' : `${masterLevel > 0 ? '+' : ''}${((masterLevel-100)/100*60).toFixed(1)}`} dB
            </div>
            <button onClick={() => setMasterMuted(!masterMuted)}
              className={cn('w-10 h-7 rounded text-[9px] font-bold uppercase tracking-wide transition-colors',
                masterMuted ? 'bg-red-600 text-white' : 'bg-white/10 text-white/50 hover:bg-white/20')}>
              {masterMuted ? 'MUTE' : 'M'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
