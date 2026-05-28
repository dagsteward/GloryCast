import type { BibDatabase } from '../readers/MdbReader.js'
import type { SearchOptions, SearchResult, SearchResponse } from '../types/features.js'
import { BOOK_BY_ID } from '../data/books.js'
import { formatRef } from '../core/ReferenceParser.js'

export class SearchEngine {
  constructor(private databases: Map<string, BibDatabase>) {}

  search(query: string, options: SearchOptions = {}): SearchResponse {
    const start = Date.now()
    const {
      translations,
      books,
      testament = 'both',
      caseSensitive = false,
      wholeWord = false,
      mode = 'all',
      limit = 100,
      offset = 0,
    } = options

    if (!query.trim()) return { results: [], total: 0, query, elapsed: 0 }

    // Parse query into tokens
    let tokens: string[]
    if (mode === 'phrase') {
      tokens = [query.trim()]
    } else {
      tokens = query.trim().split(/\s+/).filter(Boolean)
    }

    const allResults: SearchResult[] = []
    const dbsToSearch = translations
      ? [...this.databases.entries()].filter(([id]) => translations.includes(id))
      : [...this.databases.entries()]

    for (const [translationId, db] of dbsToSearch) {
      for (const [key, rawText] of db.verses) {
        const [b, c, v] = key.split(':').map(Number)

        // Testament filter
        const bookMeta = BOOK_BY_ID.get(b)
        if (!bookMeta) continue
        if (testament === 'OT' && bookMeta.testament !== 'OT') continue
        if (testament === 'NT' && bookMeta.testament !== 'NT') continue
        if (books && !books.includes(b)) continue

        const text = rawText
        const haystack = caseSensitive ? text : text.toLowerCase()

        // Match based on mode
        let matched = false
        let score = 0
        const highlights: [number, number][] = []

        if (mode === 'phrase' || tokens.length === 1) {
          const needle = caseSensitive ? tokens[0] : tokens[0].toLowerCase()
          matched = wholeWord
            ? new RegExp(`\\b${esc(needle)}\\b`, caseSensitive ? '' : 'i').test(text)
            : haystack.includes(needle)
          if (matched) {
            score = 1
            findHighlights(text, tokens[0], caseSensitive, highlights)
          }
        } else if (mode === 'all') {
          matched = tokens.every(t => {
            const needle = caseSensitive ? t : t.toLowerCase()
            return wholeWord
              ? new RegExp(`\\b${esc(needle)}\\b`, caseSensitive ? '' : 'i').test(text)
              : haystack.includes(needle)
          })
          if (matched) {
            score = tokens.length
            for (const t of tokens) findHighlights(text, t, caseSensitive, highlights)
          }
        } else { // any
          const matchedTokens = tokens.filter(t => {
            const needle = caseSensitive ? t : t.toLowerCase()
            return wholeWord
              ? new RegExp(`\\b${esc(needle)}\\b`, caseSensitive ? '' : 'i').test(text)
              : haystack.includes(needle)
          })
          matched = matchedTokens.length > 0
          if (matched) {
            score = matchedTokens.length / tokens.length
            for (const t of matchedTokens) findHighlights(text, t, caseSensitive, highlights)
          }
        }

        if (matched) {
          allResults.push({
            ref: { book: b, chapter: c, verse: v },
            text,
            translation: translationId,
            score,
            highlights,
            bookName: bookMeta.name,
            reference: formatRef({ book: b, chapter: c, verse: v }),
          })
        }
      }
    }

    // Sort by book order, then score
    allResults.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      if (a.ref.book !== b.ref.book) return a.ref.book - b.ref.book
      if (a.ref.chapter !== b.ref.chapter) return a.ref.chapter - b.ref.chapter
      return a.ref.verse - b.ref.verse
    })

    const paginated = allResults.slice(offset, offset + limit)

    return {
      results: paginated,
      total: allResults.length,
      query,
      elapsed: Date.now() - start,
    }
  }

  /** Boolean search: supports AND, OR, NOT operators and quoted phrases */
  booleanSearch(query: string, options: Omit<SearchOptions, 'mode'> = {}): SearchResponse {
    // Tokenize with boolean operators
    const tokens = tokenizeBooleanQuery(query)
    if (!tokens.length) return { results: [], total: 0, query, elapsed: 0 }

    const start = Date.now()
    const results: SearchResult[] = []

    const dbsToSearch = options.translations
      ? [...this.databases.entries()].filter(([id]) => options.translations!.includes(id))
      : [...this.databases.entries()]

    for (const [translationId, db] of dbsToSearch) {
      for (const [key, text] of db.verses) {
        const [b, c, v] = key.split(':').map(Number)
        const bookMeta = BOOK_BY_ID.get(b)
        if (!bookMeta) continue
        if (options.testament === 'OT' && bookMeta.testament !== 'OT') continue
        if (options.testament === 'NT' && bookMeta.testament !== 'NT') continue
        if (options.books && !options.books.includes(b)) continue

        if (evaluateBooleanTokens(tokens, text)) {
          results.push({
            ref: { book: b, chapter: c, verse: v },
            text,
            translation: translationId,
            score: 1,
            highlights: [],
            bookName: bookMeta.name,
            reference: formatRef({ book: b, chapter: c, verse: v }),
          })
        }
      }
    }

    return {
      results: results.slice(0, options.limit ?? 100),
      total: results.length,
      query,
      elapsed: Date.now() - start,
    }
  }

  /** Find all verses containing a specific word with Strong's-like analysis */
  wordStudy(word: string, translationId?: string): SearchResult[] {
    return this.search(word, {
      translations: translationId ? [translationId] : undefined,
      wholeWord: true,
      mode: 'phrase',
      limit: 500,
    }).results
  }
}

