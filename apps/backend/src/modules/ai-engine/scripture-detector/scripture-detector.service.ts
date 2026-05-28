import { Injectable, Logger } from '@nestjs/common'
import { EventEmitter2 }      from '@nestjs/event-emitter'
import {
  BIBLE_BOOKS, NUMBER_WORDS,
  buildBookLookup, SCRIPTURE_PATTERNS,
} from './nlp-patterns'

export interface DetectedScripture {
  raw:         string      // original matched text
  book:        string      // canonical book name
  bookId:      number
  chapter:     number
  verse?:      number
  verseEnd?:   number
  testament:   'OT' | 'NT'
  reference:   string      // formatted "Romans 8:28"
  confidence:  number      // 0–1
  posStart:    number
  posEnd:      number
}

@Injectable()
export class ScriptureDetectorService {
  private readonly logger     = new Logger(ScriptureDetectorService.name)
  private readonly bookLookup = buildBookLookup()

  constructor(private readonly eventEmitter: EventEmitter2) {}

  // ── Primary entry point ────────────────────────────────────────────────────

  detectAll(text: string, sourceId?: string): DetectedScripture[] {
    if (!text?.trim()) return []

    const results: DetectedScripture[] = []
    const seen = new Set<string>()

    for (const pattern of SCRIPTURE_PATTERNS) {
      pattern.lastIndex = 0
      let match: RegExpExecArray | null

      while ((match = pattern.exec(text)) !== null) {
        const detected = this.parseMatch(match, pattern.source)
        if (!detected) continue

        const key = `${detected.bookId}:${detected.chapter}:${detected.verse ?? 0}`
        if (seen.has(key)) continue
        seen.add(key)

        results.push(detected)
      }
    }

    // Emit events for each detection
    for (const scripture of results) {
      this.eventEmitter.emit('scripture.detected', { scripture, sourceId })
      this.logger.debug(`Detected: ${scripture.reference} (conf: ${scripture.confidence})`)
    }

    return results.sort((a, b) => b.confidence - a.confidence)
  }

  // ── Parse a single regex match ─────────────────────────────────────────────

  private parseMatch(match: RegExpExecArray, _patternSource: string): DetectedScripture | null {
    try {
      const raw    = match[0]
      const bookRaw = match[1]?.trim()
      if (!bookRaw) return null

      // Resolve book name
      const bookKey = this.resolveBook(bookRaw)
      if (!bookKey) return null

      const bookMeta = BIBLE_BOOKS[bookKey]
      if (!bookMeta) return null

      // Resolve chapter
      const chapterRaw = match[2]?.trim()
      const chapter    = this.parseNumber(chapterRaw)
      if (!chapter || chapter < 1 || chapter > bookMeta.chapters) return null

      // Resolve verse(s)
      const verseRaw    = match[3]?.trim()
      const verseEndRaw = match[4]?.trim()
      const verse       = verseRaw    ? this.parseNumber(verseRaw)    : undefined
      const verseEnd    = verseEndRaw ? this.parseNumber(verseEndRaw) : undefined

      // Build reference string
      const reference = verse
        ? `${bookMeta.canonical} ${chapter}:${verse}${verseEnd ? `–${verseEnd}` : ''}`
        : `${bookMeta.canonical} ${chapter}`

      // Confidence heuristic
      const confidence = this.computeConfidence(raw, bookMeta.canonical, !!verse)

      return {
        raw,
        book:      bookMeta.canonical,
        bookId:    bookMeta.id,
        chapter,
        verse,
        verseEnd,
        testament: bookMeta.testament,
        reference,
        confidence,
        posStart: match.index,
        posEnd:   match.index + raw.length,
      }
    } catch {
      return null
    }
  }

  // ── Book name resolver ────────────────────────────────────────────────────

  private resolveBook(raw: string): string | null {
    const normalized = raw.toLowerCase().trim()

    // Direct lookup
    if (this.bookLookup.has(normalized)) return this.bookLookup.get(normalized)!

    // Fuzzy: strip spaces and try
    const stripped = normalized.replace(/\s+/g, '')
    if (this.bookLookup.has(stripped)) return this.bookLookup.get(stripped)!

    // Fuzzy: number prefix ("1 corinthians" → "1corinthians")
    const prefixed = normalized.replace(/^(\d)\s+/, '$1')
    if (this.bookLookup.has(prefixed)) return this.bookLookup.get(prefixed)!

    return null
  }

  // ── Number parser (handles word and digit forms) ──────────────────────────

  private parseNumber(raw: string): number | undefined {
    if (!raw) return undefined
    const asInt = parseInt(raw, 10)
    if (!isNaN(asInt)) return asInt

    const lower = raw.toLowerCase().trim()
    if (NUMBER_WORDS[lower] !== undefined) return NUMBER_WORDS[lower]

    return undefined
  }

  // ── Confidence scoring ────────────────────────────────────────────────────

  private computeConfidence(raw: string, bookName: string, hasVerse: boolean): number {
    let score = 0.5

    // Has verse number = much more specific
    if (hasVerse) score += 0.3

    // Exact book name (canonical) = high confidence
    if (raw.toLowerCase().includes(bookName.toLowerCase())) score += 0.15

    // Shorter match = less ambiguous
    if (raw.length < 20) score += 0.05

    return Math.min(1.0, score)
  }

  // ── Stream audio analysis entry point ─────────────────────────────────────

  async analyzeTranscript(
    transcript: string,
    streamId:   string,
    churchId:   string,
  ): Promise<DetectedScripture[]> {
    const scriptures = this.detectAll(transcript, streamId)

    if (scriptures.length > 0) {
      this.eventEmitter.emit('ai.scriptures.batch', {
        streamId,
        churchId,
        scriptures,
        transcript,
      })
    }

    return scriptures
  }
}
