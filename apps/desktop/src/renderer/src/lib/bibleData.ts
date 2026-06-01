// ─────────────────────────────────────────────────────────────────────────────
// GloryCast — bundled Bible text + quote→verse search engine
//
// The full public-domain text (KJV + WEB, ~31,100 verses each) ships as a
// compact JSON asset under /bible/{kjv,web}.json (renderer `public/` dir, fetched
// at runtime so it never bloats the JS bundle). This module:
//   • lazy-loads + caches each translation
//   • exposes synchronous verse lookup once a translation is loaded
//   • builds a flat search index and ranks quotes/paraphrases against it
//
// Licensed translations (NIV, NKJV, …) are NOT bundled — they load into the
// backend DB from the user's own licensed files and are served via the API.
// ─────────────────────────────────────────────────────────────────────────────

/** Translations that ship inside the app (public domain). */
export const BUNDLED_TRANSLATIONS = ['WEB', 'KJV'] as const
export type BundledId = (typeof BUNDLED_TRANSLATIONS)[number]

export const isBundled = (id: string): id is BundledId =>
  (BUNDLED_TRANSLATIONS as readonly string[]).includes(id.toUpperCase())

/** Compact asset shape: books[name] = chapters[]; chapter = verse-text[]. */
interface BibleAsset {
  t: string
  name: string
  books: Record<string, string[][]>
}

export interface VerseRow {
  book:    string
  chapter: number
  verse:   number
  ref:     string   // "John 3:16"
  text:    string
}

export interface SearchHit extends VerseRow {
  score: number
  tx:    string   // translation whose text is shown (the best-matching one)
}

// ─── Lazy load + cache ─────────────────────────────────────────────────────────

const _assets    = new Map<string, BibleAsset>()
const _indexes   = new Map<string, VerseRow[]>()
const _loading   = new Map<string, Promise<BibleAsset>>()

/** Fetch + cache a bundled translation. Safe to call repeatedly. */
export async function loadTranslation(id: string): Promise<BibleAsset> {
  const key = id.toUpperCase()
  const cached = _assets.get(key)
  if (cached) return cached

  const inflight = _loading.get(key)
  if (inflight) return inflight

  const p = (async () => {
    const res = await fetch(`bible/${key.toLowerCase()}.json`)
    if (!res.ok) throw new Error(`Bible asset ${key} failed to load (${res.status})`)
    const asset = (await res.json()) as BibleAsset
    _assets.set(key, asset)
    _loading.delete(key)
    return asset
  })()

  _loading.set(key, p)
  return p
}

export const isLoaded = (id: string) => _assets.has(id.toUpperCase())

// ─── Verse lookup ────────────────────────────────────────────────────────────

/** Verses for a chapter — empty array if the translation isn't loaded yet. */
export function getChapter(id: string, book: string, chapter: number): VerseRow[] {
  const asset = _assets.get(id.toUpperCase())
  const chapters = asset?.books[book]
  const verses = chapters?.[chapter - 1]
  if (!verses) return []
  return verses.map((text, i) => ({
    book, chapter, verse: i + 1, ref: `${book} ${chapter}:${i + 1}`, text,
  }))
}

/** A single verse's text, or undefined. */
export function getVerseText(id: string, book: string, chapter: number, verse: number): string | undefined {
  return _assets.get(id.toUpperCase())?.books[book]?.[chapter - 1]?.[verse - 1]
}

/** Build (once) and return a flat verse index for a loaded translation. */
function getIndex(id: string): VerseRow[] {
  const key = id.toUpperCase()
  const cached = _indexes.get(key)
  if (cached) return cached

  const asset = _assets.get(key)
  if (!asset) return []

  const rows: VerseRow[] = []
  for (const [book, chapters] of Object.entries(asset.books)) {
    for (let c = 0; c < chapters.length; c++) {
      const verses = chapters[c]
      for (let v = 0; v < verses.length; v++) {
        rows.push({
          book, chapter: c + 1, verse: v + 1,
          ref: `${book} ${c + 1}:${v + 1}`, text: verses[v],
        })
      }
    }
  }
  _indexes.set(key, rows)
  return rows
}

// ─── Quote → verse ranking ───────────────────────────────────────────────────
// A producer remembers a *line* of scripture — exactly, loosely, or paraphrased.
// We score every verse on three signals and blend them so the right verse floats
// to the top whether the wording is exact or only approximate:
//   1. exact phrase     — the query appears verbatim (strongest)
//   2. word coverage    — share of the query's meaningful words present
//   3. word adjacency    — bonus when those words appear close / in order
// Common filler words ("the", "and", "of"…) are ignored for coverage so the
// match keys on the distinctive words a person actually remembers.

const STOPWORDS = new Set([
  'the','and','a','an','of','to','in','that','is','for','he','i','his','my','me','you',
  'it','as','be','so','but','not','with','on','will','was','are','were','this','they',
  'them','their','from','by','at','or','we','us','our','your','him','her','she','which',
  'shall','unto','thy','thee','thou','ye','o','hath','have','had','let','also',
])

const normalize = (s: string) =>
  s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim()

/** Light stemmer: strip common English suffixes so loved≈love, believeth≈believe. */
function stem(w: string): string {
  return w
    .replace(/(eth|edst|est)$/,'')
    .replace(/(ing|ed|ly|s)$/,'')
    .replace(/(e)$/,'')
}

