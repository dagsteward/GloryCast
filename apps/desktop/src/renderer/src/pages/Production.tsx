import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Radio, Wifi, Cpu, Activity, Scissors, TrendingDown,
  Move, Maximize2, ExternalLink, BookOpen, ChevronLeft,
  ChevronRight, Eye, Users, Clock, Zap, Music,
} from 'lucide-react'
import { useMediaEngine, getStream } from '../hooks/useMediaEngine'
import { AudioMixer } from '../components/production/AudioMixer'
import { StreamControls } from '../components/production/StreamControls'
import { SourceGrid } from '../components/production/SourceGrid'
import { CopilotFeed } from '../components/live/CopilotFeed'
import { useServiceStore, type LiveItem } from '../stores/serviceStore'
import { cn } from '../lib/utils'

// ─── GraphicOverlay ─────────────────────────────────────────────────────────
// Renders the live scripture/song graphic (the serviceStore bus) over a monitor.
// Two modes:
//   • lower-third  — composited at the bottom over a live camera feed.
//   • full slide   — when there is no video source behind it, the verse fills
//                    the monitor as a standalone scripture slide so the producer
//                    can display scripture fully without a background.
// In both modes the full verse is shown (never truncated).

function GraphicOverlay({
  item,
  variant,
  fullScreen,
}: {
  item: LiveItem | null
  variant: 'program' | 'preview'
  fullScreen: boolean
}) {
  if (!item || item.kind === 'blank') return null

  const Icon = item.kind === 'song' ? Music : BookOpen
  const iconColor = item.kind === 'song' ? 'text-blue-300' : 'text-purple-300'

  // ── Full scripture slide (no background video) ──
  if (fullScreen) {
    return (
      <div className={cn(
        'absolute inset-0 z-20 flex flex-col items-center justify-center text-center pointer-events-none',
        'px-10 py-10 overflow-hidden',
        variant === 'program'
          ? 'bg-gradient-to-b from-[#0b0214] via-[#13061f] to-black'
          : 'bg-gradient-to-b from-[#06120d] via-[#08160f] to-black',
      )}>
        <div className="flex items-center gap-2 mb-5">
          <Icon size={16} className={cn(iconColor, 'shrink-0')} />
          <span className="text-base font-bold text-white tracking-wide">{item.title}</span>
          {item.subtitle && <span className="text-xs text-white/45">{item.subtitle}</span>}
        </div>
        {item.body && (
          <p className="max-w-3xl w-full text-white/95 text-2xl leading-relaxed font-light max-h-full overflow-y-auto">
            {item.body}
          </p>
        )}
      </div>
    )
  }

  // ── Lower-third over a live camera feed (full verse, never clamped) ──
  return (
    <div className="absolute inset-x-0 bottom-0 z-20 p-3 pointer-events-none">
      <div className={cn(
        'rounded-lg backdrop-blur-md border px-3.5 py-2.5 max-w-[88%] max-h-[60%] overflow-y-auto',
        variant === 'program'
          ? 'bg-black/72 border-red-500/40'
          : 'bg-black/55 border-emerald-500/40',
      )}>
        <div className="flex items-center gap-1.5 mb-1">
          <Icon size={11} className={cn(iconColor, 'shrink-0')} />
          <span className="text-[11px] font-bold text-white tracking-wide truncate">{item.title}</span>
          {item.subtitle && <span className="text-[9px] text-white/45 shrink-0">{item.subtitle}</span>}
        </div>
        {item.body && (
          <p className="text-[12px] text-white/85 leading-snug">{item.body}</p>
        )}
      </div>
    </div>
  )
}

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
  const serviceActive    = useServiceStore(s => s.serviceActive)
  const serviceStartedAt = useServiceStore(s => s.serviceStartedAt)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(serviceStartedAt ? Math.floor((Date.now() - serviceStartedAt) / 1000) : 0)
    }, 1000)
    return () => clearInterval(id)
  }, [serviceStartedAt])

  const h = String(Math.floor(elapsed / 3600)).padStart(2, '0')
  const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0')
  const s = String(elapsed % 60).padStart(2, '0')

  return (
    <div className="flex items-center gap-4 px-4 border-b border-white/[0.06] bg-chrome shrink-0" style={{ height: '34px' }}>
      {/* Live indicator */}
      <div className={cn('flex items-center gap-1.5', serviceActive ? 'text-red-400' : 'text-white/30')}>
        <span className={cn('w-2 h-2 rounded-full', serviceActive ? 'bg-red-400 animate-pulse' : 'bg-white/20')} />
        <span className="text-[11px] font-bold tracking-wider">{serviceActive ? 'LIVE' : 'OFFLINE'}</span>
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
  const gfxPreview = useServiceStore(s => s.preview)
  const takeGraphic = useServiceStore(s => s.take)
  const [type,     setType]     = useState<TransitionType>('cut')
  const [duration, setDuration] = useState(1.0)
  const [fading,   setFading]   = useState(false)

  // A TAKE promotes BOTH layers at once: the video bus (camera) and the
  // graphics bus (scripture/song). Either or both may have something queued.
  const canTake = !!previewId || !!gfxPreview

  function handleTake() {
    if (!canTake) return
    const fire = () => {
      if (previewId)  cutToProgram()  // video layer
      if (gfxPreview) takeGraphic()   // graphics layer
    }
    if (type === 'cut') {
      fire()
    } else {
      setFading(true)
      setTimeout(() => { fire(); setFading(false) }, duration * 1000)
    }
  }

  return (
    <div className="shrink-0 bg-chrome rounded-xl border border-white/[0.06] p-2 flex flex-col gap-2">
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
        disabled={!canTake || fading}
        className={cn(
          'w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all',
          canTake && !fading
            ? 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.35)]'
            : 'bg-white/[0.05] text-white/20 cursor-not-allowed',
        )}>
        {fading ? 'TRANSITIONING…' : type === 'cut' ? '✂ CUT TO AIR' : `⟶ ${type.toUpperCase()} TO AIR`}
      </motion.button>
    </div>
  )
}

