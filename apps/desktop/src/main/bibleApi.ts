import { BrowserWindow, ipcMain } from 'electron'
import { writeFileSync } from 'fs'
import { join } from 'path'
import type { AppStore } from './store'
import { invalidateCatalogue, userLibraryDirectory } from './bible'

// ─────────────────────────────────────────────────────────────────────────────
// API.Bible — online translation catalogue (American Bible Society).
//
// This is how GloryCast reaches translations it cannot ship: the church's own
// licensed text served under ABS's terms, plus a large public-domain set that
// is free to use with any key. Nothing here is redistributed by us — each
// request is made by the operator's own installation under their own key,
// which is what keeps licensed text lawful.
//
// Runs in the main process so the key never touches renderer code (and so a
// devtools-open renderer cannot leak it), and so responses can be cached
// across windows.
// ─────────────────────────────────────────────────────────────────────────────

const BASE = 'https://api.scripture.api.bible/v1'

/** Cache verse text for the whole session — a re-projected verse must not re-hit the network mid-service. */
const _verseCache = new Map<string, string>()
let _biblesCache: ApiBible[] | null = null

export interface ApiBible {
  id: string
  abbreviation: string
  name: string
  language: string
  /** ABS marks the freely-usable texts; surfaced so the UI can group them. */
  isPublicDomain: boolean
}

function keyOf(store: AppStore): string {
  return (store.get('bibleApiKey') as string | undefined)?.trim() ?? ''
}

