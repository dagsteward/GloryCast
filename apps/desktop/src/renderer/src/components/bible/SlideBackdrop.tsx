import { useBackgroundStore, type SlideBackground } from '../../stores/backgroundStore'
import { cn } from '../../lib/utils'

// Renders a slide background (gradient / motion / image / video / solid) as an
// absolutely-positioned fill. Pass either a resolved `background` or a `bgId`
// to look up from the registry. Falls back to the Worship gradient.

interface Props {
  background?: SlideBackground | null
  bgId?:       string
  className?:  string
  /** Dim the backdrop a little so overlaid text stays legible. */
  scrim?: boolean
}

export function SlideBackdrop({ background, bgId, className, scrim = true }: Props) {
  const lookup = useBackgroundStore(s => s.get)
  const bg = background ?? lookup(bgId) ?? lookup('worship')

  if (!bg) return null

  return (
    <div className={cn('absolute inset-0 overflow-hidden', className)}>
      {(bg.kind === 'gradient' || bg.kind === 'motion') && (
        <div className={cn('absolute inset-0', bg.className)} />
      )}
      {bg.kind === 'solid' && (
        <div className="absolute inset-0" style={{ background: bg.color }} />
      )}
      {bg.kind === 'image' && bg.url && (
        <div
          className="absolute inset-0 bg-center bg-cover"
          style={{ backgroundImage: `url(${bg.url})` }}
        />
      )}
      {bg.kind === 'video' && bg.url && (
        <video
          src={bg.url}
          autoPlay muted loop playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      {scrim && <div className="absolute inset-0 bg-black/30" />}
    </div>
  )
}