const tokens = (s: string) => normalize(s).split(' ').filter(Boolean)

export type SearchMode = 'smart' | 'phrase' | 'all' | 'any'

export interface SearchOpts {
  mode?:  SearchMode
  limit?: number
  /** Restrict to a book (e.g. when the producer knows it's in Psalms). */
  book?:  string
}

/**
 * Rank verses of a loaded translation against a (possibly paraphrased) quote.
 * `smart` (default) blends exact-phrase, word-coverage and adjacency so reworded
 * quotes still surface the intended verse.
 */
export function searchBible(id: string, query: string, opts: SearchOpts = {}): SearchHit[] {
  const { mode = 'smart', limit = 30, book } = opts
  const txId  = id.toUpperCase()
  const index = getIndex(txId)
  if (!index.length) return []

  const qNorm = normalize(query)
  if (qNorm.length < 2) return []

  const qTokens   = qNorm.split(' ').filter(Boolean)
  const qContent  = qTokens.filter(w => !STOPWORDS.has(w))
  const keyWords  = (qContent.length ? qContent : qTokens)
  const keyStems  = keyWords.map(stem).filter(w => w.length > 1)
  const stemSet   = new Set(keyStems)

  const hits: SearchHit[] = []

  for (const row of index) {
    if (book && row.book !== book) continue
    const hayNorm = normalize(row.text)
    let score = 0

    // 1. Exact-phrase — query appears verbatim. Strongest signal.
    if (hayNorm.includes(qNorm)) {
      score = 3 + Math.min(1, qNorm.length / hayNorm.length)
    }

    if (mode === 'phrase') {
      if (score > 0) hits.push({ ...row, score, tx: txId })
      continue
    }

    // 2. Word coverage — share of the remembered key words present (stemmed).
    if (stemSet.size) {
      const hayStems = hayNorm.split(' ').map(stem)
      const haySet = new Set(hayStems)
      let present = 0
      for (const s of stemSet) if (haySet.has(s)) present++
      const coverage = present / stemSet.size

      if (mode === 'all') {
        if (present === stemSet.size) score = Math.max(score, 1 + coverage)
      } else if (mode === 'any') {
        if (present > 0) score = Math.max(score, coverage)
      } else {
        // smart: coverage contributes, with a bonus for high coverage.
        if (present > 0) {
          let s = coverage * 1.6
          // 3. Adjacency — reward key words appearing near each other / in order.
          const positions = keyStems
            .map(st => hayStems.indexOf(st))
            .filter(p => p >= 0)
          if (positions.length > 1) {
            const span = Math.max(...positions) - Math.min(...positions)
            const ideal = positions.length - 1
            if (span <= ideal * 2) s += 0.4          // tightly clustered
            const ordered = positions.every((p, i) => i === 0 || p >= positions[i - 1])
            if (ordered) s += 0.3                    // same order as the quote
          }
          // Prefer concise verses for short queries (less dilution).
          score = Math.max(score, s)
        }
      }
    }

    if (score > 0) hits.push({ ...row, score, tx: txId })
  }

  hits.sort((a, b) => b.score - a.score || a.text.length - b.text.length)
  return hits.slice(0, limit)
}

/**
 * Search several translations at once and merge by verse reference, keeping the
 * best-scoring wording. People quote whichever translation they remember, so
 * scanning WEB *and* KJV (and any other loaded text) and merging dramatically
 * improves recall — a KJV-phrased quote still finds the verse even when the
 * displayed default is WEB. The displayed text/tx is the highest-scoring match.
 */
export function searchBibleMerged(ids: string[], query: string, opts: SearchOpts = {}): SearchHit[] {
  const { limit = 30 } = opts
  const loaded = Array.from(new Set(ids.map(i => i.toUpperCase()))).filter(isLoaded)
  if (!loaded.length) return []

  const best = new Map<string, SearchHit>()
  for (const id of loaded) {
    // Pull a generous slice per translation, then merge & re-trim.
    for (const hit of searchBible(id, query, { ...opts, limit: limit * 3 })) {
      const key = `${hit.book}|${hit.chapter}|${hit.verse}`
      const cur = best.get(key)
      if (!cur || hit.score > cur.score) best.set(key, hit)
    }
  }

  return Array.from(best.values())
    .sort((a, b) => b.score - a.score || a.text.length - b.text.length)
    .slice(0, limit)
}

// ─── Highlight terms in a verse ────────────────────────────────────────────────

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Distinct query terms (>1 char, non-stopword) to visually mark in results. */
export function highlightTerms(query: string, mode: SearchMode): string[] {
  const qNorm = normalize(query)
  if (qNorm.length < 2) return []
  if (mode === 'phrase') return [qNorm]
  const words = qNorm.split(' ').filter(w => w.length > 1 && !STOPWORDS.has(w))
  return Array.from(new Set(words.length ? words : qNorm.split(' ').filter(Boolean)))
}

/** Build a single case-insensitive regex matching any highlight term. */
export function highlightRegex(terms: string[]): RegExp | null {
  if (!terms.length) return null
  // Match whole words (and simple suffix variants) so stems still light up.
  const parts = terms.map(t => escapeRe(t) + '\\w*')
  return new RegExp(`\\b(${parts.join('|')})`, 'gi')
}
