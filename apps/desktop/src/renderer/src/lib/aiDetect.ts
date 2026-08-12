// ─────────────────────────────────────────────────────────────────────────────
// GloryCast — AI detection helpers (single shared implementation)
//
// Two detectors run over the same live transcript window:
//   • detectScripture()  — regex over all 66 books (full names + abbreviations)
//   • detectSongs()       — fuzzy line-match against the user's song library
//
// Previously scripture detection was copy-pasted in three places. Everything
// now imports from here.
// ─────────────────────────────────────────────────────────────────────────────

import {
  loadTranslation, getChapter, getVerseText, isBundled, BUNDLED_TRANSLATIONS,
  searchBibleMerged,
} from './bibleData'
import { apiUrl } from './api'

// ── Scripture ────────────────────────────────────────────────────────────────

const BOOK_NAMES = [
  'Song of Solomon', 'Song of Songs', '1 Thessalonians', '2 Thessalonians',
  '1 Corinthians', '2 Corinthians', '1 Chronicles', '2 Chronicles',
  '1 Timothy', '2 Timothy', '1 Samuel', '2 Samuel',
  '1 Kings', '2 Kings', '1 Peter', '2 Peter',
  '1 John', '2 John', '3 John', 'Deuteronomy', 'Lamentations',
  'Ecclesiastes', 'Philippians', 'Colossians', 'Revelation',
  'Habakkuk', 'Zephaniah', 'Zechariah', 'Nehemiah', 'Obadiah',
  'Galatians', 'Ephesians', 'Proverbs', 'Matthew', 'Genesis',
  'Leviticus', 'Numbers', 'Joshua', 'Judges', 'Isaiah', 'Ezekiel',
  'Jeremiah', 'Malachi', 'Haggai', 'Philemon', 'Romans', 'Hebrews',
  'Ezra', 'Joel', 'Amos', 'Micah', 'Nahum', 'Titus', 'Jude',
  'Daniel', 'Hosea', 'Jonah', 'James', 'Acts', 'Ruth', 'Luke', 'Mark',
  'John', 'Job', 'Psalms', 'Psalm', 'Exodus', 'Esther',
  'Matt', 'Rom', 'Gal', 'Eph', 'Phil', 'Col', 'Heb', 'Rev',
  'Isa', 'Jer', 'Lam', 'Ezek', 'Dan', 'Hab', 'Zech', 'Mal',
  'Gen', 'Exod', 'Lev', 'Num', 'Deut', 'Josh', 'Judg',
  'Ps', 'Psa', 'Prov', 'Eccl', 'Neh', 'Jas',
  '1 Cor', '2 Cor', '1 Thess', '2 Thess', '1 Tim', '2 Tim',
  '1 Sam', '2 Sam', '1 Pet', '2 Pet',
]

/**
 * Spoken forms of the numbered books — "Second Corinthians", not "2
 * Corinthians". Whisper transcribes what it hears, and a preacher says the
 * ordinal aloud, so without these every epistle with a number in front of it
 * was detected and then silently discarded.
 */
const ORDINAL_WORD = ['', 'First', 'Second', 'Third']

const SPOKEN_ORDINAL_BOOKS = BOOK_NAMES
  .filter(n => /^[123] /.test(n))
  .map(n => `${ORDINAL_WORD[Number(n[0])]} ${n.slice(2)}`)

// Ordinal forms first: regex alternation takes the earliest match that works,
// so "Second Corinthians" has to be offered before anything that could match a
// shorter prefix of it.
const BOOK_PATTERN = [...SPOKEN_ORDINAL_BOOKS, ...BOOK_NAMES]
  .map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  .join('|')

// Chapter/verse separator accepts a colon OR plain whitespace. Text typed or
// read from a screen has the colon ("John 3:16"); speech transcribed from
// audio usually doesn't — Whisper renders a spoken "John three sixteen" as
// "John 3 16", not "John 3:16". Requiring a literal colon meant almost no
// spoken verse citation ever captured a verse number at all, silently
// falling through as a chapter-only mention (see the skip below).
const SCRIPTURE_REGEX = new RegExp(
  `\\b(${BOOK_PATTERN})\\.?\\s+(?:chapter\\s+)?(\\d{1,3})` +
  // The separator also allows "." because Whisper writes a spoken "four
  // thirteen" as "4.13" — without it, Philippians 4:13 parsed as a bare
  // chapter and was dropped.
  `(?:\\s*[:.,]?\\s*(?:verses?\\s+)?(\\d{1,3})(?:\\s*(?:[-–]|through|to)\\s*(\\d{1,3}))?)?`,
  'gi',
)

