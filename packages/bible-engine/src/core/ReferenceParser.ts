import { BOOK_BY_ABBREV, BOOK_BY_ID } from '../data/books.js'
import type { VerseRef, ParsedReference } from '../types/bible.js'

/**
 * Parse any Bible reference string into a structured VerseRef.
 *
 * Handles:
 *   "John 3:16"           → { book:43, chapter:3, verse:16 }
 *   "Jn 3:16-17"          → { book:43, chapter:3, verse:16, endVerse:17 }
 *   "John 3:16-4:5"       → { book:43, chapter:3, verse:16, endChapter:4, endVerse:5 }
 *   "Genesis 1"           → { book:1, chapter:1, verse:1 }
 *   "Ps. 23:1-6"          → { book:19, chapter:23, verse:1, endVerse:6 }
 *   "1 John 3:16"         → { book:62, chapter:3, verse:16 }
 */

// Number-prefixed book names: "1 John", "2 Timothy", etc.
const NUM_PREFIX = /^([123])\s+/

// Core parse regex: Book [Chapter[:Verse[-[Chapter:]EndVerse]]]
const REF_REGEX = /^(.+?)\s+(\d+)(?::(\d+)(?:\s*[-–]\s*(?:(\d+):)?(\d+))?)?$/

export function parseReference(raw: string): ParsedReference {
  const input = raw.trim()
  if (!input) return invalid(input, 'Empty reference')

  const match = REF_REGEX.exec(input)
  if (!match) return invalid(input, 'Invalid format')

  const [, bookStr, chapterStr, verseStr, midChapterStr, endVerseStr] = match

  const bookId = resolveBook(bookStr.trim())
  if (!bookId) return invalid(input, `Unknown book: "${bookStr}"`)

  const chapter = parseInt(chapterStr, 10)
  const verse = verseStr ? parseInt(verseStr, 10) : 1
  const endVerse = endVerseStr ? parseInt(endVerseStr, 10) : undefined
  const endChapter = midChapterStr ? parseInt(midChapterStr, 10) : undefined

  const ref: VerseRef = { book: bookId, chapter, verse }
  if (endVerse !== undefined) ref.endVerse = endVerse
  if (endChapter !== undefined) ref.endChapter = endChapter

  return {
    ref,
    raw: input,
    formatted: formatRef(ref),
    isRange: endVerse !== undefined,
    isValid: true,
  }
}

export function parseMultiple(text: string): ParsedReference[] {
  // Split on semicolons or "and" between references
  return text
    .split(/[;]|\band\b/i)
    .map(s => parseReference(s.trim()))
    .filter(r => r.isValid)
}

export function resolveBook(name: string): number | null {
  const normalized = name.toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim()
  // Try direct lookup
  if (BOOK_BY_ABBREV.has(normalized)) return BOOK_BY_ABBREV.get(normalized)!
  // Try without spaces (e.g. "1john" → "1 john")
  const withSpace = normalized.replace(/^([123])/, '$1 ')
  if (BOOK_BY_ABBREV.has(withSpace)) return BOOK_BY_ABBREV.get(withSpace)!
  // Fuzzy: check if any book name starts with normalized
  for (const [abbr, id] of BOOK_BY_ABBREV) {
    if (abbr.startsWith(normalized) && normalized.length >= 2) return id
  }
  return null
}

export function formatRef(ref: VerseRef, includeVerse = true): string {
  const book = BOOK_BY_ID.get(ref.book)
  if (!book) return `Book ${ref.book}`
  const base = `${book.name} ${ref.chapter}`
  if (!includeVerse) return base
  const verseStr = `:${ref.verse}`
  if (ref.endVerse !== undefined) {
    if (ref.endChapter !== undefined) {
      return `${base}${verseStr}–${ref.endChapter}:${ref.endVerse}`
    }
    return `${base}${verseStr}–${ref.endVerse}`
  }
  return `${base}${verseStr}`
}

export function refsAreEqual(a: VerseRef, b: VerseRef): boolean {
  return a.book === b.book && a.chapter === b.chapter && a.verse === b.verse
}

export function refToLinear(ref: VerseRef): number {
  // Rough linear ordering: book*1000000 + chapter*1000 + verse
  return ref.book * 1_000_000 + ref.chapter * 1_000 + ref.verse
}

export function isInRange(ref: VerseRef, start: VerseRef, end: VerseRef): boolean {
  return refToLinear(ref) >= refToLinear(start) && refToLinear(ref) <= refToLinear(end)
}

function invalid(raw: string, error: string): ParsedReference {
  return {
    ref: { book: 0, chapter: 0, verse: 0 },
    raw,
    formatted: '',
    isRange: false,
    isValid: false,
    error,
  }
}
