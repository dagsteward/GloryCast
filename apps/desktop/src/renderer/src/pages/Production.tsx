import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Radio, Wifi, Cpu, Activity, Scissors, TrendingDown,
  Move, Maximize2, ExternalLink, BookOpen, ChevronLeft,
  ChevronRight, Eye, Users, Clock, Zap,
} from 'lucide-react'
import { useMediaEngine, getStream } from '../hooks/useMediaEngine'
import { AudioMixer } from '../components/production/AudioMixer'
import { StreamControls } from '../components/production/StreamControls'
import { SourceGrid } from '../components/production/SourceGrid'
import { cn } from '../lib/utils'

// ─── VideoPanel ───────────────────────────────────────────────────────────────
// Renders a live MediaStream into a <video> element.

function VideoPanel({
  sourceId,
  variant,
  className,
}: {
  sourceId: string | null
  variant: 'program' | 'preview'
  className?: string
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const stream   = getStream(sourceId)

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    if (stream) { el.srcObject = stream; el.play().catch(() => {}) }
    else el.srcObject = null
    return () => { if (el) el.srcObject = null }
  }, [sourceId, stream])

  return (
    <div className={cn(
      'relative w-full h-full rounded-xl overflow-hidden border-2 bg-black flex items-center justify-center',
      variant === 'program'
        ? 'border-red-500/80 shadow-[0_0_24px_rgba(239,68,68,0.22)]'
        : 'border-emerald-500/70 shadow-[0_0_18px_rgba(16,185,129,0.18)]',
      className,
    )}>
      {stream ? (
        <video
          ref={videoRef}
          autoPlay muted playsInline
          className="w-full h-full object-contain"
        />
      ) : (
        <div className="flex flex-col items-center gap-3 opacity-20">
          <Radio size={36} className={variant === 'program' ? 'text-red-400' : 'text-emerald-400'} />
          <p className="text-[11px] text-white/60">No source selected</p>
        </div>
      )}
    </div>
  )
}

// ─── StatusBar ────────────────────────────────────────────────────────────────

function StatusBar() {
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef(Date.now())

  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000)
    return () => clearInterval(id)
  }, [])

  const h = String(Math.floor(elapsed / 3600)).padStart(2, '0')
  const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0')
  const s = String(elapsed % 60).padStart(2, '0')

  return (
    <div className="flex items-center gap-4 px-4 border-b border-white/[0.06] bg-[#0a0a14] shrink-0" style={{ height: '34px' }}>
      {/* Live indicator */}
      <div className="flex items-center gap-1.5 text-red-400">
        <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
        <span className="text-[11px] font-bold tracking-wider">LIVE</span>
      </div>

      {/* Timer */}
      <div className="flex items-center gap-1 text-white/40">
        <Clock size={10} />
        <span className="text-[11px] font-mono text-white/60">{h}:{m}:{s}</span>
      </div>

      <div className="h-3 w-px bg-white/10" />

      {/* Stats */}
      <div className="flex items-center gap-3 text-[10px] font-mono text-white/35">
        <span className="flex items-center gap-1"><Zap size={9} className="text-yellow-400/60" />30 fps</span>
        <span className="flex items-center gap-1"><Cpu size={9} className="text-blue-400/60" />CPU 18%</span>
        <span className="flex items-center gap-1"><Wifi size={9} className="text-emerald-400/60" />↑ 6.2 Mbps</span>
        <span className="flex items-center gap-1"><Users size={9} className="text-purple-400/60" />1,284 viewers</span>
      </div>

      <div className="flex-1" />

      <StreamControls compact />
    </div>
  )
}

// ─── ProgramVUBars ────────────────────────────────────────────────────────────
// Left-side VU bar column on PROGRAM monitor.

function ProgramVUBars({ level }: { level: number }) {
  const bars = [0.9, 0.7, 0.5, 0.3].map((weight, i) => {
    const pct = Math.min(100, level * weight + Math.sin(Date.now() / 200 + i) * 3)
    return pct
  })

  return (
    <div className="absolute left-1.5 top-1/2 -translate-y-1/2 flex flex-col gap-0.5" style={{ width: '6px' }}>
      {bars.map((pct, i) => (
        <div key={i} className="relative bg-white/[0.06] rounded-full overflow-hidden" style={{ width: '6px', height: '30px' }}>
          <div
            className={cn('absolute bottom-0 w-full rounded-full transition-all duration-100',
              pct > 85 ? 'bg-red-500' : pct > 70 ? 'bg-yellow-400' : 'bg-emerald-400')}
            style={{ height: `${pct}%` }}
          />
        </div>
      ))}
    </div>
  )
}