const ABBREV_MAP: Record<string, string> = {
  'ps': 'Psalms', 'psa': 'Psalms', 'psalm': 'Psalms',
  'gen': 'Genesis', 'exod': 'Exodus', 'ex': 'Exodus', 'lev': 'Leviticus',
  'num': 'Numbers', 'deut': 'Deuteronomy', 'josh': 'Joshua', 'judg': 'Judges',
  'neh': 'Nehemiah', 'isa': 'Isaiah', 'jer': 'Jeremiah', 'lam': 'Lamentations',
  'ezek': 'Ezekiel', 'dan': 'Daniel', 'hab': 'Habakkuk', 'zeph': 'Zephaniah',
  'zech': 'Zechariah', 'mal': 'Malachi', 'matt': 'Matthew', 'rom': 'Romans',
  '1 cor': '1 Corinthians', '2 cor': '2 Corinthians',
  'gal': 'Galatians', 'eph': 'Ephesians', 'phil': 'Philippians',
  'col': 'Colossians', '1 thess': '1 Thessalonians', '2 thess': '2 Thessalonians',
  '1 tim': '1 Timothy', '2 tim': '2 Timothy', '1 sam': '1 Samuel', '2 sam': '2 Samuel',
  'heb': 'Hebrews', 'jas': 'James', '1 pet': '1 Peter', '2 pet': '2 Peter',
  'rev': 'Revelation', 'prov': 'Proverbs', 'eccl': 'Ecclesiastes',
}

/** Canonical casing for every full book name, keyed lowercase for lookup. */
const CANONICAL_BOOK: Record<string, string> = Object.fromEntries(
  BOOK_NAMES.map(n => [n.toLowerCase(), n]),
)

function normalizeBook(raw: string): string {
  // "Second Corinthians" → "2 Corinthians" before anything else looks at it,
  // so spoken and written forms converge on the one canonical key the Bible
  // data is indexed by.
  const spoken = raw.trim().replace(
    /^(first|second|third)\s+/i,
    (_m, word: string) => `${['first', 'second', 'third'].indexOf(word.toLowerCase()) + 1} `,
  )
  const lower = spoken.toLowerCase().trim()
  // Whisper transcribes natural speech, not scripture citations — it doesn't
  // reliably capitalize a book name mid-sentence ("...in john 3:16..." often
  // comes out lowercase). The bundled Bible JSON keys are exact and
  // case-sensitive ("John"), so passing through Whisper's casing looked up
  // nothing and silently fell through to "verse text unavailable" for every
  // detection whose book name wasn't already correctly capitalized.
  return ABBREV_MAP[lower] ?? CANONICAL_BOOK[lower] ?? spoken
}

export interface ScriptureHit {
  reference:  string
  book:       string
  chapter:    number
  verse?:     number
  endVerse?:  number
  confidence: number
}

/** Find every scripture reference in `text` not already in `seen`. */
export function detectScripture(text: string, seen: Set<string>): ScriptureHit[] {
  const results: ScriptureHit[] = []
  SCRIPTURE_REGEX.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = SCRIPTURE_REGEX.exec(text)) !== null) {
    const [, bookRaw, chStr, vStr, endVStr] = m
    const book = normalizeBook(bookRaw)
    const chapter = parseInt(chStr, 10)
    if (chapter < 1 || chapter > 150) continue
    const verse = vStr ? parseInt(vStr, 10) : undefined
    const endVerse = endVStr ? parseInt(endVStr, 10) : undefined
    if (verse !== undefined && (verse < 1 || verse > 176)) continue
    const reference = verse
      ? `${book} ${chapter}:${verse}${endVerse ? `–${endVerse}` : ''}`
      : `${book} ${chapter}`
    if (seen.has(reference)) continue
    seen.add(reference)
    const confidence = endVerse ? 0.95 : verse ? 0.92 : 0.6
    results.push({ reference, book, chapter, verse, endVerse, confidence })
  }
  return results
}

// ── Spoken translation switching ─────────────────────────────────────────────
// A preacher who wants a specific wording says so out loud: "John 3:16, New
// King James". Until they do, projection stays on the configured default
// (NIV). Whisper writes speech, not citations, so these match spoken forms
// ("new king james") as well as spelled-out initialisms ("N K J V").

