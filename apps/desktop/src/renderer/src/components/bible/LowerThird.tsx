import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'

export type LowerThirdStyle = 'standard' | 'broadcast' | 'minimal' | 'cinematic'
export type LowerThirdState = 'prepared' | 'preview' | 'program'

export interface LowerThirdProps {
  style: LowerThirdStyle
  primaryText: string
  primaryRef: string
  primaryTranslation: string
  secondaryText?: string
  secondaryTranslation?: string
  state?: LowerThirdState
  /** When true renders full-bleed (for the actual output window). Default: preview card mode */
  fullBleed?: boolean
}

// ─── Standard: dark gradient bar with accent line ───────────────────────────
function Standard({ p, s }: { p: LowerThirdProps; s: boolean }) {
  return (
    <div className="absolute bottom-0 inset-x-0 px-6 pb-5">
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        className="bg-gradient-to-r from-[#07070aee] via-[#0d0d1dee] to-[#07070a99] backdrop-blur-sm border-t-2 border-purple-500 rounded-b-lg px-5 py-3"
      >
        <p className={cn('font-semibold leading-snug text-white', s ? 'text-base' : 'text-sm')}>
          {p.primaryText}
        </p>
        {p.secondaryText && (
          <p className={cn('mt-1 text-white/60 italic leading-snug', s ? 'text-sm' : 'text-xs')}>
            {p.secondaryText}
          </p>
        )}
        <div className="flex items-center gap-2 mt-2">
          <span className={cn('text-purple-400 font-semibold', s ? 'text-xs' : 'text-[10px]')}>
            {p.primaryRef}
          </span>
          <span className={cn('text-white/30', s ? 'text-[11px]' : 'text-[9px]')}>
            {p.primaryTranslation}
          </span>
          {p.secondaryTranslation && (
            <span className={cn('text-white/25', s ? 'text-[11px]' : 'text-[9px]')}>
              · {p.secondaryTranslation}
            </span>
          )}
        </div>
      </motion.div>
    </div>
  )
}

// ─── Broadcast: news-ticker style with bold accent block ─────────────────────
function Broadcast({ p, s }: { p: LowerThirdProps; s: boolean }) {
  return (
    <div className="absolute bottom-0 inset-x-0">
      <motion.div
        initial={{ x: -40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 25 }}
        className="flex"
      >
        {/* Accent block */}
        <div className="bg-purple-600 px-4 py-3 flex items-center justify-center shrink-0">
          <span className={cn('text-white font-black uppercase tracking-wider writing-mode-vertical', s ? 'text-xs' : 'text-[9px]')}>
            {p.primaryTranslation}
          </span>
        </div>
        {/* Text block */}
        <div className="flex-1 bg-[#0a0a14f0] backdrop-blur-sm px-5 py-3 border-t-2 border-purple-500/60">
          <p className={cn('font-bold text-white leading-tight', s ? 'text-base' : 'text-sm')}>
            {p.primaryText}
          </p>
          {p.secondaryText && (
            <p className={cn('text-white/50 italic mt-0.5 leading-tight', s ? 'text-sm' : 'text-xs')}>
              {p.secondaryText}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1.5">
            <div className="w-3 h-0.5 bg-purple-400" />
            <span className={cn('text-purple-300 font-semibold', s ? 'text-xs' : 'text-[10px]')}>
              {p.primaryRef}
            </span>
            {p.secondaryTranslation && (
              <span className={cn('text-white/25', s ? 'text-[11px]' : 'text-[9px]')}>
                ({p.secondaryTranslation})
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Minimal: barely-there text over subtle fog ───────────────────────────────
function Minimal({ p, s }: { p: LowerThirdProps; s: boolean }) {
  return (
    <div className="absolute bottom-0 inset-x-0 px-8 pb-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="space-y-0.5"
      >
        <p className={cn('text-white font-light drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] leading-snug', s ? 'text-lg' : 'text-sm')}>
          {p.primaryText}
        </p>
        {p.secondaryText && (
          <p className={cn('text-white/50 font-light drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] italic', s ? 'text-base' : 'text-xs')}>
            {p.secondaryText}
          </p>
        )}
        <p className={cn('text-white/40 tracking-widest uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]', s ? 'text-xs' : 'text-[9px]')}>
          {p.primaryRef} · {p.primaryTranslation}
          {p.secondaryTranslation ? ` / ${p.secondaryTranslation}` : ''}
        </p>
      </motion.div>
    </div>
  )
}

// ─── Cinematic: centered full-width with bold sermon-style ───────────────────
function Cinematic({ p, s }: { p: LowerThirdProps; s: boolean }) {
  return (
    <div className="absolute inset-x-0 bottom-0 pb-8">
      <motion.div
        initial={{ y: 20, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 24 }}
        className="mx-auto max-w-3xl text-center px-8"
      >
        <div className="h-px bg-gradient-to-r from-transparent via-purple-500/60 to-transparent mb-4" />
        <p className={cn('font-serif font-bold text-white leading-snug drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]', s ? 'text-xl' : 'text-base')}>
          "{p.primaryText}"
        </p>
        {p.secondaryText && (
          <p className={cn('mt-2 italic text-white/55 leading-snug drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]', s ? 'text-base' : 'text-xs')}>
            "{p.secondaryText}"
          </p>
        )}
        <div className={cn('mt-3 text-purple-300 font-semibold tracking-wide', s ? 'text-sm' : 'text-[10px]')}>
          — {p.primaryRef}
          <span className={cn('text-white/35 font-normal', s ? 'text-xs' : 'text-[9px]')}> {p.primaryTranslation}</span>
          {p.secondaryTranslation && (
            <span className={cn('text-white/25 font-normal', s ? 'text-xs' : 'text-[9px]')}> / {p.secondaryTranslation}</span>
          )}
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-purple-500/60 to-transparent mt-4" />
      </motion.div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────
export function LowerThird(props: LowerThirdProps) {
  const { style, fullBleed = false, state } = props
  const s = fullBleed  // "s" = big mode for full bleed

  const stateRing = state === 'program'
    ? 'ring-2 ring-red-500/70'
    : state === 'preview'
    ? 'ring-2 ring-blue-500/60'
    : ''

  return (
    <div className={cn(
      'relative w-full overflow-hidden select-none',
      fullBleed ? 'h-full bg-transparent' : 'aspect-video rounded-xl bg-black/90',
      !fullBleed && stateRing,
    )}>
      {/* Fake content background (preview mode only) */}
      {!fullBleed && (
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] via-[#0d0d1a] to-[#07070a] opacity-80" />
      )}

      {style === 'standard'   && <Standard   p={props} s={s} />}
      {style === 'broadcast'  && <Broadcast  p={props} s={s} />}
      {style === 'minimal'    && <Minimal    p={props} s={s} />}
      {style === 'cinematic'  && <Cinematic  p={props} s={s} />}

      {/* State badge (preview mode) */}
      {!fullBleed && state && (
        <div className={cn(
          'absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider',
          state === 'program'  ? 'bg-red-600 text-white'   :
          state === 'preview'  ? 'bg-blue-600 text-white'  :
                                 'bg-white/10 text-white/50',
        )}>
          {state}
        </div>
      )}
    </div>
  )
}