async function request(store: AppStore, path: string, retries = 3): Promise<any | null> {
  const key = keyOf(store)
  if (!key) return null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${BASE}${path}`, { headers: { 'api-key': key } })
      if (res.ok) return await res.json()

      // 429/503 under a parallel download is expected back-pressure, not
      // failure. Returning null here would have written a silently INCOMPLETE
      // translation to disk and still reported success — worse than being slow.
      if ((res.status === 429 || res.status >= 500) && attempt < retries) {
        const retryAfter = Number(res.headers.get('retry-after')) * 1000
        await new Promise(r => setTimeout(r, retryAfter || 400 * 2 ** attempt))
        continue
      }
      return null
    } catch {
      // Offline is an expected state for a church running a service on a flaky
      // connection. Retry briefly, then let the caller fall back to local text.
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 400 * 2 ** attempt))
        continue
      }
      return null
    }
  }
  return null
}

/**
 * Run `task` over `items` with bounded concurrency.
 *
 * The download was originally sequential: ~1,190 chapters × one round trip
 * each is minutes of latency doing nothing but waiting. Eight in flight keeps
 * it well inside API.Bible's rate limit while cutting wall-clock time by
 * roughly an order of magnitude.
 */
async function mapPool<T, R>(
  items: T[], limit: number, task: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out = new Array<R>(items.length)
  let cursor = 0

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = cursor++
      if (i >= items.length) return
      out[i] = await task(items[i], i)
    }
  })

  await Promise.all(workers)
  return out
}

/**
 * Convert a book/chapter/verse into API.Bible's passage id ("JHN.3.16").
 * Their ids are the standard 3-letter USFM codes.
 */
const USFM: Record<string, string> = {
  'genesis':'GEN','exodus':'EXO','leviticus':'LEV','numbers':'NUM','deuteronomy':'DEU',
  'joshua':'JOS','judges':'JDG','ruth':'RUT','1 samuel':'1SA','2 samuel':'2SA',
  '1 kings':'1KI','2 kings':'2KI','1 chronicles':'1CH','2 chronicles':'2CH','ezra':'EZR',
  'nehemiah':'NEH','esther':'EST','job':'JOB','psalms':'PSA','proverbs':'PRO',
  'ecclesiastes':'ECC','song of solomon':'SNG','isaiah':'ISA','jeremiah':'JER',
  'lamentations':'LAM','ezekiel':'EZK','daniel':'DAN','hosea':'HOS','joel':'JOL',
  'amos':'AMO','obadiah':'OBA','jonah':'JON','micah':'MIC','nahum':'NAM',
  'habakkuk':'HAB','zephaniah':'ZEP','haggai':'HAG','zechariah':'ZEC','malachi':'MAL',
  'matthew':'MAT','mark':'MRK','luke':'LUK','john':'JHN','acts':'ACT','romans':'ROM',
  '1 corinthians':'1CO','2 corinthians':'2CO','galatians':'GAL','ephesians':'EPH',
  'philippians':'PHP','colossians':'COL','1 thessalonians':'1TH','2 thessalonians':'2TH',
  '1 timothy':'1TI','2 timothy':'2TI','titus':'TIT','philemon':'PHM','hebrews':'HEB',
  'james':'JAS','1 peter':'1PE','2 peter':'2PE','1 john':'1JN','2 john':'2JN',
  '3 john':'3JN','jude':'JUD','revelation':'REV',
}

/**
 * Strip markup but KEEP verse numbers.
 *
 * The download splits a chapter into verses on those numbers, so they are
 * structural there, not noise.
 */
function stripTags(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/¶/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Strip markup AND verse numbers, for text that goes straight to screen.
 *
 * Deliberately separate from stripTags: this must never be used on chapter
 * content destined for the verse splitter, because removing the numbers first
 * leaves nothing to split on — which silently produced empty downloads.
 */
function clean(raw: string): string {
  return stripTags(raw).replace(/\[\d+\]/g, '').replace(/\s+/g, ' ').trim()
}

/** USFM code → canonical book name, for writing the downloaded file. */
const NAME_BY_USFM = new Map(Object.entries(USFM).map(([name, code]) => [
  code,
  name.replace(/\b\w/g, c => c.toUpperCase()).replace(/\bOf\b/, 'of'),
]))

/**
 * Download a whole translation and store it locally so it projects offline.
 *
 * Fetches chapter-at-a-time with verse numbers included, then splits on those
 * numbers — one request per chapter (~1,190) rather than one per verse
 * (~31,100), which keeps a download inside a free-tier daily quota.
 */
async function downloadTranslation(
  store: AppStore,
  bibleId: string,
  abbreviation: string,
  name: string,
  onProgress: (done: number, total: number) => void,
): Promise<{ ok: boolean; error?: string; verses?: number }> {
  const booksJson = await request(store, `/bibles/${bibleId}/books`)
  if (!booksJson?.data) return { ok: false, error: 'Could not read the book list — check the API key.' }

  const books = (booksJson.data as any[]).filter(b => NAME_BY_USFM.has(b.id))

  // Phase 1 — chapter ids, 8 books in flight.
  const perBook = await mapPool(books, 8, async (b) => {
    const chJson = await request(store, `/bibles/${bibleId}/books/${b.id}/chapters`)
    return ((chJson?.data as any[]) ?? [])
      // ABS includes an "intro" pseudo-chapter that has no verses.
      .filter(c => c.number && c.number !== 'intro')
      .map(c => ({ bookCode: b.id as string, id: c.id as string }))
  })

  const chapters = perBook.flat()
  if (chapters.length === 0) return { ok: false, error: 'This translation returned no chapters.' }

  // Phase 2 — chapter text, 8 in flight. Order is preserved by mapPool, which
  // matters: chapters must land in their real sequence, not completion order.
  let done = 0
  let failed = 0

  const fetched = await mapPool(chapters, 8, async (ch) => {
    const json = await request(
      store,
      `/bibles/${bibleId}/chapters/${ch.id}` +
      '?content-type=text&include-notes=false&include-titles=false&include-verse-numbers=true',
    )

    done++
    if (done % 20 === 0 || done === chapters.length) onProgress(done, chapters.length)

    if (!json?.data?.content) { failed++; return { bookCode: ch.bookCode, verses: [] as string[] } }

    // Split on the leading verse numbers the API interleaves into the text.
    // stripTags, NOT clean — the verse numbers are the delimiters here.
    const parts = stripTags(json.data.content).split(/\s*\[?(\d{1,3})\]?\s+/).filter(Boolean)
    const verses: string[] = []
    for (let i = 0; i < parts.length - 1; i += 2) {
      const n = parseInt(parts[i], 10)
      const text = parts[i + 1]?.trim()
      if (Number.isFinite(n) && text) verses[n - 1] = text
    }
    return { bookCode: ch.bookCode, verses }
  })

  // A translation missing chapters would project blank verses mid-service, so
  // refuse to install it rather than leave a quietly broken Bible on disk.
  if (failed > 0) {
    return { ok: false, error: `${failed} of ${chapters.length} chapters failed to download — not installed. Check the connection or rate limit and retry.` }
  }

  const out: Record<string, string[][]> = {}
  let verseCount = 0
  for (const ch of fetched) {
    const bookName = NAME_BY_USFM.get(ch.bookCode)!
    if (!out[bookName]) out[bookName] = []
    out[bookName].push(Array.from(ch.verses, v => v ?? ''))
    verseCount += ch.verses.filter(Boolean).length
  }

  if (verseCount === 0) return { ok: false, error: 'No verse text was returned — the key may lack access to this translation.' }

  writeFileSync(
    join(userLibraryDirectory(), `${abbreviation.toUpperCase()}.json`),
    JSON.stringify({ t: abbreviation.toUpperCase(), name, books: out }),
  )

  // The library catalogue is built once and cached; without this the file we
  // just wrote stays invisible until the app restarts.
  invalidateCatalogue()
  return { ok: true, verses: verseCount }
}

export function registerBibleApi(store: AppStore): void {
  ipcMain.handle('bibleapi:download', async (event, payload: {
    bibleId: string; abbreviation: string; name: string
  }) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    return downloadTranslation(
      store, payload.bibleId, payload.abbreviation, payload.name,
      (done, total) => win?.webContents.send('bibleapi:progress', {
        bibleId: payload.bibleId, done, total,
      }),
    )
  })

  ipcMain.handle('bibleapi:key-set', (_e, key: string) => {
    store.set('bibleApiKey', key.trim())
    // A new key means a different entitlement set; stale lists would lie.
    _biblesCache = null
    _verseCache.clear()
    return { ok: true }
  })

  ipcMain.handle('bibleapi:key-status', () => ({ configured: keyOf(store).length > 0 }))

  ipcMain.handle('bibleapi:list', async () => {
    if (_biblesCache) return _biblesCache

    const json = await request(store, '/bibles')
    if (!json?.data) return []

    _biblesCache = (json.data as any[]).map(b => ({
      id: b.id,
      abbreviation: b.abbreviationLocal ?? b.abbreviation ?? b.id,
      name: b.nameLocal ?? b.name ?? b.id,
      language: b.language?.name ?? '',
      // ABS exposes this as a licence/"type" hint rather than a flag; treat the
      // absence of a copyright holder as public domain.
      isPublicDomain: !b.copyright || /public domain/i.test(String(b.copyright)),
    })) as ApiBible[]

    return _biblesCache
  })

  ipcMain.handle('bibleapi:verse', async (_e, payload: {
    bibleId: string; book: string; chapter: number; verse?: number; endVerse?: number
  }) => {
    const code = USFM[payload.book.toLowerCase()]
    if (!code) return { text: '' }

    const ref = payload.verse === undefined
      ? `${code}.${payload.chapter}`
      : payload.endVerse && payload.endVerse > payload.verse
        ? `${code}.${payload.chapter}.${payload.verse}-${code}.${payload.chapter}.${payload.endVerse}`
        : `${code}.${payload.chapter}.${payload.verse}`

    const cacheKey = `${payload.bibleId}:${ref}`
    const hit = _verseCache.get(cacheKey)
    if (hit !== undefined) return { text: hit }

    const json = await request(
      store,
      `/bibles/${payload.bibleId}/passages/${ref}` +
      '?content-type=text&include-notes=false&include-titles=false&include-verse-numbers=false',
    )

    const text = clean(json?.data?.content ?? '')
    if (text) _verseCache.set(cacheKey, text)
    return { text }
  })
}
