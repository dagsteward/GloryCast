/**
 * Reads BibleShow .bib files (Microsoft Access Jet 4 databases).
 * Uses the mdb-reader package for pure-JS parsing without ODBC drivers.
 */

import { readFileSync } from 'node:fs'
import type { BibleTranslation, BibleVerse, BibleChapter } from '../types/bible.js'
import { BOOK_BY_ID } from '../data/books.js'
import { formatRef } from '../core/ReferenceParser.js'

interface RawInfoRow  { ID: number; Parameter: string; Value: string }
interface RawStructRow { ID: number; BibPosition: number; FullTitle: string; Abbreviation: string; Chapters: number; OtherAbbrev?: string }
interface RawBibleRow { ID: number; Book: number; Chapter: number; Verse: number; Scripture: string; Sync?: string }

export interface BibDatabase {
  translation: BibleTranslation
  verses: Map<string, string>   // key: "B:C:V" → text
  structure: RawStructRow[]
}

function makeKey(book: number, chapter: number, verse: number): string {
  return `${book}:${chapter}:${verse}`
}

export async function readBibFile(filePath: string): Promise<BibDatabase> {
  // Dynamic import so this only runs in Node/Electron main process
  let MDBReader: any
  try {
    const mod = await import('mdb-reader')
    MDBReader = mod.default ?? mod.MDBReader ?? mod
  } catch {
    throw new Error('mdb-reader not installed. Run: npm install mdb-reader')
  }

  const buffer = readFileSync(filePath)
  const db = new MDBReader(buffer)

  // ── Info table ──────────────────────────────────────────────────────────
  const infoRows: RawInfoRow[] = db.getTable('Info').getData()
  const info: Record<string, string> = {}
  for (const row of infoRows) {
    if (row.Parameter && row.Value != null) {
      info[row.Parameter] = String(row.Value)
    }
  }

  const translation: BibleTranslation = {
    id:               info['BibleShortName']  ?? 'UNKNOWN',
    name:             info['BibleFullName']   ?? 'Unknown Translation',
    abbreviation:     info['BibleShortName']  ?? 'UNK',
    year:             parseInt(info['BibleFullName']?.match(/\((\d{4})\)/)?.[1] ?? '0', 10),
    language:         info['Language']        ?? 'English',
    languageCode:     info['Language'] === 'English' ? 'en' : 'xx',
    copyright:        info['Copyright']       ?? '',
    description:      info['Description']     ?? '',
    website:          info['Website']?.replace(/<[^>]+>/g, '') ?? '',
    hasStrongs:       false,
    hasRedWords:      info['RedWords'] === '1',
    hasFootnotes:     info['Footnotes'] === '1',
    hasCrossReferences: info['CrossReferences'] === '1',
    hasApocrypha:     info['Apocrypha'] === '1',
    loaded:           true,
    path:             filePath,
  }

  // ── Structure table ─────────────────────────────────────────────────────
  const structure: RawStructRow[] = db.getTable('Structure').getData()

  // ── Bible table ─────────────────────────────────────────────────────────
  const bibleRows: RawBibleRow[] = db.getTable('Bible').getData()
  const verses = new Map<string, string>()

  for (const row of bibleRows) {
    if (row.Book && row.Chapter && row.Verse && row.Scripture) {
      verses.set(makeKey(row.Book, row.Chapter, row.Verse), String(row.Scripture))
    }
  }

  translation.verseCount = verses.size

  return { translation, verses, structure }
}

export function getVerse(db: BibDatabase, book: number, chapter: number, verse: number): BibleVerse | null {
  const text = db.verses.get(makeKey(book, chapter, verse))
  if (!text) return null
  return {
    ref: { book, chapter, verse },
    text,
    translation: db.translation.id,
  }
}

export function getChapter(db: BibDatabase, book: number, chapter: number): BibleChapter {
  const bookMeta = BOOK_BY_ID.get(book)
  const verses: BibleVerse[] = []

  for (let v = 1; v <= 200; v++) {
    const text = db.verses.get(makeKey(book, chapter, v))
    if (!text) break
    verses.push({ ref: { book, chapter, verse: v }, text, translation: db.translation.id })
  }

  return { book, chapter, verses, translation: db.translation.id }
}

export function searchInDb(
  db: BibDatabase,
  query: string,
  options: { caseSensitive?: boolean; wholeWord?: boolean; books?: number[] } = {}
): Array<{ book: number; chapter: number; verse: number; text: string }> {
  const needle = options.caseSensitive ? query : query.toLowerCase()
  const results: Array<{ book: number; chapter: number; verse: number; text: string }> = []

  for (const [key, text] of db.verses) {
    const haystack = options.caseSensitive ? text : text.toLowerCase()
    const [b, c, v] = key.split(':').map(Number)

    if (options.books && !options.books.includes(b)) continue

    let found = false
    if (options.wholeWord) {
      found = new RegExp(`\\b${escapeRegex(needle)}\\b`, options.caseSensitive ? '' : 'i').test(text)
    } else {
      found = haystack.includes(needle)
    }

    if (found) results.push({ book: b, chapter: c, verse: v, text })
  }

  return results
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
