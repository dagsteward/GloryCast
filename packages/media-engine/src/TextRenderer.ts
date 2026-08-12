// ─────────────────────────────────────────────────────────────────────────────
// TextRenderer — typographic slide and lower-third rendering.
//
// Produces a transparent canvas that the compositor consumes as an ordinary
// texture source, so scripture and lyrics composite over live video with the
// same transitions as any other layer.
//
// This is where GloryCast has to beat ProPresenter, so the details matter:
//   • binary-search auto-fit so a long verse and a short one both look composed
//   • real line-breaking with orphan control
//   • a legibility treatment (shadow + optional scrim) that survives being laid
//     over a bright, moving camera feed
//   • title-safe margins, because this goes to broadcast
// ─────────────────────────────────────────────────────────────────────────────

export type TextAlign = 'left' | 'center' | 'right'

export type SlidePosition =
  /** Full-frame slide — the classic worship lyric/scripture look. */
  | 'full'
  /** Lower third — text sits in the bottom band, camera stays visible. */
  | 'lower-third'
  /** Bottom-anchored caption band, tighter than a lower third. */
  | 'caption'

/**
 * How the text is kept readable over arbitrary video underneath.
 * Broadcast practice is a scrim; a pure shadow is lighter but fails over
 * high-frequency backgrounds like foliage or a busy congregation.
 */
export type Legibility = 'none' | 'shadow' | 'scrim' | 'scrim-gradient'

export interface TextStyle {
  fontFamily: string
  /** Upper bound for auto-fit, as a fraction of frame height. */
  maxFontScale: number
  /** Lower bound — below this we accept overflow rather than unreadable text. */
  minFontScale: number
  weight: number
  color: string
  align: TextAlign
  lineHeight: number
  /** Fraction of frame width kept clear on each side. */
  safeMargin: number
  legibility: Legibility
  /** Scrim colour with alpha, used by the scrim legibility modes. */
  scrimColor: string
  uppercase: boolean
  /** Extra letter spacing in em. */
  tracking: number
}

export const DEFAULT_TEXT_STYLE: TextStyle = {
  fontFamily: 'Inter, "Segoe UI", system-ui, sans-serif',
  maxFontScale: 0.085,
  minFontScale: 0.032,
  weight: 600,
  color: '#ffffff',
  align: 'center',
  lineHeight: 1.28,
  safeMargin: 0.08,
  legibility: 'scrim-gradient',
  scrimColor: 'rgba(0, 0, 0, 0.55)',
  uppercase: false,
  tracking: 0,
}

/** Content of one rendered slide. */
export interface SlideContent {
  /** The verse or lyric line(s). Blank lines are honoured as stanza breaks. */
  body: string
  /** Reference line, e.g. "Romans 8:28" or a song's part label. */
  attribution?: string
  /** Small badge, e.g. the translation code. */
  badge?: string
}

export interface RenderOptions {
  position: SlidePosition
  style: Partial<TextStyle>
}

/** Vertical extent of the text block within the frame, per position mode. */
const POSITION_BAND: Record<SlidePosition, { top: number; bottom: number }> = {
  'full':        { top: 0.14, bottom: 0.86 },
  'lower-third': { top: 0.62, bottom: 0.93 },
  'caption':     { top: 0.76, bottom: 0.94 },
}

export class TextRenderer {
  readonly canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D

  /** Bumped on every render so callers can tell when the texture changed. */
  private revision = 0

  constructor(width = 1920, height = 1080) {
    this.canvas = document.createElement('canvas')
    this.canvas.width = width
    this.canvas.height = height
    const ctx = this.canvas.getContext('2d', { alpha: true })
    if (!ctx) throw new Error('TextRenderer requires a 2D canvas context')
    this.ctx = ctx
  }

  get version(): number {
    return this.revision
  }

  resize(width: number, height: number): void {
    if (this.canvas.width === width && this.canvas.height === height) return
    this.canvas.width = width
    this.canvas.height = height
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.revision++
  }

