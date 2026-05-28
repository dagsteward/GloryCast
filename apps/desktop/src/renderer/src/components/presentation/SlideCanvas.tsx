import { motion, AnimatePresence } from 'framer-motion'
import type { Slide } from '../../pages/Presentation'
import { cn } from '../../lib/utils'

const BACKGROUNDS: Record<string, string> = {
  'gradient-purple': 'bg-gradient-to-br from-purple-900 via-indigo-900 to-black',
  'gradient-orange': 'bg-gradient-to-br from-orange-900 via-red-900 to-black',
  'gradient-blue': 'bg-gradient-to-br from-blue-900 via-cyan-900 to-black',
  'gradient-dark': 'bg-gradient-to-br from-gray-900 to-black',
}

interface SlideCanvasProps {
  slide: Slide | undefined
}

export function SlideCanvas({ slide }: SlideCanvasProps) {
  if (!slide) {
    return (
      <div className="w-full h-full rounded-xl bg-black border border-white/10 flex items-center justify-center">
        <span className="text-white/20 text-sm">No slide selected</span>
      </div>
    )
  }

  const bgClass = slide.background && BACKGROUNDS[slide.background]
    ? BACKGROUNDS[slide.background]
    : ''
  const bgStyle = slide.background && !BACKGROUNDS[slide.background]
    ? { backgroundColor: slide.background }
    : {}

  return (
    <div className="w-full h-full rounded-xl overflow-hidden border border-white/10 shadow-2xl relative" style={{ aspectRatio: '16/9' }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className={cn('absolute inset-0 flex flex-col items-center justify-center p-16', bgClass)}
          style={bgStyle}
        >
          {/* Scripture overlay effect */}
          {slide.type === 'scripture' && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
          )}

          {/* Content */}
          <div className="relative z-10 text-center max-w-4xl">
            {slide.type === 'scripture' && slide.reference && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mb-6"
              >
                <span className="text-purple-300 text-lg font-light tracking-[0.2em] uppercase">
                  {slide.reference}
                </span>
                {slide.translation && (
                  <span className="ml-3 text-white/40 text-sm">{slide.translation}</span>
                )}
              </motion.div>
            )}

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className={cn(
                'text-white leading-relaxed font-light',
                slide.type === 'scripture'
                  ? 'text-3xl italic'
                  : slide.type === 'song'
                  ? 'text-4xl font-medium tracking-wide whitespace-pre-line'
                  : 'text-5xl font-bold',
              )}
              style={{
                fontFamily: slide.font ?? 'Inter',
                fontSize: slide.fontSize ? `${slide.fontSize}px` : undefined,
                color: slide.textColor ?? '#ffffff',
                textShadow: '0 2px 20px rgba(0,0,0,0.8)',
              }}
            >
              {slide.body ?? slide.title}
            </motion.p>
          </div>

          {/* Lower third bar */}
          {slide.type === 'scripture' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="absolute bottom-8 left-8 right-8"
            >
              <div className="flex items-center gap-3">
                <div className="w-1 h-8 bg-purple-500 rounded-full" />
                <div>
                  <div className="text-white/90 text-sm font-semibold">{slide.reference}</div>
                  <div className="text-white/50 text-xs">{slide.translation ?? 'NIV'}</div>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Preview overlay indicator */}
      <div className="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-black/60 border border-white/10">
        <span className="text-[10px] text-white/40 font-mono uppercase tracking-widest">Preview</span>
      </div>
    </div>
  )
}