function findHighlights(text: string, token: string, caseSensitive: boolean, out: [number, number][]): void {
  const haystack = caseSensitive ? text : text.toLowerCase()
  const needle = caseSensitive ? token : token.toLowerCase()
  let idx = 0
  while ((idx = haystack.indexOf(needle, idx)) !== -1) {
    out.push([idx, idx + needle.length])
    idx += needle.length
  }
}

function esc(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

type BoolToken = { type: 'word' | 'phrase' | 'AND' | 'OR' | 'NOT' | 'LPAREN' | 'RPAREN'; value?: string }

function tokenizeBooleanQuery(query: string): BoolToken[] {
  const tokens: BoolToken[] = []
  const regex = /"[^"]+"|AND|OR|NOT|\(|\)|[\w'-]+/g
  let m: RegExpExecArray | null
  while ((m = regex.exec(query)) !== null) {
    const t = m[0]
    if (t === 'AND') tokens.push({ type: 'AND' })
    else if (t === 'OR') tokens.push({ type: 'OR' })
    else if (t === 'NOT') tokens.push({ type: 'NOT' })
    else if (t === '(') tokens.push({ type: 'LPAREN' })
    else if (t === ')') tokens.push({ type: 'RPAREN' })
    else if (t.startsWith('"')) tokens.push({ type: 'phrase', value: t.slice(1, -1) })
    else tokens.push({ type: 'word', value: t })
  }
  return tokens
}

function evaluateBooleanTokens(tokens: BoolToken[], text: string): boolean {
  const lower = text.toLowerCase()
  const check = (val: string) => lower.includes(val.toLowerCase())

  // Simple left-to-right evaluation (no precedence)
  let result = true
  let op: 'AND' | 'OR' = 'AND'
  let negate = false

  for (const token of tokens) {
    if (token.type === 'AND') { op = 'AND'; continue }
    if (token.type === 'OR')  { op = 'OR';  continue }
    if (token.type === 'NOT') { negate = true; continue }
    if (token.type === 'word' || token.type === 'phrase') {
      const match = negate ? !check(token.value!) : check(token.value!)
      result = op === 'AND' ? result && match : result || match
      negate = false
    }
  }
  return result
}