/**
 * Spoken aliases → translation id. Order matters within the matcher below:
 * longer, more specific phrases must win, or "new king james" would match the
 * "king james" alias and silently project the wrong translation.
 */
const TRANSLATION_ALIASES: Array<[string, string]> = [
  ['new international version', 'NIV'], ['n i v', 'NIV'], ['niv', 'NIV'],
  ['new king james version', 'NKJV'], ['new king james', 'NKJV'],
  ['n k j v', 'NKJV'], ['nkjv', 'NKJV'],
  ['king james version', 'KJV'], ['king james', 'KJV'], ['k j v', 'KJV'], ['kjv', 'KJV'],
  ['english standard version', 'ESV'], ['e s v', 'ESV'], ['esv', 'ESV'],
  ['new living translation', 'NLT'], ['n l t', 'NLT'], ['nlt', 'NLT'],
  ['good news translation', 'GNT'], ['good news bible', 'GNT'], ['good news', 'GNT'],
  ['the passion translation', 'TPT'], ['passion translation', 'TPT'], ['tpt', 'TPT'],
  ['the living bible', 'TLB'], ['living bible', 'TLB'],
  ['the message', 'MSG'], ['message translation', 'MSG'],
  ['world english bible', 'WEB'],
]

/**
 * The translation named most recently in `text`, or null if none is mentioned.
 * Scans for the LAST mention so that, as the rolling transcript window slides,
 * the most recent instruction wins rather than one from minutes ago.
 */
export function detectTranslation(text: string): string | null {
  const hay = ` ${text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ')} `

  let bestEnd = -1
  let bestId: string | null = null
  let bestLength = 0

  for (const [alias, id] of TRANSLATION_ALIASES) {
    const index = hay.lastIndexOf(` ${alias} `)
    if (index === -1) continue

    // Ranked by where the match ENDS, not where it starts. Aliases nest —
    // "king james" lives inside "new king james" and therefore starts later,
    // so ranking by start position picks the shorter, wrong one every time.
    // Both end at the same offset, so comparing ends turns nesting into a tie
    // that the longer alias then wins.
    const end = index + alias.length
    if (end > bestEnd || (end === bestEnd && alias.length > bestLength)) {
      bestEnd = end
      bestId = id
      bestLength = alias.length
    }
  }
  return bestId
}

// ── Spoken quote / paraphrase → verse suggestion ─────────────────────────────
// A presenter often *quotes* scripture without saying the reference ("the Lord
// is my shepherd, I shall not want"). We run the rolling transcript through the
// fuzzy quote→verse engine (bundled WEB + KJV) and suggest the matching verse
// so the operator can project the right one. Tuned to stay quiet unless the
// match is strong, so ordinary speech doesn't spam the feed.

export interface QuoteHit {
  reference:  string
  book:       string
  chapter:    number
  verse:      number
  text:       string
  translation: string
  confidence: number
}

/** Map the search engine's raw score (~0–4) to a 0..1 confidence. */
const scoreToConfidence = (score: number) => Math.max(0, Math.min(0.99, score / 4))

/**
 * Suggest verses for any scripture *quoted or paraphrased* in `text`.
 * Requires bundled translations to be loaded (caller awaits this). Only returns
 * matches above `minScore` (strong/exact phrasings) and not already in `seen`.
 */
export async function detectScriptureQuotes(
  text: string,
  seen: Set<string>,
  opts: { minScore?: number; limit?: number } = {},
): Promise<QuoteHit[]> {
  const { minScore = 2.6, limit = 1 } = opts

  // Need a reasonable run of meaningful words before a quote search is useful.
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2)
  if (words.length < 4) return []

  // Ensure bundled text is available, then rank.
  await Promise.all(BUNDLED_TRANSLATIONS.map(tx => loadTranslation(tx).catch(() => null)))
  const hits = searchBibleMerged([...BUNDLED_TRANSLATIONS], text, { mode: 'smart', limit: limit + 4 })

  const out: QuoteHit[] = []
  for (const h of hits) {
    if (h.score < minScore) continue
    const ref = `${h.book} ${h.chapter}:${h.verse}`
    if (seen.has(ref)) continue
    seen.add(ref)
    out.push({
      reference: ref, book: h.book, chapter: h.chapter, verse: h.verse,
      text: h.text, translation: h.tx, confidence: scoreToConfidence(h.score),
    })
    if (out.length >= limit) break
  }
  return out
}

