import { useState, useEffect, useRef, useCallback } from 'react'
import { Mic2, MicOff, Activity } from 'lucide-react'
import { useMediaEngine, getStream } from '../../hooks/useMediaEngine'
import { cn } from '../../lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AudioChannel {
  id: string
  name: string
  type: 'mic' | 'source' | 'line' | 'mix'
  sourceId?: string
  level: number
  muted: boolean
  solo: boolean
  pan: number
  eq: { low: number; mid: number; high: number }
  peakLevel: number
  realLevel?: number
  isLive?: boolean
}

// ─── Static channels (always present) ────────────────────────────────────────

const STATIC_CHANNELS: AudioChannel[] = [
  { id: 'live-mic',  name: 'Live Mic',   type: 'mic',  level: 80, muted: false, solo: false, pan: 0,   eq: { low: 0,  mid: 0, high: 0 },  peakLevel: 0,  isLive: true },
  { id: 'music-bg',  name: 'Music/BG',   type: 'line', level: 55, muted: false, solo: false, pan: 0,   eq: { low: 2,  mid: 0, high: 0 },  peakLevel: 52 },
  { id: 'sfx',       name: 'SFX',        type: 'line', level: 45, muted: false, solo: false, pan: 0,   eq: { low: 0,  mid: 0, high: 0 },  peakLevel: 43 },
  { id: 'web-zoom',  name: 'Zoom/Web',   type: 'line', level: 65, muted: false, solo: false, pan: 0,   eq: { low: -1, mid: 0, high: 2 },  peakLevel: 60 },
  { id: 'teams',     name: 'Teams',      type: 'line', level: 50, muted: false, solo: false, pan: 0,   eq: { low: -1, mid: 0, high: 1 },  peakLevel: 48 },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function VUMeter({ level, peak, isLive, compact }: {
  level: number; peak: number; isLive?: boolean; compact?: boolean
}) {
  const pct     = Math.min(100, Math.max(0, level))
  const peakPct = Math.min(100, Math.max(0, peak))
  const h       = compact ? 54 : 76

  const barColor =
    pct > 85 ? 'bg-red-500' :
    pct > 70 ? 'bg-yellow-400' :
    isLive   ? 'bg-emerald-400' :
               'bg-blue-400'

  return (
    <div className="relative bg-white/[0.05] rounded-full overflow-hidden"
      style={{ width: '10px', height: `${h}px` }}>
      <div
        className={cn('absolute bottom-0 w-full rounded-full transition-all duration-75', barColor)}
        style={{ height: `${pct}%` }}
      />
      <div className="absolute w-full h-px bg-white/60" style={{ bottom: `${peakPct}%` }} />
      {isLive && pct > 2 && (
        <div className="absolute top-1 left-0 right-0 mx-auto w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"
          style={{ width: '6px', margin: '0 auto' }} />
      )}
    </div>
  )
}

// ─── Vertical Fader ───────────────────────────────────────────────────────────

function VerticalFader({ value, onChange, compact, color = 'white' }: {
  value: number; onChange: (v: number) => void; compact?: boolean; color?: string
}) {
  const h = compact ? 54 : 76
  return (
    <input
      type="range" min={0} max={100} value={value}
      onChange={e => onChange(Number(e.target.value))}
      className="cursor-pointer"
      style={{
        writingMode: 'vertical-lr' as const,
        direction:   'rtl' as const,
        appearance:  'slider-vertical',
        width:  '18px',
        height: `${h}px`,
        accentColor: color === 'purple' ? '#7c3aed' : '#fff',
      }}
    />
  )
}

// ─── EQ Knob ─────────────────────────────────────────────────────────────────

function EQKnob({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const deg = (value / 12) * 135
  return (
    <div
      className="w-4 h-4 rounded-full bg-white/10 border border-white/20 cursor-ns-resize relative flex items-center justify-center"
      title={`${value > 0 ? '+' : ''}${value} dB`}
      onPointerDown={e => {
        e.currentTarget.setPointerCapture(e.pointerId)
        const startY = e.clientY; const startV = value
        const move = (me: PointerEvent) => onChange(Math.max(-12, Math.min(12, startV + Math.round((startY - me.clientY) / 5))))
        const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
        window.addEventListener('pointermove', move)
        window.addEventListener('pointerup', up)
      }}
    >
      <div
        className="w-0.5 h-1.5 bg-white/60 rounded-full absolute"
        style={{ bottom: '3px', transform: `rotate(${deg}deg)`, transformOrigin: 'bottom center' }}
      />
    </div>
  )
}

// ─── Channel Strip ────────────────────────────────────────────────────────────

function ChannelStrip({ channel, onUpdate, compact }: {
  channel: AudioChannel
  onUpdate: (u: Partial<AudioChannel>) => void
  compact?: boolean
}) {
  const typeColor = {
    mic:    'text-purple-400',
    source: 'text-emerald-400',
    line:   'text-blue-400',
    mix:    'text-amber-400',
  }[channel.type]

  const displayLevel =
    channel.muted ? 0 :
    channel.isLive && channel.realLevel !== undefined
      ? channel.realLevel * (channel.level / 100)
      : channel.level

  return (
    <div className={cn(
      'flex flex-col items-center border-r border-white/[0.05] py-2 px-2 min-w-[58px] transition-colors',
      channel.solo   && 'bg-yellow-500/5',
      channel.isLive && 'bg-emerald-500/[0.03]',
    )}>
      {/* Name + type */}
      <span className="text-[8px] text-white/50 mb-0.5 text-center truncate w-full leading-tight">{channel.name}</span>
      <span className={cn('text-[7px] uppercase tracking-wide mb-1', typeColor)}>
        {channel.isLive ? '● LIVE' : channel.type}
      </span>

      {/* EQ — hidden in compact mode */}
      {!compact && (
        <div className="flex flex-col gap-0.5 mb-1.5">
          {(['high', 'mid', 'low'] as const).map(band => (
            <div key={band} className="flex items-center gap-1">
              <span className="text-[7px] text-white/25 w-3 text-right uppercase">{band[0]}</span>
              <EQKnob value={channel.eq[band]} onChange={v => onUpdate({ eq: { ...channel.eq, [band]: v } })} />
            </div>
          ))}
        </div>
      )}

      {/* Pan */}
      <input type="range" min={-100} max={100} value={channel.pan}
        onChange={e => onUpdate({ pan: Number(e.target.value) })}
        className="w-full mb-1.5 accent-blue-500" style={{ height: '2px' }} />

      {/* VU + fader */}
      <div className="flex gap-1 items-end">
        <VUMeter level={displayLevel} peak={channel.peakLevel} isLive={channel.isLive} compact={compact} />
        <VerticalFader value={channel.level} onChange={v => onUpdate({ level: v })} compact={compact} />
      </div>

      {/* dB readout */}
      <div className="text-[8px] font-mono text-white/35 mt-0.5 mb-1">
        {channel.level === 0 ? '-∞' : `${((channel.level - 100) / 100 * 60).toFixed(1)}`}
      </div>

      {/* M / S */}
      <div className="flex gap-0.5">
        <button
          onClick={() => onUpdate({ muted: !channel.muted })}
          className={cn('px-1.5 py-0.5 rounded text-[8px] font-bold uppercase transition-colors',
            channel.muted ? 'bg-red-600 text-white' : 'bg-white/10 text-white/40 hover:bg-white/20')}>
          M
        </button>
        <button
          onClick={() => onUpdate({ solo: !channel.solo })}
          className={cn('px-1.5 py-0.5 rounded text-[8px] font-bold uppercase transition-colors',
            channel.solo ? 'bg-yellow-500 text-black' : 'bg-white/10 text-white/40 hover:bg-white/20')}>
          S
        </button>
      </div>
    </div>
  )
}

// ─── AudioMixer ───────────────────────────────────────────────────────────────

export function AudioMixer({ compact }: { compact?: boolean }) {
  const { sources } = useMediaEngine()

  const [channels,    setChannels]    = useState<AudioChannel[]>(STATIC_CHANNELS)
  const [masterLevel, setMasterLevel] = useState(85)
  const [masterMuted, setMasterMuted] = useState(false)
  const [micStatus,   setMicStatus]   = useState<'idle' | 'active' | 'denied'>('idle')

  const audioCtxRef  = useRef<AudioContext | null>(null)
  const micAnalyser  = useRef<AnalyserNode | null>(null)
  const srcAnalysers = useRef<Map<string, AnalyserNode>>(new Map())
  const rafRef       = useRef<number>(0)

  // ── Create a shared AudioContext on mount ──────────────────────────────────
  useEffect(() => {
    const ctx = new AudioContext()
    audioCtxRef.current = ctx
    return () => { ctx.close(); audioCtxRef.current = null }
  }, [])

  // ── Mic monitoring ─────────────────────────────────────────────────────────
  const startMicMonitor = useCallback(async () => {
    if (micAnalyser.current) return
    const ctx = audioCtxRef.current
    if (!ctx) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      const src = ctx.createMediaStreamSource(stream)
      const an  = ctx.createAnalyser()
      an.fftSize = 1024
      src.connect(an)
      micAnalyser.current = an
      setMicStatus('active')
    } catch {
      setMicStatus('denied')
    }
  }, [])

  // ── Sync source-linked channels when sources change ────────────────────────
  useEffect(() => {
    const ctx = audioCtxRef.current
    const audioSources = sources.filter(s => s.hasAudio)
    const activeIds    = new Set(audioSources.map(s => s.id))

    // Remove stale analysers
    for (const [id] of srcAnalysers.current) {
      if (!activeIds.has(id)) srcAnalysers.current.delete(id)
    }

    // Add analysers for new audio sources
    if (ctx) {
      for (const src of audioSources) {
        if (srcAnalysers.current.has(src.id)) continue
        const stream = getStream(src.id)
        if (!stream || stream.getAudioTracks().length === 0) continue
        try {
          const mediaSrc = ctx.createMediaStreamSource(stream)
          const an       = ctx.createAnalyser()
          an.fftSize = 1024
          mediaSrc.connect(an)
          srcAnalysers.current.set(src.id, an)
        } catch (e) {
          console.warn('[AudioMixer] source analyser:', e)
        }
      }
    }

    // Sync dynamic channels (one per audio source)
    setChannels(prev => {
      const staticChs = prev.filter(ch => !ch.sourceId)
      const dynChs    = audioSources.map(src => {
        const existing = prev.find(ch => ch.sourceId === src.id)
        return existing ?? {
          id:       `src-${src.id}`,
          name:     src.label.slice(0, 9),
          type:     'source' as const,
          sourceId: src.id,
          level:    75,
          muted:    false,
          solo:     false,
          pan:      0,
          eq:       { low: 0, mid: 0, high: 0 },
          peakLevel: 0,
          isLive:   true,
        }
      })
      return [...staticChs, ...dynChs]
    })
  }, [sources])

  // ── RAF loop ───────────────────────────────────────────────────────────────
  useEffect(() => {
    startMicMonitor()

    const tick = () => {
      // Mic level → live-mic channel
      if (micAnalyser.current) {
        const rms = getRms(micAnalyser.current)
        setChannels(chs => chs.map(ch =>
          ch.id === 'live-mic'
            ? { ...ch, realLevel: rms, peakLevel: Math.max(ch.peakLevel * 0.97, rms) }
            : ch
        ))
      }

      // Source audio levels
      for (const [srcId, an] of srcAnalysers.current) {
        const rms = getRms(an)
        setChannels(chs => chs.map(ch =>
          ch.sourceId === srcId
            ? { ...ch, realLevel: rms, peakLevel: Math.max(ch.peakLevel * 0.97, rms) }
            : ch
        ))
      }

      rafRef.current = requestAnimationFrame(tick)
    }
    tick()

    return () => cancelAnimationFrame(rafRef.current)
  }, [startMicMonitor])

  function updateChannel(id: string, u: Partial<AudioChannel>) {
    setChannels(prev => prev.map(ch => ch.id === id ? { ...ch, ...u } : ch))
  }

  const masterDisplay = masterMuted ? 0 : masterLevel

  return (
    <div className="h-full flex flex-col bg-[#07070f]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 border-b border-white/[0.05] shrink-0" style={{ height: '26px' }}>
        <span className="text-[9px] font-semibold text-white/40 uppercase tracking-widest">Audio Mixer</span>
        <div className={cn('flex items-center gap-1 text-[9px]',
          micStatus === 'active' ? 'text-emerald-400' :
          micStatus === 'denied' ? 'text-red-400' :
                                   'text-white/25')}>
          {micStatus === 'active' ? <><Activity size={9} className="animate-pulse" /> Live mic</> :
           micStatus === 'denied' ? <><MicOff size={9} /> Denied</> :
                                    <><Mic2 size={9} /> Waiting…</>}
        </div>
      </div>

      {/* Channel strips */}
      <div className="flex-1 flex overflow-x-auto overflow-y-hidden">
        {channels.map(ch => (
          <ChannelStrip key={ch.id} channel={ch} onUpdate={u => updateChannel(ch.id, u)} compact={compact} />
        ))}

        {/* Master */}
        <div className="flex flex-col items-center border-l border-white/10 bg-white/[0.02] px-3 py-2 min-w-[64px]">
          <span className="text-[8px] text-white/40 uppercase tracking-widest mb-2">Master</span>
          <VUMeter level={masterDisplay} peak={masterDisplay + 2} compact={compact} />
          <div className="flex-1 flex items-center mt-1">
            <VerticalFader
              value={masterLevel}
              onChange={setMasterLevel}
              color="purple"
              compact={compact}
            />
          </div>
          <div className="text-[9px] font-mono text-white/50 mb-1.5">
            {masterLevel === 0 ? '-∞' : `${((masterLevel - 100) / 100 * 60).toFixed(1)}`} dB
          </div>
          <button
            onClick={() => setMasterMuted(m => !m)}
            className={cn('w-9 py-0.5 rounded text-[8px] font-bold uppercase transition-colors',
              masterMuted ? 'bg-red-600 text-white' : 'bg-white/10 text-white/50 hover:bg-white/20')}>
            {masterMuted ? 'MUTE' : 'M'}
          </button>
        </div>
      </div>
    </div>
  )
}
