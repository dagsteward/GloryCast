import { motion, AnimatePresence } from 'framer-motion'
import type { Slide } from '../../pages/Presentation'
import { cn } from '../../lib/utils'

const BG_CLASSES: Record<string, string> = {
  'gradient-purple': 'bg-gradient-to-br from-purple-900 via-indigo-900 to-black',
  'gradient-orange': 'bg-gradient-to-br from-orange-900 via-red-900 to-black',
  'gradient-blue':   'bg-gradient-to-br from-blue-900 via-cyan-900 to-black',
  'gradient-dark':   'bg-gradient-to-br from-gray-900 to-black',
  'slide-bg-worship':'slide-bg-worship',
  'slide-bg-grace':  'slide-bg-grace',
  'slide-bg-fire':   'slide-bg-fire',
  'slide-bg-nature': 'slide-bg-nature',
  'slide-bg-gold':   'slide-bg-gold',
}

interface SlideCanvasProps {
  slide:    Slide | undefined
  variant?: 'preview' | 'program' | 'thumb'
  label?:   string
}

export function SlideCanvas({ slide, variant = 'preview', label }: SlideCanvasProps) {
  if (!slide) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center">
        <span className="text-white/15 text-sm">No slide selected</span>
      </div>
    )
  }

  const bgClass = slide.background && BG_CLASSES[slide.background]
    ? BG_CLASSES[slide.background]
    : ''
  const bgStyle = slide.background && !BG_CLASSES[slide.background]
    ? { backgroundColor: slide.background }
    : {}

  const isThumb = variant === 'thumb'
  const scale   = isThumb ? 0.18 : 1

  return (
    <div className="w-full h-full bg-black relative overflow-hidden" style={{ aspectRatio: '16/9' }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.id}
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: isThumb ? 0 : 0.28, ease: 'easeOut' }}
          className={cn(
            'absolute inset-0 flex flex-col items-center justify-center',
            isThumb ? 'p-4' : 'p-12',
            bgClass,
          )}
          style={bgStyle}
        >
          {/* Cinematic vignette */}
          {!isThumb && (
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_40%,_rgba(0,0,0,0.5)_100%)] pointer-events-none" />
          )}

          {/* Scripture overlay */}
          {slide.type === 'scripture' && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/15 pointer-events-none" />
          )}

          {/* Content */}
          <div className="relative z-10 text-center w-full">
            {/* Song part label */}
            {slide.type === 'song' && slide.partLabel && !isThumb && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="mb-4"
              >
                <span className="text-[11px] font-semibold tracking-[0.25em] uppercase text-white/40">
                  {slide.partLabel}
                </span>
              </motion.div>
            )}

            {/* Scripture reference */}
            {slide.type === 'scripture' && slide.reference && !isThumb && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06 }}
                className="mb-5"
              >
                <span className="text-purple-300 text-lg font-light tracking-[0.18em] uppercase">
                  {slide.reference}
                </span>
                {slide.translation && (
                  <span className="ml-3 text-white/35 text-sm">{slide.translation}</span>
                )}
              </motion.div>
            )}

            {/* Main text */}
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className={cn(
                'text-white leading-relaxed whitespace-pre-line',
                isThumb
                  ? 'text-[8px] leading-tight'
                  : slide.type === 'scripture'
                  ? 'text-2xl italic font-light'
                  : slide.type === 'song'
                  ? 'text-3xl font-semibold tracking-wide'
                  : slide.type === 'blank'
                  ? 'text-white/0'
                  : 'text-4xl font-bold',
              )}
              style={{
                fontFamily: slide.font ?? 'Inter',
                fontSize:   slide.fontSize && !isThumb ? `${slide.fontSize}px` : undefined,
                color:      slide.textColor ?? '#ffffff',
                textShadow: isThumb ? 'none' : '0 2px 24px rgba(0,0,0,0.85), 0 1px 6px rgba(0,0,0,0.6)',
              }}
            >
              {slide.body ?? slide.title}
            </motion.p>

            {/* Announcement subtitle */}
            {slide.type === 'announcement' && slide.reference && !isThumb && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="mt-3 text-sm text-white/55 font-light"
              >
                {slide.reference}
              </motion.p>
            )}
          </div>

          {/* Lower third for scripture */}
          {slide.type === 'scripture' && !isThumb && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22, ease: 'easeOut' }}
              className="absolute bottom-7 left-8 right-8"
            >
              <div className="flex items-center gap-3">
                <div className="w-[3px] h-9 bg-purple-500 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.6)]" />
                <div>
                  <div className="text-white/90 text-sm font-semibold">{slide.reference}</div>
                  <div className="text-white/45 text-xs">{slide.translation ?? 'NIV'}</div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Song lower third */}
          {slide.type === 'song' && slide.songTitle && !isThumb && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 }}
              className="absolute bottom-7 left-8 right-8"
            >
              <div className="flex items-center gap-3">
                <div className="w-[3px] h-9 bg-blue-400 rounded-full shadow-[0_0_8px_rgba(96,165,250,0.6)]" />
                <div>
                  <div className="text-white/90 text-sm font-semibold">{slide.songTitle}</div>
                  {slide.partLabel && (
                    <div className="text-white/45 text-xs">{slide.partLabel}</div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Monitor label badge */}
      {!isThumb && label && (
        <div className={cn(
          'absolute top-2.5 left-3 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-widest',
          variant === 'program'
            ? 'bg-red-600/80 text-white'
            : 'bg-emerald-600/70 text-white',
        )}>
          {label}
        </div>
      )}
    </div>
  )
}
