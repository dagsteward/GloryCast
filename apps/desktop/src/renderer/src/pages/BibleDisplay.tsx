import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

// ─────────────────────────────────────────────────────────────────────────────
// BibleDisplay — the congregation-facing projection window.
//
// Opened on the projector or second screen and driven from the Bible page,
// the way Power Bible and BibleShow work: the operator reads and navigates in
// the main window, and only what they deliberately send appears here.
//
// Deliberately standalone. It needs nothing from the Production switcher, so a
// church running a service with no video production still gets full scripture
// projection — while the same verse can also be pushed through Production when
// there IS a camera mix to composite over.
//
// This is a separate renderer process with no shared state, so everything
// arrives over the 'bible:display' IPC channel (see main/index.ts).
// ─────────────────────────────────────────────────────────────────────────────

export type DisplayMode = 'full' | 'lower-third'

export interface BibleDisplayPayload {
  /** Verse text. null clears the screen — a blank output, not a stale verse. */
  text: string | null
  reference: string | null
  translation: string | null
  mode: DisplayMode
}

const EMPTY: BibleDisplayPayload = {
  text: null, reference: null, translation: null, mode: 'full',
}

/**
 * Scale the verse to the space available.
 *
 * A 12-word verse and a 90-word one both have to look composed on a projector,
 * so size steps down as length grows rather than using one fixed size that
 * either wastes the screen or overflows it.
 */
function fullSizeFor(text: string): string {
  const words = text.trim().split(/\s+/).length
  if (words <= 25) return 'clamp(2.5rem, 5.5vw, 6rem)'
  if (words <= 55) return 'clamp(2rem, 4vw, 4.25rem)'
  if (words <= 90) return 'clamp(1.6rem, 3vw, 3.25rem)'
  return 'clamp(1.3rem, 2.4vw, 2.5rem)'
}

export function BibleDisplayPage() {
  const [slide, setSlide] = useState<BibleDisplayPayload>(EMPTY)

  useEffect(() => {
    const onUpdate = (payload: unknown) => setSlide((payload as BibleDisplayPayload) ?? EMPTY)
    window.glorycast?.on('bible:display', onUpdate)
    return () => window.glorycast?.off('bible:display', onUpdate)
  }, [])

  const live = Boolean(slide.text)

  return (
    // Pure black, never a theme colour: this surface is a projector output, not
    // part of the app's UI, and any tint shows up as a grey wash on screen.
    <div className="w-full h-full bg-black overflow-hidden select-none" style={{ fontFamily: 'Inter' }}>
      <AnimatePresence mode="wait">
        {!live && (
          // Blank rather than a logo or placeholder — if the operator clears the
          // verse mid-service, the congregation should see nothing at all.
          <motion.div key="blank" className="w-full h-full bg-black"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
        )}

        {live && slide.mode === 'full' && (
          <motion.div
            key={`full-${slide.reference}-${slide.text?.slice(0, 24)}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="w-full h-full flex flex-col items-center justify-center px-[8vw] text-center"
          >
            <p
              className="text-white font-light leading-[1.35] tracking-[-0.01em]"
              style={{ fontSize: fullSizeFor(slide.text ?? ''), textShadow: '0 2px 24px rgba(0,0,0,0.6)' }}
            >
              {slide.text}
            </p>

            {slide.reference && (
              <div className="mt-[4vh] flex items-center gap-4">
                <span className="h-px w-10 bg-purple-400/70" />
                <span className="text-purple-300 tracking-[0.2em] uppercase"
                  style={{ fontSize: 'clamp(0.9rem, 1.5vw, 1.6rem)' }}>
                  {slide.reference}
                </span>
                {slide.translation && (
                  <span className="text-white/45 tracking-[0.15em] uppercase"
                    style={{ fontSize: 'clamp(0.7rem, 1.1vw, 1.15rem)' }}>
                    {slide.translation}
                  </span>
                )}
                <span className="h-px w-10 bg-purple-400/70" />
              </div>
            )}
          </motion.div>
        )}

        {live && slide.mode === 'lower-third' && (
          <motion.div
            key={`lt-${slide.reference}-${slide.text?.slice(0, 24)}`}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="absolute inset-x-0 bottom-0 px-[6vw] pb-[6vh] pt-[14vh]"
            // Gradient rather than a solid bar so the camera stays visible
            // behind it — the whole point of a lower third.
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.92) 45%, rgba(0,0,0,0))' }}
          >
            <p className="text-white font-light leading-[1.4] max-w-[85%]"
              style={{ fontSize: 'clamp(1.2rem, 2.4vw, 2.6rem)', textShadow: '0 2px 16px rgba(0,0,0,0.8)' }}>
              {slide.text}
            </p>

            {slide.reference && (
              <div className="mt-[2vh] flex items-center gap-3">
                <span className="h-[3px] w-8 bg-purple-400 rounded-full" />
                <span className="text-purple-200 font-semibold tracking-[0.16em] uppercase"
                  style={{ fontSize: 'clamp(0.75rem, 1.2vw, 1.25rem)' }}>
                  {slide.reference}
                </span>
                {slide.translation && (
                  <span className="text-purple-100/90 font-bold tracking-wide uppercase rounded-full px-2.5 py-0.5
                                   bg-purple-500/25 border border-purple-300/30"
                    style={{ fontSize: 'clamp(0.6rem, 0.9vw, 0.95rem)' }}>
                    {slide.translation}
                  </span>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
