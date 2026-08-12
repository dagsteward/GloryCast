import { useEffect, useRef, useState } from 'react'
import { Mic, RotateCcw, Volume2, VolumeX, Headphones, AlertTriangle } from 'lucide-react'
import { getAudioMixer } from '../hooks/useAudioMixer'
import { useMediaEngine, getStream } from '../hooks/useMediaEngine'
import { cn } from '../lib/utils'

// ─────────────────────────────────────────────────────────────────────────────
// Audio Mixer — the full desk.
//
// Production carries a compact strip for quick level rides mid-service. This
// is the page you open to actually set a service up: per-channel EQ, pan,
// mute/solo and metering, with the master bus that feeds the encoder.
//
// Everything here drives the real Web Audio graph in packages/media-engine —
// there is no simulated state. If a fader moves, the audio changes.
// ─────────────────────────────────────────────────────────────────────────────

interface Strip {
  id: string
  label: string
  gain: number
  muted: boolean
  soloed: boolean
  pan: number
  eq: { low: number; mid: number; high: number }
}

const dbLabel = (gain: number) =>
  gain <= 0.001 ? '-∞' : `${(20 * Math.log10(gain)).toFixed(1)}`

function EqKnob({ label, value, onChange }: {
  label: string; value: number; onChange: (v: number) => void
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <input
        type="range" min={-12} max={12} step={0.5} value={value}
        onChange={e => onChange(+e.target.value)}
        className="w-full accent-purple-500"
      />
      <div className="flex items-baseline gap-1">
        <span className="text-[9px] uppercase tracking-wider text-white/40">{label}</span>
        <span className={cn('text-[9px] font-mono tabular-nums',
          value === 0 ? 'text-white/30' : value > 0 ? 'text-emerald-400' : 'text-amber-400')}>
          {value > 0 ? `+${value}` : value}
        </span>
      </div>
    </div>
  )
}