// ─── AI Assistant panel (shared Copilot feed + stage readout) ──────────────────

function AIPanel({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const program = useServiceStore(s => s.program)

  return (
    <div className={cn(
      'flex flex-col shrink-0 border-l border-white/[0.05] bg-chrome transition-all duration-300',
      collapsed ? 'w-8' : 'w-64',
    )}>
      {/* Toggle bar */}
      <button
        onClick={onToggle}
        className="flex items-center justify-center border-b border-white/[0.05] text-white/25 hover:text-white/60 transition-colors shrink-0"
        style={{ height: '34px' }}>
        {collapsed
          ? <ChevronRight size={12} />
          : <div className="flex items-center gap-1.5 w-full px-3"><BookOpen size={10} /><span className="text-[9px] uppercase tracking-wider font-semibold text-white/40 flex-1">AI Copilot</span><ChevronLeft size={10} /></div>}
      </button>

      {!collapsed && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Shared AI Copilot feed — same engine as Dashboard */}
          <div className="flex-1 overflow-hidden">
            <CopilotFeed compact />
          </div>

          {/* Stage display — reflects the one shared Program bus */}
          <div className="border-t border-white/[0.05] p-2.5 shrink-0">
            <div className="flex items-center gap-1 mb-2">
              <Eye size={9} className="text-blue-400" />
              <span className="text-[8px] text-white/40 uppercase tracking-wide font-semibold">On Program</span>
            </div>
            <div className="rounded-lg bg-white/[0.03] border border-white/[0.05] p-2 text-center">
              {program ? (
                <>
                  <p className="text-[9px] text-white/25 mb-1">Now on air</p>
                  <p className="text-[10px] text-white/70 font-medium leading-snug">{program.title}</p>
                  {program.subtitle && <p className="text-[8px] text-white/30 mt-0.5 italic">{program.subtitle}</p>}
                </>
              ) : (
                <p className="text-[9px] text-white/20 py-1">Nothing on Program</p>
              )}
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
    <div className="flex flex-col bg-chrome border-l border-white/[0.05]" style={{ width: '268px' }}>
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
  const { sources, previewId, programId } = useMediaEngine()
  const gfxProgram = useServiceStore(s => s.program)
  const gfxPreview = useServiceStore(s => s.preview)
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
    <div className="h-full flex flex-col overflow-hidden bg-app">
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

              {/* Live scripture/song graphic — full slide when no video, else lower-third */}
              <GraphicOverlay item={gfxProgram} variant="program" fullScreen={!programId} />

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

              {/* Previewed scripture/song graphic — full slide when no video, else lower-third */}
              <GraphicOverlay item={gfxPreview} variant="preview" fullScreen={!previewId} />

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