// ─── TransitionPanel ─────────────────────────────────────────────────────────

type TransitionType = 'cut' | 'fade' | 'wipe' | 'move'

const TRANSITION_ICONS: Record<TransitionType, React.ReactNode> = {
  cut:  <Scissors size={10} />,
  fade: <TrendingDown size={10} />,
  wipe: <Maximize2 size={10} />,
  move: <Move size={10} />,
}

function TransitionPanel() {
  const { previewId, cutToProgram } = useMediaEngine()
  const [type,     setType]     = useState<TransitionType>('cut')
  const [duration, setDuration] = useState(1.0)
  const [fading,   setFading]   = useState(false)

  function handleTake() {
    if (!previewId) return
    if (type === 'cut') {
      cutToProgram()
    } else {
      setFading(true)
      setTimeout(() => { cutToProgram(); setFading(false) }, duration * 1000)
    }
  }

  return (
    <div className="shrink-0 bg-[#09090f] rounded-xl border border-white/[0.06] p-2 flex flex-col gap-2">
      {/* Transition type */}
      <div className="flex gap-1">
        {(['cut', 'fade', 'wipe', 'move'] as TransitionType[]).map(t => (
          <button key={t} onClick={() => setType(t)}
            className={cn(
              'flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-[9px] font-semibold uppercase tracking-wide transition-colors',
              type === t
                ? 'bg-white/12 text-white/90 border border-white/15'
                : 'text-white/25 hover:text-white/55 hover:bg-white/[0.04]',
            )}>
            {TRANSITION_ICONS[t]}
            {t}
          </button>
        ))}
      </div>

      {/* Duration */}
      {type !== 'cut' && (
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-white/30 shrink-0">Dur</span>
          <input
            type="range" min={0.2} max={3.0} step={0.1} value={duration}
            onChange={e => setDuration(Number(e.target.value))}
            className="flex-1 accent-purple-500" style={{ height: '2px' }}
          />
          <span className="text-[9px] font-mono text-white/50 w-8 text-right">
            {duration.toFixed(1)}s
          </span>
        </div>
      )}

      {/* TAKE button */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleTake}
        disabled={!previewId || fading}
        className={cn(
          'w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all',
          previewId && !fading
            ? 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.35)]'
            : 'bg-white/[0.05] text-white/20 cursor-not-allowed',
        )}>
        {fading ? 'TRANSITIONING…' : type === 'cut' ? '✂ CUT TO AIR' : `⟶ ${type.toUpperCase()} TO AIR`}
      </motion.button>
    </div>
  )
}

// ─── AI Assistant panel ───────────────────────────────────────────────────────

const MOCK_SCRIPTURES = [
  { ref: 'Romans 8:28',       confidence: 97, time: '0:41' },
  { ref: 'John 3:16',         confidence: 94, time: '0:38' },
  { ref: 'Psalm 23:1',        confidence: 89, time: '0:35' },
  { ref: 'Philippians 4:13',  confidence: 82, time: '0:28' },
]