/** Read verse text (or a whole chapter) from a bundled translation, or ''. */
function bundledVerseText(tx: string, book: string, chapter: number, verse?: number, endVerse?: number): string {
  if (verse === undefined) {
    const rows = getChapter(tx, book, chapter)
    return rows.length ? rows.map(r => r.text).join(' ') : ''
  }
  const first = getVerseText(tx, book, chapter, verse)
  if (!first) return ''
  if (!endVerse || endVerse <= verse) return first
  const parts = [first]
  for (let v = verse + 1; v <= endVerse; v++) {
    const t = getVerseText(tx, book, chapter, v)
    if (t) parts.push(t)
  }
  return parts.join(' ')
}

/**
 * Read a translation from the operator's local .bib library via the main
 * process. This is what makes NIV (and ESV, NKJV, NLT, …) available at all —
 * they are far too large to bundle as JSON and are not public domain, so they
 * live as files on disk rather than inside the app bundle.
 *
 * Returns '' in the browser dev preview, where there is no main process; the
 * caller then falls back to bundled WEB/KJV so projection never breaks.
 */
async function localVerseText(
  translation: string, book: string, chapter: number, verse?: number, endVerse?: number,
): Promise<string> {
  try {
    const res = await window.glorycast?.bible?.verse({ translation, book, chapter, verse, endVerse })
    return res?.text ?? ''
  } catch {
    return ''
  }
}

/**
 * Map a translation abbreviation to an API.Bible id.
 *
 * Populated at runtime from the catalogue the operator's own key can see, so
 * it reflects their entitlements rather than a hard-coded guess. Empty until
 * `primeApiBibleIds()` has run.
 */
const _apiBibleIds = new Map<string, string>()

export function apiBibleIdFor(translation: string): string | undefined {
  return _apiBibleIds.get(translation.toUpperCase())
}

/**
 * Fetch the catalogue once and index it by abbreviation. Safe to call
 * repeatedly; does nothing without a configured key.
 */
export async function primeApiBibleIds(): Promise<number> {
  try {
    const list = await window.glorycast?.bibleApi?.list()
    if (!list) return 0
    for (const b of list) {
      const abbr = b.abbreviation?.toUpperCase()
      // First match wins: ABS lists regional variants under the same
      // abbreviation and the primary edition comes first.
      if (abbr && !_apiBibleIds.has(abbr)) _apiBibleIds.set(abbr, b.id)
    }
    return _apiBibleIds.size
  } catch {
    return 0
  }
}

/** Query the backend Bible API for a (possibly licensed) translation, or ''. */
async function backendVerseText(book: string, chapter: number, verse: number | undefined, translation: string): Promise<string> {
  try {
    const path = verse
      ? `/reference/${encodeURIComponent(book)}/${chapter}/${verse}?translation=${translation}`
      : `/reference/${encodeURIComponent(book)}/${chapter}?translation=${translation}`
    const res = await fetch(apiUrl(`bible${path}`))
    if (!res.ok) return ''
    const data = await res.json()
    const verses: any[] = data?.data?.verses ?? []
    return verses.map((v: any) => v.text).join(' ')
  } catch {
    return ''
  }
}

/**
 * Resolve scripture text for projection. The bundled public-domain text (WEB +
 * KJV) ships with the app, so projection ALWAYS has full verse text with no
 * backend or network dependency. A licensed translation (NIV, …) is tried from
 * the backend first; if unavailable we transparently fall back to bundled text
 * so the projection is never just a bare reference.
 */
export async function resolveVerse(
  book: string,
  chapter: number,
  verse?: number,
  endVerse?: number,
  translation = 'NIV',
): Promise<{ text: string; translation: string }> {
  // 1. Requested translation, if it's one we bundle.
  if (isBundled(translation)) {
    try { await loadTranslation(translation) } catch { /* ignore */ }
    const t = bundledVerseText(translation, book, chapter, verse, endVerse)
    if (t) return { text: t, translation: translation.toUpperCase() }
  } else {
    // 2a. Local .bib library — the operator's own translations on disk. Tried
    //     before the network because it is offline, instant, and the common
    //     case: a church running a service should never wait on an API for a
    //     verse it already has locally.
    const local = await localVerseText(translation, book, chapter, verse, endVerse)
    if (local) return { text: local, translation: translation.toUpperCase() }

    // 2b. API.Bible — the operator's own key against ABS's catalogue. Covers
    //     translations the church has not got a local file for, including a
    //     large public-domain set. Network-bound, so it sits after local.
    const apiId = apiBibleIdFor(translation)
    if (apiId) {
      try {
        const res = await window.glorycast?.bibleApi?.verse({ bibleId: apiId, book, chapter, verse, endVerse })
        if (res?.text) return { text: res.text, translation: translation.toUpperCase() }
      } catch { /* fall through to the next source */ }
    }

    // 2c. Licensed translation — try the backend (user's own licensed DB).
    const t = await backendVerseText(book, chapter, verse, translation)
    if (t) return { text: t, translation }
  }

  // 3. Always-available fallback: bundled WEB, then KJV.
  for (const tx of BUNDLED_TRANSLATIONS) {
    try { await loadTranslation(tx) } catch { continue }
    const t = bundledVerseText(tx, book, chapter, verse, endVerse)
    if (t) return { text: t, translation: tx }
  }
  return { text: '', translation: translation.toUpperCase() }
}