  /** Render `content`, replacing whatever was on the canvas. */
  render(content: SlideContent, options: Partial<RenderOptions> = {}): void {
    const style: TextStyle = { ...DEFAULT_TEXT_STYLE, ...options.style }
    const position = options.position ?? 'full'

    const { ctx } = this
    const W = this.canvas.width
    const H = this.canvas.height

    ctx.clearRect(0, 0, W, H)

    const band = POSITION_BAND[position]
    const bandTop = band.top * H
    const bandHeight = (band.bottom - band.top) * H
    const maxWidth = W * (1 - style.safeMargin * 2)

    const body = style.uppercase ? content.body.toUpperCase() : content.body

    // Attribution and badge share a line beneath the body; reserve room first.
    const hasFooter = Boolean(content.attribution || content.badge)
    const footerHeight = hasFooter ? H * 0.045 : 0
    const bodyHeight = bandHeight - footerHeight

    const fit = this.fitText(body, style, maxWidth, bodyHeight, H)

    this.paintLegibility(style, position, bandTop, bandHeight)

    // ── Body ──
    ctx.save()
    ctx.font = this.fontSpec(style, fit.fontSize)
    ctx.textBaseline = 'middle'
    ctx.textAlign = style.align
    ctx.fillStyle = style.color
    if (style.tracking) ctx.letterSpacing = `${style.tracking}em`

    if (style.legibility === 'shadow') {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.85)'
      ctx.shadowBlur = fit.fontSize * 0.22
      ctx.shadowOffsetY = fit.fontSize * 0.045
    }

    const x = this.anchorX(style, W)
    const totalTextHeight = fit.lines.length * fit.lineHeight
    // Centre the block in the body area.
    let y = bandTop + (bodyHeight - totalTextHeight) / 2 + fit.lineHeight / 2

    for (const line of fit.lines) {
      ctx.fillText(line, x, y)
      y += fit.lineHeight
    }
    ctx.restore()

    // ── Footer: attribution + badge ──
    if (hasFooter) {
      this.paintFooter(content, style, x, bandTop + bandHeight - footerHeight * 0.35, H)
    }

