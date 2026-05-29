import { useEffect, useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Scissors, TrendingDown, ExternalLink, Maximize2, Radio } from 'lucide-react'
import { useMediaEngine, getStream } from '../../hooks/useMediaEngine'
import { cn } from '../../lib/utils'

// ─── Video element that accepts a MediaStream via ref ─────────────────────────
function VideoMonitor({
  sourceId,
  label,
  variant,
  className,
}: {
  sourceId: string | null
  label: string
  variant: 'program' | 'preview'
  className?: string
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const { appearance } = useMediaEngine()
  const stream = getStream(sourceId)

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    if (stream) {
      el.srcObject = stream
      el.play().catch(() => {})
    } else {
      el.srcObject = null
    }
    return () => { if (el) el.srcObject = null }
  }, [sourceId, stream])

  return (
    <div className={cn(
      'relative rounded-xl overflow-hidden border-2 flex flex-col bg-black',
      variant === 'program' ? 'border-red-500/80 shadow-[0_0_20px_rgba(239,68,68,0.25)]' :
                              'border-emerald-500/70 shadow-[0_0_16px_rgba(16,185,129,0.2)]',
      className,
    )}>
      {stream ? (
        <video
          ref={videoRef}
          autoPlay muted playsInline
          className="w-full h-full object-contain bg-black"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-900/40 to-black">
          <div className={cn(
            'w-16 h-16 rounded-full flex items-center justify-center mb-3 opacity-20',
            variant === 'program' ? 'bg-red-500/20' : 'bg-emerald-500/20',
          )}>
            <Radio size={28} className={variant === 'program' ? 'text-red-400' : 'text-emerald-400'} />
          </div>
          <p className="text-[11px] text-white/20">No source</p>
        </div>
      )}

      {/* Status label */}
      {appearance.showMonitorLabels && (
        <div className={cn(
          'absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold tracking-widest',
          variant === 'program' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white',
        )}>
          {label}
        </div>
      )}

      {/* Source name */}
      <div className="absolute bottom-1.5 left-2 text-[9px] text-white/40 font-mono">
        {sourceId ?? '—'}
      </div>
    </div>
  )
}

// ─── Source thumbnail (small grid cell) ──────────────────────────────────────
function SourceThumb({
  id, label, type, isProgram, isPreview, onClick,
}: {
  id: string; label: string; type: string
  isProgram: boolean; isPreview: boolean
  onClick: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const stream = getStream(id)

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    if (stream) { el.srcObject = stream; el.play().catch(() => {}) }
    else el.srcObject = null
    return () => { if (el) el.srcObject = null }
  }, [id, stream])

  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={cn(
        'relative rounded-lg overflow-hidden cursor-pointer border transition-all aspect-video bg-black',
        isProgram && 'border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.45)]',
        isPreview && !isProgram && 'border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.35)]',
        !isProgram && !isPreview && 'border-white/10 hover:border-white/30',
      )}
    >
      {stream ? (
        <video
          ref={videoRef}
          autoPlay muted playsInline
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
          <span className="text-[8px] text-white/20 text-center px-1 leading-tight">{label}</span>
        </div>
      )}

      {isProgram && (
        <div className="absolute top-0.5 left-0.5 px-1 py-0.5 bg-red-500 rounded-sm text-[7px] font-bold text-white">PGM</div>
      )}
      {isPreview && !isProgram && (
        <div className="absolute top-0.5 left-0.5 px-1 py-0.5 bg-emerald-500 rounded-sm text-[7px] font-bold text-white">PVW</div>
      )}

      <div className="absolute bottom-0.5 right-0.5 px-1 py-0.5 bg-black/60 rounded text-[7px] text-white/30 uppercase">
        {type}
      </div>

      {stream && (
        <div className="absolute bottom-0.5 left-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      )}
    </motion.div>
  )
}

// ─── Transition buttons ────────────────────────────────────────────────────────
type Transition = 'cut' | 'fade'

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
    .label { position:fixed; top:12px; left:12px; background:#ef4444; color:#fff;
             font-family:monospace; font-size:11px; font-weight:bold; padding:3px 8px;
             border-radius:4px; text-transform:uppercase; letter-spacing:.1em; }
  </style>