function AIPanel({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <div className={cn(
      'flex flex-col shrink-0 border-l border-white/[0.05] bg-[#08080e] transition-all duration-300',
      collapsed ? 'w-8' : 'w-52',
    )}>
      {/* Toggle bar */}
      <button
        onClick={onToggle}
        className="flex items-center justify-center border-b border-white/[0.05] text-white/25 hover:text-white/60 transition-colors shrink-0"
        style={{ height: '34px' }}>
        {collapsed
          ? <ChevronRight size={12} />
          : <div className="flex items-center gap-1.5 w-full px-3"><BookOpen size={10} /><span className="text-[9px] uppercase tracking-wider font-semibold text-white/40 flex-1">AI Assistant</span><ChevronLeft size={10} /></div>}
      </button>

      {!collapsed && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Scripture detection */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
            <div className="flex items-center gap-1 mb-2">
              <Activity size={9} className="text-emerald-400 animate-pulse" />
              <span className="text-[8px] text-emerald-400 font-semibold uppercase tracking-wide">Listening…</span>
            </div>

            {MOCK_SCRIPTURES.map((s, i) => (
              <div key={s.ref}
                className={cn(
                  'p-2 rounded-lg border transition-all cursor-pointer hover:border-purple-500/30',
                  i === 0
                    ? 'border-purple-500/40 bg-purple-500/8'
                    : 'border-white/[0.05] bg-white/[0.02] opacity-50',
                )}>
                <div className="flex items-start justify-between gap-1 mb-1">
                  <span className={cn('text-[10px] font-semibold', i === 0 ? 'text-white/90' : 'text-white/40')}>
                    {s.ref}
                  </span>
                  <span className="text-[8px] text-white/25 font-mono shrink-0">{s.time}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full', i === 0 ? 'bg-purple-500' : 'bg-white/20')}
                      style={{ width: `${s.confidence}%` }}
                    />
                  </div>
                  <span className="text-[8px] font-mono text-white/30">{s.confidence}%</span>
                </div>
              </div>
            ))}
          </div>

          {/* Divider + Stage display */}
          <div className="border-t border-white/[0.05] p-2.5 shrink-0">
            <div className="flex items-center gap-1 mb-2">
              <Eye size={9} className="text-blue-400" />
              <span className="text-[8px] text-white/40 uppercase tracking-wide font-semibold">Stage Display</span>
            </div>
            <div className="rounded-lg bg-white/[0.03] border border-white/[0.05] p-2 text-center">
              <p className="text-[9px] text-white/25 mb-1">Now on air</p>
              <p className="text-[10px] text-white/60 font-medium leading-snug">Romans 8:28</p>
              <p className="text-[8px] text-white/30 mt-0.5 italic">NIV</p>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1">
              {[
                { label: 'Viewers', value: '1,284', color: 'text-purple-400' },
                { label: 'Duration', value: '00:42', color: 'text-emerald-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded bg-white/[0.03] p-1.5 text-center">
                  <p className={cn('text-[11px] font-mono font-semibold', color)}>{value}</p>
                  <p className="text-[8px] text-white/25">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── MultiView grid (8-cell) ──────────────────────────────────────────────────

function MultiViewGrid() {
  const { sources, programId, previewId } = useMediaEngine()

  // Up to 8 cells, padded with empties
  const cells = [...sources.slice(0, 8), ...Array(Math.max(0, 8 - sources.length)).fill(null)]

  return (
    <div className="flex flex-col bg-[#07070e] border-l border-white/[0.05]" style={{ width: '268px' }}>
      <div className="px-3 border-b border-white/[0.05] flex items-center" style={{ height: '26px' }}>
        <span className="text-[9px] font-semibold text-white/30 uppercase tracking-widest">Multi-View</span>
      </div>
      <div className="flex-1 grid grid-cols-4 grid-rows-2 gap-0.5 p-0.5">
        {cells.map((src, i) => {
          if (!src) return (
            <div key={`empty-${i}`} className="rounded bg-black/50 border border-white/[0.04] flex items-center justify-center">
              <span className="text-[7px] text-white/10">{i + 1}</span>
            </div>
          )
          return <MultiViewCell key={src.id} sourceId={src.id} label={src.label} index={i}
            isProgram={src.id === programId} isPreview={src.id === previewId} />
        })}
      </div>
    </div>
  )
}

function MultiViewCell({ sourceId, label, index, isProgram, isPreview }: {
  sourceId: string; label: string; index: number; isProgram: boolean; isPreview: boolean
}) {
  const ref    = useRef<HTMLVideoElement>(null)
  const stream = getStream(sourceId)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (stream) { el.srcObject = stream; el.play().catch(() => {}) }
    else el.srcObject = null
    return () => { if (el) el.srcObject = null }
  }, [sourceId, stream])

  return (
    <div className={cn(
      'relative rounded overflow-hidden border cursor-pointer bg-black',
      isProgram ? 'border-red-500/70' :
      isPreview  ? 'border-emerald-500/70' :
                   'border-white/[0.06] hover:border-white/20',
    )}>
      {stream
        ? <video ref={ref} autoPlay muted playsInline className="w-full h-full object-cover" />
        : <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
            <span className="text-[7px] text-white/15 text-center px-0.5 leading-tight">{label}</span>
          </div>}

      <div className="absolute top-0.5 left-0.5 text-[6px] font-bold text-white/30 bg-black/50 rounded px-0.5">
        {index + 1}
      </div>

      {isProgram && (
        <div className="absolute bottom-0 left-0 right-0 h-3 bg-red-500/70 flex items-center justify-center">
          <span className="text-[6px] font-bold text-white tracking-widest">PGM</span>
        </div>
      )}
      {isPreview && !isProgram && (
        <div className="absolute bottom-0 left-0 right-0 h-3 bg-emerald-500/70 flex items-center justify-center">
          <span className="text-[6px] font-bold text-white tracking-widest">PVW</span>
        </div>
      )}
    </div>
  )
}

// ─── Output window launcher ───────────────────────────────────────────────────

function openOutputWindow(sourceId: string | null) {
  if (!sourceId) return
  const stream = getStream(sourceId)
  if (!stream) return

  const win = window.open('', '_blank', 'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no')
  if (!win) return

  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>GloryCast — PROGRAM OUTPUT</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:#000; width:100vw; height:100vh; display:flex; align-items:center; justify-content:center; }
    video { width:100%; height:100%; object-fit:contain; }
    .badge { position:fixed; top:10px; left:10px; background:#ef4444; color:#fff;
             font-family:monospace; font-size:11px; font-weight:bold; padding:3px 8px;
             border-radius:4px; letter-spacing:.1em; }
  </style>
</head>
<body>
  <video id="v" autoplay muted playsinline></video>
  <div class="badge">● PROGRAM</div>
</body>
</html>`)
  win.document.close()

  const attach = () => {
    const v = win.document.getElementById('v') as HTMLVideoElement | null
    if (v) { v.srcObject = stream; v.play().catch(() => {}) }
  }
  win.onload = attach
  setTimeout(attach, 300)
}

// ─── ProductionPage ────────────────────────────────────────────────────────────

export function ProductionPage() {
  const { sources, previewId, programId, assignToPreview, assignToProgram, cutToProgram } = useMediaEngine()
  const [aiCollapsed, setAiCollapsed] = useState(false)

  // Simulated master level for program VU bars (bounces with activity)
  const [pgmLevel, setPgmLevel] = useState(0)
  useEffect(() => {
    let frame = 0
    const id = setInterval(() => {
      frame++
      if (programId) {
        setPgmLevel(60 + Math.sin(frame * 0.3) * 25 + Math.random() * 10)
      } else {
        setPgmLevel(0)
      }
    }, 80)
    return () => clearInterval(id)
  }, [programId])

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#06060c]">
      {/* ── Status bar ───────────────────────────────────────────────────── */}
      <StatusBar />

      {/* ── Main area ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex min-h-0 overflow-hidden">

        {/* PROGRAM + PREVIEW monitors */}
        <div className="flex-1 flex gap-2 p-2 min-w-0 min-h-0">

          {/* PROGRAM monitor (left, larger) */}
          <div className="flex-[3] relative min-w-0 flex flex-col gap-0">
            <div className="flex-1 relative">
              <VideoPanel sourceId={programId} variant="program" className="h-full" />

              {/* LIVE badge */}
              <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2 py-1 rounded bg-red-500 text-[10px] font-bold text-white tracking-widest z-10">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                PROGRAM
              </div>

              {/* Viewer count */}
              <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-1 rounded bg-black/60 text-[10px] font-mono text-white/70 z-10">
                <Users size={9} />
                1,284
              </div>

              {/* Side VU bars */}
              <ProgramVUBars level={pgmLevel} />

              {/* Full output button */}
              <button
                onClick={() => openOutputWindow(programId)}
                disabled={!programId}
                className="absolute bottom-2.5 right-2.5 flex items-center gap-1 px-2 py-1 rounded bg-black/60 hover:bg-black/80 text-white/50 hover:text-white/80 text-[9px] transition-all disabled:opacity-20 z-10">
                <ExternalLink size={9} /> Full Output
              </button>

              {/* Source name */}
              <div className="absolute bottom-2.5 left-2.5 text-[9px] font-mono text-white/30 z-10">
                {programId ? sources.find(s => s.id === programId)?.label ?? programId : '—'}
              </div>
            </div>
          </div>

          {/* PREVIEW + transitions (right column) */}
          <div className="flex-[2] flex flex-col gap-2 min-w-0">
            {/* PREVIEW monitor (top of right column) */}
            <div className="flex-1 relative">
              <VideoPanel sourceId={previewId} variant="preview" className="h-full" />

              {/* PREVIEW badge */}
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-emerald-500 text-[9px] font-bold text-white tracking-widest z-10">
                PREVIEW
              </div>

              {/* Source name */}
              <div className="absolute bottom-2 left-2 text-[9px] font-mono text-white/30 z-10">
                {previewId ? sources.find(s => s.id === previewId)?.label ?? previewId : '—'}
              </div>
            </div>

            {/* Transition controls */}
            <TransitionPanel />
          </div>
        </div>

        {/* AI Assistant + Stage Display (collapsible right panel) */}
        <AIPanel collapsed={aiCollapsed} onToggle={() => setAiCollapsed(v => !v)} />
      </div>

      {/* ── Source grid (tabbed) ──────────────────────────────────────────── */}
      <SourceGrid />

      {/* ── Bottom bar: Audio Mixer + MultiView ──────────────────────────── */}
      <div className="shrink-0 flex border-t border-white/[0.05]" style={{ height: '186px' }}>
        <div className="flex-1 min-w-0 overflow-hidden">
          <AudioMixer compact />
        </div>
        <MultiViewGrid />
      </div>
    </div>
  )
}
