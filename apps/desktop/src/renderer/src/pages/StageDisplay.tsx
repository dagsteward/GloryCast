import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface StageSlide {
  title: string
  body: string
  reference?: string
  nextSlide?: string
  notes?: string
  timer?: number
}

const DEMO_STAGE: StageSlide = {
  title: 'Romans 8:28',
  body: 'And we know that in all things God works for the good of those who love him, who have been called according to his purpose.',
  reference: 'Romans 8:28 NIV',
  nextSlide: 'Amazing Grace — Verse 2',
  notes: 'Pause after this verse. Let it sink in. Then move to the application point.',
  timer: 45 * 60, // 45 minutes in seconds
}

export function StageDisplayPage() {
  const [slide, setSlide] = useState<StageSlide>(DEMO_STAGE)
  const [time, setTime] = useState(new Date())
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const clockInterval = setInterval(() => setTime(new Date()), 1000)
    const elapsedInterval = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => {
      clearInterval(clockInterval)
      clearInterval(elapsedInterval)
    }
  }, [])

  const formatTime = (secs: number): string => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  return (
    <div className="w-full h-full bg-black flex flex-col overflow-hidden" style={{ fontFamily: 'Inter' }}>
      {/* Top info bar */}
      <div className="flex items-center justify-between px-8 py-4 bg-gray-950/80">
        <div className="text-white/40 text-sm font-mono">
          {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
        </div>
        <div className="text-white/60 text-sm font-semibold">GloryCast AI — Stage Display</div>
        <div className="text-white/40 text-sm font-mono">
          Elapsed: {formatTime(elapsed)}
        </div>
      </div>

      {/* Main slide content */}
      <div className="flex-1 flex flex-col items-center justify-center px-24 py-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.body}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="text-center max-w-5xl"
          >
            {slide.reference && (
              <div className="text-purple-400 text-2xl font-light tracking-[0.15em] uppercase mb-8">
                {slide.reference}
              </div>
            )}
            <p className="text-white text-5xl font-light leading-relaxed italic">
              {slide.body}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom info */}
      <div className="px-8 py-6 bg-gray-950/60 grid grid-cols-3 gap-8">
        {/* Next slide */}
        <div>
          <div className="text-white/30 text-xs uppercase tracking-widest mb-1">Next Up</div>
          <div className="text-white/60 text-sm">{slide.nextSlide ?? '—'}</div>
        </div>

        {/* Notes */}
        <div>
          <div className="text-white/30 text-xs uppercase tracking-widest mb-1">Notes</div>
          <div className="text-white/55 text-sm leading-relaxed">{slide.notes ?? '—'}</div>
        </div>

        {/* Timer */}
        <div className="text-right">
          <div className="text-white/30 text-xs uppercase tracking-widest mb-1">Service Timer</div>
          <div className="text-white/70 text-2xl font-mono font-bold">
            {slide.timer ? formatTime(Math.max(0, slide.timer - elapsed)) : '--:--'}
          </div>
        </div>
      </div>
    </div>
  )
}
