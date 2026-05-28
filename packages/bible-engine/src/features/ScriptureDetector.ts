import type { DetectedScripture, DetectionResult } from '../types/features.js'
import type { VerseRef } from '../types/bible.js'
import { resolveBook, formatRef } from '../core/ReferenceParser.js'
import { BIBLE_BOOKS } from '../data/books.js'

/** All book names and abbreviations for regex building */
const ALL_NAMES = (() => {
  const names: string[] = []
  for (const book of BIBLE_BOOKS) {
    names.push(book.name)
    names.push(book.shortName)
    for (const abbr of book.abbreviations) names.push(abbr)
  }
  // Sort by length descending so longer names match first
  return [...new Set(names)].sort((a, b) => b.length - a.length)
})()

// Build master regex
// Group 1: optional number prefix (1, 2, 3)
// Group 2: book name
// Group 3: chapter
// Group 4: verse (optional)
// Group 5: end verse (optional)
// Group 6: end chapter (optional)
// Group 7: end verse after chapter (optional)
const BOOK_PATTERN = ALL_NAMES.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
const SCRIPTURE_REGEX = new RegExp(
  `\\b((?:[123]\\s+)?(?:${BOOK_PATTERN}))\\.?\\s+(\\d{1,3})(?::\\s*(\\d{1,3})(?:\\s*[-–]\\s*(?:(\\d{1,3}):)?(\\d{1,3}))?)?\\b`,
  'gi'
)

export class ScriptureDetector {
  /** Detect all Bible references in a block of text */
  detect(text: string): DetectionResult {
    const start = Date.now()
    const detections: DetectedScripture[] = []
    const seen = new Set<string>()

    SCRIPTURE_REGEX.lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = SCRIPTURE_REGEX.exec(text)) !== null) {
      const [full, bookStr, chapterStr, verseStr, midChStr, endVerseStr] = match

      const bookId = resolveBook(bookStr.trim())
      if (!bookId) continue

      const chapter = parseInt(chapterStr, 10)
      const verse = verseStr ? parseInt(verseStr, 10) : 1
      const endVerse = endVerseStr ? parseInt(endVerseStr, 10) : undefined
      const endChapter = midChStr ? parseInt(midChStr, 10) : undefined

      if (chapter < 1 || chapter > 150 || verse < 1 || verse > 176) continue

      const ref: VerseRef = { book: bookId, chapter, verse }
      if (endVerse) ref.endVerse = endVerse
      if (endChapter) ref.endChapter = endChapter

      const refStr = formatRef(ref)
      if (seen.has(refStr)) continue
      seen.add(refStr)

      // Confidence based on how complete the reference is
      let confidence = 0.6
      if (verseStr) confidence = 0.9
      if (endVerse) confidence = 0.95

      // Context: 30 chars before and after
      const contextStart = Math.max(0, match.index - 30)
      const contextEnd = Math.min(text.length, match.index + full.length + 30)
      const context = text.slice(contextStart, contextEnd)

      detections.push({
        raw: full,
        ref,
        reference: refStr,
        confidence,
        position: match.index,
        length: full.length,
        context: contextStart > 0 ? `...${context}...` : context,
      })
    }

    return {
      detections,
      text,
      elapsed: Date.now() - start,
    }
  }

  /** Detect references from live sermon transcript (streaming mode) */
  detectIncremental(newText: string, previousDetections: DetectedScripture[] = []): DetectedScripture[] {
    const result = this.detect(newText)
    const prevRefs = new Set(previousDetections.map(d => d.reference))
    return result.detections.filter(d => !prevRefs.has(d.reference))
  }

  /** Find a specific book+chapter+verse in text */
  hasReference(text: string, ref: VerseRef): boolean {
    const result = this.detect(text)
    return result.detections.some(d =>
      d.ref.book === ref.book &&
      d.ref.chapter === ref.chapter &&
      d.ref.verse === ref.verse
    )
  }
}