</head>
<body>
  <video id="v" autoplay muted playsinline></video>
  <div class="label">● PROGRAM</div>
</body>
</html>`)
  win.document.close()

  win.onload = () => {
    const video = win.document.getElementById('v') as HTMLVideoElement | null
    if (video) {
      video.srcObject = stream
      video.play().catch(() => {})
    }
  }

  // Fallback in case onload already fired
  setTimeout(() => {
    const video = win.document.getElementById('v') as HTMLVideoElement | null
    if (video && !video.srcObject) {
      video.srcObject = stream
      video.play().catch(() => {})
    }
  }, 300)
}

// ─── Main MultiView ────────────────────────────────────────────────────────────
export function MultiView() {
  const {
    sources, previewId, programId,
    assignToPreview, assignToProgram, cutToProgram,
  } = useMediaEngine()

  const [transition, setTransition] = useState<Transition>('cut')
  const [fading, setFading] = useState(false)

  function handleCut() {
    if (transition === 'cut') {
      cutToProgram()
    } else {
      // Fade: animate opacity, then cut
      setFading(true)
      setTimeout(() => {
        cutToProgram()
        setFading(false)
      }, 500)
    }
  }

  return (
    <div className="h-full flex flex-col gap-3">
      {/* PREVIEW + PROGRAM monitors */}
      <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
        <VideoMonitor sourceId={previewId} label="PREVIEW" variant="preview" className="h-full" />
        <motion.div
          animate={{ opacity: fading ? 0 : 1 }}
          transition={{ duration: 0.5 }}
          className="h-full"
        >
          <VideoMonitor sourceId={programId} label="PROGRAM" variant="program" className="h-full" />
        </motion.div>
      </div>

      {/* Switcher bar */}
      <div className="shrink-0 flex items-center gap-3 px-3 py-2 bg-chrome rounded-xl border border-white/[0.05]">
        {/* Transition mode */}
        <div className="flex gap-1">
          {(['cut','fade'] as Transition[]).map(t => (
            <button key={t} onClick={() => setTransition(t)}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wide transition-colors',
                transition === t ? 'bg-white/10 text-white/80' : 'text-white/25 hover:text-white/50',
              )}>
              {t === 'cut' ? <Scissors size={10} /> : <TrendingDown size={10} />}
              {t}
            </button>
          ))}
        </div>

        {/* TAKE / CUT button */}
        <button onClick={handleCut}
          disabled={!previewId}
          className={cn(
            'flex-1 py-1.5 rounded-xl font-bold text-sm uppercase tracking-widest transition-all',
            previewId
              ? 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_16px_rgba(239,68,68,0.35)]'
              : 'bg-white/[0.05] text-white/20 cursor-not-allowed',
          )}>
          {transition === 'cut' ? '✂ CUT' : '⟶ FADE'}
        </button>

        {/* Open output window */}
        <button onClick={() => openOutputWindow(programId)}
          disabled={!programId}
          title="Open full-screen PROGRAM output in new window"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.09] text-white/40 hover:text-white/70 text-[11px] disabled:opacity-25 transition-colors">
          <ExternalLink size={11} /> Full Output
        </button>
      </div>

      {/* Source thumbnail grid */}
      <div className="shrink-0 grid grid-cols-4 gap-2" style={{ height: '120px' }}>
        {sources.slice(0, 8).map(src => (
          <SourceThumb
            key={src.id}
            id={src.id}
            label={src.label}
            type={src.type}
            isProgram={src.id === programId}
            isPreview={src.id === previewId}
            onClick={() => assignToPreview(src.id)}
          />
        ))}
        {/* Empty placeholder cells */}
        {Array.from({ length: Math.max(0, 4 - sources.length) }).map((_, i) => (
          <div key={`empty-${i}`}
            className="rounded-lg border border-dashed border-white/[0.06] aspect-video flex items-center justify-center">
            <span className="text-[9px] text-white/15">Empty</span>
          </div>
        ))}
      </div>
    </div>
  )
}