export function AudioMixerPage() {
  const sources = useMediaEngine(s => s.sources)
  const [strips, setStrips] = useState<Strip[]>([])
  const [masterGain, setMasterGain] = useState(1)
  const [levels, setLevels] = useState<Record<string, number>>({})
  const [running, setRunning] = useState(false)
  const rafRef = useRef(0)

  // Register every source that carries audio, then mirror the engine's state.
  useEffect(() => {
    const mixer = getAudioMixer()
    if (!mixer) return

    for (const source of sources) {
      const stream = getStream(source.id)
      if (stream && !mixer.hasChannel(source.id)) {
        mixer.addChannel(source.id, source.label, stream)
      }
    }
    setStrips(mixer.getChannels().map(c => ({ ...c })))
    setRunning(mixer.running)
  }, [sources])

  // Meter poll. rAF rather than an interval so it pauses when the page is not
  // visible instead of burning cycles behind another view.
  useEffect(() => {
    const tick = () => {
      const mixer = getAudioMixer()
      if (mixer) {
        // Peak rather than RMS: on a live desk the operator is watching for
        // the transient that clips, which RMS smooths away.
        const next: Record<string, number> = {}
        for (const [id, l] of Object.entries(mixer.readLevels())) next[id] = l.peak
        next.__master = mixer.readMasterLevels().peak
        setLevels(next)
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  const update = (id: string, patch: Partial<Strip>) =>
    setStrips(s => s.map(x => (x.id === id ? { ...x, ...patch } : x)))

  const mixer = getAudioMixer()

  const setGain = (id: string, gain: number) => { mixer?.setGain(id, gain); update(id, { gain }) }
  const setPan  = (id: string, pan: number)  => { mixer?.setPan(id, pan);  update(id, { pan }) }
  const setEq   = (id: string, band: 'low' | 'mid' | 'high', db: number) => {
    mixer?.setEq(id, band, db)
    setStrips(s => s.map(x => (x.id === id ? { ...x, eq: { ...x.eq, [band]: db } } : x)))
  }
  const toggleMute = (id: string, muted: boolean) => { mixer?.setMuted(id, muted); update(id, { muted }) }
  const toggleSolo = (id: string, soloed: boolean) => { mixer?.setSoloed(id, soloed); update(id, { soloed }) }
  const resetStrip = (id: string) => {
    mixer?.resetChannel(id)
    update(id, { pan: 0, eq: { low: 0, mid: 0, high: 0 } })
  }

  return (
    <div className="w-full h-full overflow-y-auto p-6 text-white/90">
      <div className="max-w-6xl mx-auto space-y-5">

        <div className="flex items-end justify-between gap-6">
          <div>
            <h1 className="text-xl font-bold text-white/90">Audio Mixer</h1>
            <p className="text-[13px] text-white/45 mt-1 max-w-xl leading-relaxed">
              Per-channel EQ, pan and level feeding the master bus that goes to the
              encoder. Changes are live — this is the real audio graph, not a preview.
            </p>
          </div>
          {!running && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/25 shrink-0">
              <AlertTriangle size={13} className="text-amber-400" />
              <span className="text-[11.5px] text-amber-300">
                Audio is suspended until you interact — click any fader.
              </span>
            </div>
          )}
        </div>

        {strips.length === 0 ? (
          <div className="rounded-xl bg-chrome border border-white/[0.06] p-10 text-center">
            <Mic size={26} className="mx-auto mb-3 text-white/20" />
            <p className="text-[13px] text-white/45">No audio sources yet.</p>
            <p className="text-[12px] text-white/30 mt-1">
              Add a camera or microphone on the Production page and its channel appears here.
            </p>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {strips.map(strip => (
              <div key={strip.id}
                className="shrink-0 w-[150px] rounded-xl bg-chrome border border-white/[0.06] p-3 flex flex-col gap-3">

                <div className="min-w-0">
                  <div title={strip.label} className="text-[12px] font-semibold text-white/85 truncate">
                    {strip.label}
                  </div>
                  <div className="text-[9.5px] text-white/35">Input</div>
                </div>

                <div className="space-y-2 pb-2 border-b border-white/[0.06]">
                  <EqKnob label="Hi"  value={strip.eq.high} onChange={v => setEq(strip.id, 'high', v)} />
                  <EqKnob label="Mid" value={strip.eq.mid}  onChange={v => setEq(strip.id, 'mid', v)} />
                  <EqKnob label="Low" value={strip.eq.low}  onChange={v => setEq(strip.id, 'low', v)} />
                </div>

                <div className="flex flex-col items-center gap-1">
                  <input
                    type="range" min={-1} max={1} step={0.05} value={strip.pan}
                    onChange={e => setPan(strip.id, +e.target.value)}
                    className="w-full accent-cyan-500"
                  />
                  <span className="text-[9px] uppercase tracking-wider text-white/40">
                    {strip.pan === 0 ? 'Centre' : strip.pan < 0 ? `L${Math.round(-strip.pan * 100)}` : `R${Math.round(strip.pan * 100)}`}
                  </span>
                </div>

                {/* Fader + meter */}
                <div className="flex items-end justify-center gap-2 h-36">
                  <input
                    type="range" min={0} max={2} step={0.01} value={strip.gain}
                    onChange={e => setGain(strip.id, +e.target.value)}
                    style={{ writingMode: 'vertical-lr', direction: 'rtl', width: '18px', height: '144px' }}
                    className="accent-emerald-500"
                  />
                  <div className="w-2.5 h-full rounded-sm bg-well overflow-hidden flex flex-col-reverse">
                    <div
                      className="w-full bg-gradient-to-t from-emerald-500 via-yellow-400 to-red-500 transition-[height] duration-75"
                      style={{ height: `${Math.min(100, (levels[strip.id] ?? 0) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="text-center text-[10px] font-mono tabular-nums text-white/55">
                  {dbLabel(strip.gain)} dB
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleMute(strip.id, !strip.muted)}
                    className={cn('flex-1 py-1.5 rounded-md text-[10px] font-bold transition-colors',
                      strip.muted ? 'bg-red-600 text-white' : 'bg-white/[0.06] text-white/60 hover:bg-white/[0.12]')}
                  >{strip.muted ? <VolumeX size={11} className="mx-auto" /> : <Volume2 size={11} className="mx-auto" />}</button>
                  <button
                    onClick={() => toggleSolo(strip.id, !strip.soloed)}
                    className={cn('flex-1 py-1.5 rounded-md text-[10px] font-bold transition-colors',
                      strip.soloed ? 'bg-yellow-500 text-black' : 'bg-white/[0.06] text-white/60 hover:bg-white/[0.12]')}
                  ><Headphones size={11} className="mx-auto" /></button>
                  <button
                    onClick={() => resetStrip(strip.id)}
                    title="Flatten EQ and centre pan"
                    className="flex-1 py-1.5 rounded-md bg-white/[0.06] text-white/50 hover:bg-white/[0.12] transition-colors"
                  ><RotateCcw size={11} className="mx-auto" /></button>
                </div>
              </div>
            ))}

            {/* Master */}
            <div className="shrink-0 w-[150px] rounded-xl bg-purple-600/10 border border-purple-500/25 p-3 flex flex-col gap-3">
              <div>
                <div className="text-[12px] font-semibold text-purple-200">Master</div>
                <div className="text-[9.5px] text-purple-300/60">To encoder</div>
              </div>

              <p className="text-[9.5px] text-white/35 leading-relaxed border-b border-white/[0.06] pb-2">
                A limiter sits on this bus to stop the stream clipping on a sudden peak.
              </p>

              <div className="flex items-end justify-center gap-2 h-36 mt-auto">
                <input
                  type="range" min={0} max={2} step={0.01} value={masterGain}
                  onChange={e => { const v = +e.target.value; mixer?.setMasterGain(v); setMasterGain(v) }}
                  style={{ writingMode: 'vertical-lr', direction: 'rtl', width: '18px', height: '144px' }}
                  className="accent-purple-500"
                />
                <div className="w-2.5 h-full rounded-sm bg-well overflow-hidden flex flex-col-reverse">
                  <div
                    className="w-full bg-gradient-to-t from-purple-500 via-yellow-400 to-red-500 transition-[height] duration-75"
                    style={{ height: `${Math.min(100, (levels.__master ?? 0) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="text-center text-[10px] font-mono tabular-nums text-purple-200/80">
                {dbLabel(masterGain)} dB
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
