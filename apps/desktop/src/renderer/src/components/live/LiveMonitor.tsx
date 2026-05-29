import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../../lib/utils'
import type { LiveItem } from '../../stores/serviceStore'

// Shared output renderer. Dashboard, Production and Presentation all render the
// serviceStore Preview/Program through this so the look is identical everywhere.

const BG_CLASSES: Record<string, string> = {
  'gradient-purple': 'bg-gradient-to-br from-purple-900 via-indigo-900 to-black',
  'gradient-orange': 'bg-gradient-to-br from-orange-900 via-red-900 to-black',
  'gradient-blue':   'bg-gradient-to-br from-blue-900 via-cyan-900 to-black',
  'slide-bg-worship':'slide-bg-worship',
  'slide-bg-grace':  'slide-bg-grace',
  'slide-bg-fire':   'slide-bg-fire',
  'slide-bg-nature': 'slide-bg-nature',
  'slide-bg-gold':   'slide-bg-gold',
}

const DEFAULT_BG: Record<string, string> = {
  scripture:    'slide-bg-grace',
  song:         'slide-bg-worship',
  announcement: 'gradient-purple',
  media:        'gradient-dark',
  blank:        '',
}

interface Props {
  item:     LiveItem | null
  variant:  'preview' | 'program' | 'thumb'
  label?:   string
  className?: string
}

export function LiveMonitor({ item, variant, label, className }: Props) {
  const isThumb = variant === 'thumb'

  if (!item || item.kind === 'blank') {
    return (
      <div className={cn('w-full h-full bg-black relative overflow-hidden flex items-center justify-center', className)} style={{ aspectRatio: '16/9' }}>
        <span className="text-white/15 text-sm">{item ? '' : 'Empty'}</span>
        {label && <MonitorBadge variant={variant} label={label} />}
      </div>
    )
  }

  const bgKey   = item.background ?? DEFAULT_BG[item.kind] ?? 'gradient-dark'
  const bgClass = BG_CLASSES[bgKey] ?? 'bg-gradient-to-br from-gray-900 to-black'
  const accent  = item.kind === 'song' ? 'rgb(96,165,250)' : 'rgb(168,85,247)'

  return (
    <div className={cn('w-full h-full bg-black relative overflow-hidden', className)} style={{ aspectRatio: '16/9' }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={item.id}
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: isThumb ? 0 : 0.28, ease: 'easeOut' }}
          className={cn('absolute inset-0 flex flex-col items-center justify-center', isThumb ? 'p-3' : 'p-10', bgClass)}
        >
          {!isThumb && (
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_42%,_rgba(0,0,0,0.55)_100%)] pointer-events-none" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10 pointer-events-none" />

          {/* Reference / part label */}
          {!isThumb && item.subtitle && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 }}
              className="relative z-10 mb-4"
            >
              <span className="text-sm font-light tracking-[0.2em] uppercase" style={{ color: accent }}>
                {item.kind === 'scripture' ? item.title : item.subtitle}
              </span>
            </motion.div>
          )}

          {/* Body */}
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={cn(
              'relative z-10 text-center text-white whitespace-pre-line leading-relaxed',
              isThumb ? 'text-[8px] leading-tight'
                : item.kind === 'scripture' ? 'text-2xl italic font-light'
                : item.kind === 'song' ? 'text-3xl font-semibold tracking-wide'
                : 'text-4xl font-bold',
            )}
            style={{ textShadow: isThumb ? 'none' : '0 2px 24px rgba(0,0,0,0.85)' }}
          >
            {item.body ?? item.title}
          </motion.p>

          {/* Lower third */}
          {!isThumb && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 }}
              className="absolute bottom-6 left-7 right-7 z-10"
            >
              <div className="flex items-center gap-3">
                <div className="w-[3px] h-9 rounded-full" style={{ backgroundColor: accent, boxShadow: `0 0 8px ${accent}` }} />
                <div>
                  <div className="text-white/90 text-sm font-semibold">{item.title}</div>
                  {item.subtitle && <div className="text-white/45 text-xs">{item.subtitle}</div>}
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {label && <MonitorBadge variant={variant} label={label} />}
    </div>
  )
}

function MonitorBadge({ variant, label }: { variant: string; label: string }) {
  return (
    <div className={cn(
      'absolute top-2.5 left-3 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-widest z-20',
      variant === 'program' ? 'bg-red-600/85 text-white' : 'bg-emerald-600/75 text-white',
    )}>
      {label}
    </div>
  )
}