    this.revision++
  }

  private fontSpec(style: TextStyle, size: number): string {
    return `${style.weight} ${size}px ${style.fontFamily}`
  }

  private anchorX(style: TextStyle, frameWidth: number): number {
    const margin = frameWidth * style.safeMargin
    if (style.align === 'left') return margin
    if (style.align === 'right') return frameWidth - margin
    return frameWidth / 2
  }

  /**
   * Binary-search the largest font size at which the wrapped text fits the
   * available box. Auto-fit is what makes a deck look designed rather than
   * assembled — a 6-word verse and a 60-word one both fill their space.
   */
  private fitText(
    text: string,
    style: TextStyle,
    maxWidth: number,
    maxHeight: number,
    frameHeight: number,
  ): { fontSize: number; lineHeight: number; lines: string[] } {
    const hi0 = style.maxFontScale * frameHeight
    const lo0 = style.minFontScale * frameHeight

    let lo = lo0
    let hi = hi0
    let best = { fontSize: lo0, lineHeight: lo0 * style.lineHeight, lines: [text] }

    // ~7 iterations gets us within a pixel over any realistic range.
    for (let i = 0; i < 8; i++) {
      const mid = (lo + hi) / 2
      const lineHeight = mid * style.lineHeight
      const lines = this.wrap(text, style, mid, maxWidth)

      if (lines.length * lineHeight <= maxHeight) {
        best = { fontSize: mid, lineHeight, lines }
        lo = mid
      } else {
        hi = mid
      }
    }

    // If even the minimum overflows, keep it — clipping a verse is worse than
    // a slightly over-full slide, and the operator can see it in preview.
    if (best.fontSize === lo0) {
      const lineHeight = lo0 * style.lineHeight
      best = { fontSize: lo0, lineHeight, lines: this.wrap(text, style, lo0, maxWidth) }
    }

    return best
  }

  /**
   * Greedy word wrap with two refinements over the naive version:
   *   • explicit newlines are preserved as hard breaks (stanza structure)
   *   • a single trailing word is pulled back onto the previous line where it
   *     fits, avoiding an orphan
   */
  private wrap(text: string, style: TextStyle, fontSize: number, maxWidth: number): string[] {
    const { ctx } = this
    ctx.save()
    ctx.font = this.fontSpec(style, fontSize)
    if (style.tracking) ctx.letterSpacing = `${style.tracking}em`

    const lines: string[] = []

    for (const paragraph of text.split('\n')) {
      if (paragraph.trim() === '') {
        lines.push('')
        continue
      }

      const words = paragraph.trim().split(/\s+/)
      let current = ''

      for (const word of words) {
        const candidate = current ? `${current} ${word}` : word
        if (ctx.measureText(candidate).width <= maxWidth || !current) {
          current = candidate
        } else {
          lines.push(current)
          current = word
        }
      }
      if (current) lines.push(current)
    }

    // Orphan control: a final line of one short word reads badly. Rebalance by
    // moving the last word of the penultimate line down to join it.
    if (lines.length >= 2) {
      const last = lines[lines.length - 1]
      const prev = lines[lines.length - 2]
      if (last && prev && !last.includes(' ')) {
        const prevWords = prev.split(' ')
        if (prevWords.length > 2) {
          const moved = prevWords.pop() as string
          const newLast = `${moved} ${last}`
          if (ctx.measureText(newLast).width <= maxWidth) {
            lines[lines.length - 2] = prevWords.join(' ')
            lines[lines.length - 1] = newLast
          }
        }
      }
    }

    ctx.restore()
    return lines
  }

  /** Paint the readability treatment behind the text. */
  private paintLegibility(
    style: TextStyle,
    position: SlidePosition,
    bandTop: number,
    bandHeight: number,
  ): void {
    const { ctx } = this
    const W = this.canvas.width
    const H = this.canvas.height

    if (style.legibility === 'none' || style.legibility === 'shadow') return

    ctx.save()

    if (style.legibility === 'scrim') {
      ctx.fillStyle = style.scrimColor
      if (position === 'full') {
        ctx.fillRect(0, 0, W, H)
      } else {
        // Pad the band so the scrim doesn't crop tight against the type.
        const pad = bandHeight * 0.18
        ctx.fillRect(0, bandTop - pad, W, bandHeight + pad * 2)
      }
    } else {
      // scrim-gradient: fades to transparent so the camera stays visible.
      let gradient: CanvasGradient
      if (position === 'full') {
        gradient = ctx.createLinearGradient(0, 0, 0, H)
        gradient.addColorStop(0, style.scrimColor)
        gradient.addColorStop(0.5, style.scrimColor)
        gradient.addColorStop(1, style.scrimColor)
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, W, H)
      } else {
        const top = Math.max(0, bandTop - bandHeight * 0.55)
        gradient = ctx.createLinearGradient(0, top, 0, H)
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
        gradient.addColorStop(0.45, style.scrimColor)
        gradient.addColorStop(1, style.scrimColor)
        ctx.fillStyle = gradient
        ctx.fillRect(0, top, W, H - top)
      }
    }

    ctx.restore()
  }

  private paintFooter(
    content: SlideContent,
    style: TextStyle,
    x: number,
    y: number,
    frameHeight: number,
  ): void {
    const { ctx } = this
    const size = frameHeight * 0.026

    // A short brand-accent rule above the reference line — the difference
    // between "text pasted on a video" and a designed broadcast lower third.
    // Sized and positioned relative to the footer baseline so it scales with
    // the rest of the treatment instead of being a fixed pixel value.
    const ruleWidth = size * 2.2
    const ruleY = y - size * 1.35
    let ruleX = x - ruleWidth / 2
    if (style.align === 'left') ruleX = x
    else if (style.align === 'right') ruleX = x - ruleWidth
    ctx.save()
    ctx.fillStyle = '#a855f7'
    ctx.fillRect(ruleX, ruleY, ruleWidth, Math.max(2, size * 0.09))
    ctx.restore()

    ctx.save()
    ctx.textBaseline = 'middle'
    ctx.textAlign = style.align
    ctx.font = `600 ${size}px ${style.fontFamily}`
    ctx.letterSpacing = '0.08em'

    if (style.legibility === 'shadow') {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
      ctx.shadowBlur = size * 0.5
    }

    const reference = content.attribution ?? ''
    // A light purple tint (vs. plain white) ties the reference line to the
    // app's brand accent without hurting legibility over video.
    ctx.fillStyle = 'rgba(216, 180, 254, 0.92)'
    ctx.fillText(reference.toUpperCase(), x, y)

    if (content.badge) {
      // The badge trails the reference, offset by its measured width so the
      // pair reads as one unit regardless of alignment.
      const refWidth = ctx.measureText(reference.toUpperCase()).width
      const gap = size * 0.9
      let badgeX = x
      if (style.align === 'center') badgeX = x + refWidth / 2 + gap
      else if (style.align === 'left') badgeX = x + refWidth + gap
      else badgeX = x + gap

      const badgeText = content.badge.toUpperCase()
      ctx.font = `700 ${size * 0.82}px ${style.fontFamily}`
      const badgeWidth = ctx.measureText(badgeText).width
      const padX = size * 0.42

      ctx.textAlign = 'left'
      const boxX = style.align === 'right' ? badgeX - badgeWidth - padX * 2 : badgeX
      ctx.fillStyle = 'rgba(168, 85, 247, 0.22)'
      ctx.strokeStyle = 'rgba(216, 180, 254, 0.35)'
      ctx.lineWidth = Math.max(1, size * 0.05)
      roundRect(ctx, boxX, y - size * 0.62, badgeWidth + padX * 2, size * 1.24, size * 0.3)
      ctx.fill()
      ctx.stroke()

      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
      ctx.fillText(badgeText, boxX + padX, y)
    }

    ctx.restore()
  }

  dispose(): void {
    this.canvas.width = 0
    this.canvas.height = 0
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}