/** Back-compat: return just the text (bundled-first). */
export async function fetchVerseText(
  book: string,
  chapter: number,
  verse?: number,
  translation = 'NIV',
): Promise<string> {
  return (await resolveVerse(book, chapter, verse, undefined, translation)).text
}

// ── Songs ──────────────────────────────────────────────────────────────────

export interface SongLine {
  songId:    string
  songTitle: string
  partLabel: string        // "Verse 1", "Chorus", …
  raw:       string        // original line as shown on a slide
  norm:      string        // normalised for matching
  words:     number
}

export interface SongHit {
  songId:     string
  songTitle:  string
  partLabel:  string
  line:       string
  confidence: number
}

const STOP_PUNCT = /[^a-z0-9\s]/g

function normLine(s: string): string {
  return s.toLowerCase().replace(STOP_PUNCT, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Build a searchable index of lyric lines from the user's song library.
 * rawText is split on blank lines into parts; the first line of a part that
 * looks like a label ("Chorus", "Verse 2") becomes the part label.
 */
export function buildSongIndex(songs: { id: string; title: string; rawText: string }[]): SongLine[] {
  const index: SongLine[] = []
  const labelRe = /^\s*(chorus|verse\s*\d*|bridge|pre-?chorus|intro|outro|tag|refrain|interlude|ending)\b/i

  for (const song of songs) {
    const blocks = song.rawText.split(/\n\s*\n/)
    for (const block of blocks) {
      const lines = block.split('\n').map(l => l.trim()).filter(Boolean)
      if (lines.length === 0) continue
      let partLabel = 'Verse'
      let start = 0
      if (labelRe.test(lines[0])) {
        partLabel = lines[0].replace(/[:：]\s*$/, '')
        start = 1
      }
      for (let i = start; i < lines.length; i++) {
        const norm = normLine(lines[i])
        const words = norm.split(' ').filter(Boolean).length
        if (words < 4) continue            // too short to match reliably
        index.push({
          songId:    song.id,
          songTitle: song.title,
          partLabel,
          raw:       lines[i],
          norm,
          words,
        })
      }
    }
  }
  return index
}

/**
 * Match the live transcript window against the song index. Returns the best
 * hit per song (so a sung verse surfaces the song once, not per line).
 */
export function detectSongs(transcript: string, index: SongLine[], seen: Set<string>): SongHit[] {
  if (index.length === 0) return []
  const hay = normLine(transcript)
  if (hay.length < 12) return []

  const bestPerSong = new Map<string, SongHit>()

  for (const entry of index) {
    // Direct substring match of a full lyric line = strong signal.
    let confidence = 0
    if (hay.includes(entry.norm)) {
      confidence = Math.min(0.99, 0.8 + entry.words * 0.02)
    } else {
      // Token-overlap fallback for partial / mis-transcribed lines.
      const tokens = entry.norm.split(' ')
      let hits = 0
      for (const t of tokens) if (t.length > 2 && hay.includes(t)) hits++
      const ratio = hits / tokens.length
      if (ratio >= 0.75) confidence = 0.7 + (ratio - 0.75) * 0.6
    }
    if (confidence === 0) continue

    const key = `${entry.songId}|${entry.partLabel}`
    if (seen.has(key)) continue

    const prev = bestPerSong.get(entry.songId)
    if (!prev || confidence > prev.confidence) {
      bestPerSong.set(entry.songId, {
        songId:    entry.songId,
        songTitle: entry.songTitle,
        partLabel: entry.partLabel,
        line:      entry.raw,
        confidence,
      })
    }
  }

  const hits = [...bestPerSong.values()]
  for (const h of hits) seen.add(`${h.songId}|${h.partLabel}`)
  return hits
}
