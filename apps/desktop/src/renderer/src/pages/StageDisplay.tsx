import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen } from 'lucide-react'
import type { StagePayload } from '../types/global'

export function StageDisplayPage() {
  const [stage, setStage] = useState<StagePayload | null>(null)
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const clockInterval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(clockInterval)
  }, [])

  // Live feed from the producer's Production page, relayed through the main
  // process — this window is a separate renderer with no other way to know
  // what's actually on stage. See main/index.ts's 'stage:update' relay.
  useEffect(() => {
    const onUpdate = (payload: unknown) => setStage(payload as StagePayload)
    window.glorycast?.on('stage:update', onUpdate)
    return () => window.glorycast?.off('stage:update', onUpdate)
  }, [])

  const hasContent = Boolean(stage?.body)

  return (
    <div className="w-full h-full bg-black flex flex-col overflow-hidden" style={{ fontFamily: 'Inter' }}>
      {/* Top info bar */}
      <div className="flex items-center justify-between px-8 py-4 bg-gray-950/80 border-b border-white/[0.06]">
        <div className="text-white/40 text-sm font-mono">
          {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
        </div>
        <div className="text-white/60 text-sm font-semibold tracking-wide">GloryCast AI — Stage Display</div>
        <div className={hasContent ? 'flex items-center gap-1.5 text-emerald-400 text-sm font-semibold' : 'text-white/30 text-sm'}>
          {hasContent && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
          {hasContent ? 'On Stage' : 'Idle'}
        </div>
      </div>

      {/* Main slide content */}
      <div className="flex-1 flex flex-col items-center justify-center px-24 py-12">
        <AnimatePresence mode="wait">
          {hasContent ? (
            <motion.div
              key={stage!.body}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="text-center max-w-5xl"
            >
              {stage!.reference && (
                <div className="flex items-center justify-center gap-3 mb-8">
                  <span className="text-purple-400 text-2xl font-light tracking-[0.15em] uppercase">
                    {stage!.reference}
                  </span>
                  {stage!.translation && (
                    <span className="text-[13px] font-bold tracking-wide text-purple-200 bg-purple-500/15 border border-purple-400/25 rounded-full px-2.5 py-0.5">
                      {stage!.translation}
                    </span>
                  )}
                </div>
              )}
              <p className="text-white text-5xl font-light leading-relaxed italic">
                {stage!.body}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-4 text-white/25"
            >
              <BookOpen size={40} strokeWidth={1.5} />
              <p className="text-lg">Waiting for the producer to push a verse to stage</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom info */}
      <div className="px-8 py-6 bg-gray-950/60 border-t border-white/[0.06] grid grid-cols-2 gap-8">
        <div>
          <div className="text-white/30 text-xs uppercase tracking-widest mb-1">Next Up</div>
          <div className="text-white/60 text-sm">{stage?.nextUp ?? '—'}</div>
        </div>
        <div>
          <div className="text-white/30 text-xs uppercase tracking-widest mb-1">Notes</div>
          <div className="text-white/55 text-sm leading-relaxed">{stage?.notes ?? '—'}</div>
        </div>
      </div>
    </div>
  )
}
