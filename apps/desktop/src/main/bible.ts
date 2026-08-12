import { app, dialog, ipcMain } from 'electron'
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync } from 'fs'
import { basename, join } from 'path'

// ─────────────────────────────────────────────────────────────────────────────
// Bible library — BibleShow .bib translations (Microsoft Access / Jet 4).
//
// The renderer already ships public-domain WEB + KJV as JSON for instant,
// dependency-free projection. This module adds every OTHER translation the
// operator has on disk (NIV, ESV, NKJV, NLT, …), which cannot be bundled as
// JSON because the files are large and, for most of them, licensed.
//
// Parsing happens here rather than in the renderer for two reasons: mdb-reader
// is a Node library needing fs, and a 16 MB parse would jank the UI thread
// mid-service. Translations load lazily on first use and stay cached — loading
// all ten eagerly costs several seconds of startup and ~150 MB for text the
// operator may never project.
// ─────────────────────────────────────────────────────────────────────────────

/** Canonical 66-book order. .bib files key verses by this 1-based index. */
const BOOKS = [
  'Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth',
  '1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra',
  'Nehemiah','Esther','Job','Psalms','Proverbs','Ecclesiastes','Song of Solomon',
  'Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel','Hosea','Joel','Amos','Obadiah',
  'Jonah','Micah','Nahum','Habakkuk','Zephaniah','Haggai','Zechariah','Malachi',
  'Matthew','Mark','Luke','John','Acts','Romans','1 Corinthians','2 Corinthians',
  'Galatians','Ephesians','Philippians','Colossians','1 Thessalonians','2 Thessalonians',
  '1 Timothy','2 Timothy','Titus','Philemon','Hebrews','James','1 Peter','2 Peter',
  '1 John','2 John','3 John','Jude','Revelation',
]

const BOOK_ID = new Map<string, number>(BOOKS.map((n, i) => [n.toLowerCase(), i + 1]))

export interface TranslationInfo {
  /** Short id used everywhere else in the app, e.g. "NIV". */
  id: string
  name: string
  copyright: string
  /** True once the verse text is parsed and resident. */
  loaded: boolean
}

interface LoadedBible {
  info: TranslationInfo
  /** "book:chapter:verse" → text */
  verses: Map<string, string>
}

const _cache = new Map<string, LoadedBible>()
/** id → absolute .bib path, built once by scanning the library directory. */
const _catalogue = new Map<string, { path: string; info: TranslationInfo }>()
let _scanned = false

/**
 * Where imported translations are kept — the user's own library.
 *
 * GloryCast deliberately ships NO copyrighted translations. The installer
 * contains only public-domain text (WEB + KJV, bundled as JSON in the
 * renderer). Everything else is text the church already owns a licence to,
 * added here by the operator — the same model ProPresenter and EasyWorship
 * use, and the only one that is lawful for a product we sell.
 *
 * Lives under userData so an app update never deletes a library the user
 * assembled themselves.
 */
export function userLibraryDirectory(): string {
  const dir = join(app.getPath('userData'), 'Bibles')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

/**
 * Every directory scanned for .bib files, in priority order. Multiple roots
 * rather than one so an operator can point at an existing BibleShow library
 * without having to copy files out of it.
 */
function libraryDirectories(): string[] {
  const dirs = [userLibraryDirectory()]

  const override = process.env.GLORYCAST_BIBLES_PATH
  if (override && existsSync(override)) dirs.push(override)

  // Development convenience only: the in-repo sample library. Never present in
  // a packaged build, so it cannot cause unlicensed text to ship.
  if (!app.isPackaged) {
    const dev = join(app.getAppPath(), '..', '..', 'packages', 'bible-engine', 'Bibles')
    if (existsSync(dev)) dirs.push(dev)
  }

  return dirs
}

async function openMdb(filePath: string): Promise<any> {
  const mod: any = await import('mdb-reader')
  const MDBReader = mod.default ?? mod.MDBReader ?? mod
  return new MDBReader(readFileSync(filePath))
}

/** Shape written by an API.Bible download: books[name] = chapters[] of verse text. */
interface JsonBible { t: string; name: string; books: Record<string, string[][]> }

/** Read only the Info table — enough to list a translation without parsing 31k verses. */
async function readInfo(filePath: string): Promise<TranslationInfo | null> {
  // Translations downloaded from API.Bible are stored as JSON rather than .bib,
  // so the library holds both shapes side by side.
  if (filePath.toLowerCase().endsWith('.json')) {
    try {
      const j = JSON.parse(readFileSync(filePath, 'utf8')) as JsonBible
      if (!j?.t || !j?.books) return null
      return { id: j.t.toUpperCase(), name: j.name ?? j.t, copyright: '', loaded: false }
    } catch {
      return null
    }
  }

  try {
    const db = await openMdb(filePath)
    const rows: Array<{ Parameter: string; Value: unknown }> = db.getTable('Info').getData()
    const info: Record<string, string> = {}
    for (const r of rows) {
      if (r.Parameter && r.Value != null) info[r.Parameter] = String(r.Value)
    }
    const id = info['BibleShortName']?.trim()
    if (!id) return null
    return {
      id: id.toUpperCase(),
      name: info['BibleFullName'] ?? id,
      copyright: info['Copyright'] ?? '',
      loaded: false,
    }
  } catch {
    return null
  }
}

/**
 * Force the next scan to re-read the library from disk.
 *
 * Anything that adds or removes a translation file OUTSIDE this module (the
 * API.Bible downloader writes straight into the library directory) must call
 * this, or `scan()`'s `_scanned` guard will keep serving the catalogue built at
 * startup and the new translation will never appear in the installed list.
 */
export function invalidateCatalogue(): void {
  _scanned = false
}

/** Build the id → file map across every library root. */
async function scan(force = false): Promise<void> {
  if (_scanned && !force) return
  _scanned = true
  if (force) _catalogue.clear()

  for (const dir of libraryDirectories()) {
    if (!existsSync(dir)) continue
    const files = readdirSync(dir).filter(f => /\.(bib|json)$/i.test(f))
    for (const file of files) {
      const full = join(dir, file)
      const info = await readInfo(full)
      // First root wins, so a translation the user imported takes precedence
      // over the same id found in a linked external library.
      if (info && !_catalogue.has(info.id)) _catalogue.set(info.id, { path: full, info })
    }
  }
}

/** Parse a translation's full verse table, caching the result. */
async function load(id: string): Promise<LoadedBible | null> {
  const key = id.toUpperCase()
  const cached = _cache.get(key)
  if (cached) return cached

  await scan()
  const entry = _catalogue.get(key)
  if (!entry) return null

  try {
    if (entry.path.toLowerCase().endsWith('.json')) {
      const j = JSON.parse(readFileSync(entry.path, 'utf8')) as JsonBible
      const verses = new Map<string, string>()
      for (const [bookName, chapters] of Object.entries(j.books)) {
        const bookId = BOOK_ID.get(bookName.toLowerCase())
        if (!bookId) continue
        chapters.forEach((verseList, ci) => {
          verseList.forEach((text, vi) => {
            if (text) verses.set(`${bookId}:${ci + 1}:${vi + 1}`, text)
          })
        })
      }
      const loaded: LoadedBible = { info: { ...entry.info, loaded: true }, verses }
      _cache.set(key, loaded)
      return loaded
    }

    const db = await openMdb(entry.path)
    const rows: Array<{ Book: number; Chapter: number; Verse: number; Scripture: string }> =
      db.getTable('Bible').getData()

    const verses = new Map<string, string>()
    for (const r of rows) {
      if (r.Book && r.Chapter && r.Verse && r.Scripture) {
        verses.set(`${r.Book}:${r.Chapter}:${r.Verse}`, String(r.Scripture))
      }
    }

    const loaded: LoadedBible = { info: { ...entry.info, loaded: true }, verses }
    _cache.set(key, loaded)
    return loaded
  } catch {
    return null
  }
}

/** Verse text for a reference, or '' when the translation or verse is absent. */
async function verseText(
  translation: string,
  book: string,
  chapter: number,
  verse?: number,
  endVerse?: number,
): Promise<string> {
  const bible = await load(translation)
  if (!bible) return ''

  const bookId = BOOK_ID.get(book.toLowerCase())
  if (!bookId) return ''

  // No verse means a whole-chapter request. Deliberately NOT supported for
  // projection — a full chapter is unreadable as a lower third — but the Bible
  // page uses it for browsing, so it is returned joined.
  if (verse === undefined) {
    const out: string[] = []
    for (let v = 1; v <= 200; v++) {
      const t = bible.verses.get(`${bookId}:${chapter}:${v}`)
      if (!t) break
      out.push(t)
    }
    return out.join(' ')
  }

  const first = bible.verses.get(`${bookId}:${chapter}:${verse}`)
  if (!first) return ''
  if (!endVerse || endVerse <= verse) return first

  const parts = [first]
  for (let v = verse + 1; v <= endVerse; v++) {
    const t = bible.verses.get(`${bookId}:${chapter}:${v}`)
    if (!t) break
    parts.push(t)
  }
  return parts.join(' ')
}

export function registerBible(): void {
  ipcMain.handle('bible:list', async () => {
    await scan()
    return Array.from(_catalogue.values()).map(e => ({
      ...e.info,
      loaded: _cache.has(e.info.id),
      /** True when the file sits in the user's own library (removable). */
      removable: e.path.startsWith(userLibraryDirectory()),
    }))
  })

  ipcMain.handle('bible:library-dir', () => userLibraryDirectory())

  /**
   * Import a translation the church already owns. Copies the file into the
   * user library so the original can move or be unplugged without the
   * translation vanishing mid-service.
   */
  ipcMain.handle('bible:import', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Add Bible translation',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Bible translations', extensions: ['bib'] }],
    })
    if (result.canceled || result.filePaths.length === 0) return { ok: false, added: [] }

    const added: string[] = []
    const failed: string[] = []

    for (const src of result.filePaths) {
      try {
        // Validate before copying: a file that cannot be parsed would
        // otherwise sit in the library looking installed but never work.
        const info = await readInfo(src)
        if (!info) { failed.push(basename(src)); continue }
        copyFileSync(src, join(userLibraryDirectory(), basename(src)))
        added.push(info.id)
      } catch {
        failed.push(basename(src))
      }
    }

    await scan(true)
    return { ok: added.length > 0, added, failed }
  })

  ipcMain.handle('bible:remove', async (_e, id: string) => {
    await scan()
    const entry = _catalogue.get(id.toUpperCase())
    // Only ever delete from the library we own. A translation discovered in an
    // external folder is the user's own file sitting somewhere else — removing
    // it here must not reach outside and destroy it.
    if (!entry || !entry.path.startsWith(userLibraryDirectory())) return { ok: false }

    try { unlinkSync(entry.path) } catch { return { ok: false } }
    _cache.delete(id.toUpperCase())
    await scan(true)
    return { ok: true }
  })

  ipcMain.handle('bible:verse', async (_e, payload: {
    translation: string; book: string; chapter: number; verse?: number; endVerse?: number
  }) => {
    const text = await verseText(
      payload.translation, payload.book, payload.chapter, payload.verse, payload.endVerse,
    )
    return { text, translation: payload.translation.toUpperCase() }
  })

  ipcMain.handle('bible:chapter', async (_e, payload: {
    translation: string; book: string; chapter: number
  }) => {
    const bible = await load(payload.translation)
    const bookId = BOOK_ID.get(payload.book.toLowerCase())
    if (!bible || !bookId) return []

    const out: Array<{ verse: number; text: string }> = []
    for (let v = 1; v <= 200; v++) {
      const t = bible.verses.get(`${bookId}:${payload.chapter}:${v}`)
      if (!t) break
      out.push({ verse: v, text: t })
    }
    return out
  })

  /**
   * Full search across a loaded translation.
   *
   * Ports the ranking from packages/bible-engine's SearchEngine — modes,
   * whole-word, testament/book scoping, scoring and highlight offsets —
   * operating directly on the verse maps this module already has resident.
   * Implemented here rather than importing the package because that package is
   * ESM TypeScript source and the main process compiles to CommonJS; going
   * through it would mean a build-config change for logic that is a few dozen
   * lines. Behaviour is the same, so the package remains the reference.
   *
   * Unlike the old substring scan, results are RANKED and it stops scanning
   * once enough have been collected — previously it returned whatever the map
   * happened to iterate first, which for a common word meant a page of Genesis.
   */
  ipcMain.handle('bible:search', async (_e, payload: {
    translation: string
    query: string
    limit?: number
    offset?: number
    mode?: 'all' | 'any' | 'phrase'
    caseSensitive?: boolean
    wholeWord?: boolean
    testament?: 'OT' | 'NT' | 'both'
    books?: string[]
  }) => {
    const bible = await load(payload.translation)
    if (!bible) return { results: [], total: 0 }

    const raw = payload.query.trim()
    if (raw.length < 2) return { results: [], total: 0 }

    const {
      mode = 'all', caseSensitive = false, wholeWord = false,
      testament = 'both', limit = 50, offset = 0,
    } = payload

    const tokens = mode === 'phrase' ? [raw] : raw.split(/\s+/).filter(Boolean)
    const bookFilter = payload.books?.length
      ? new Set(payload.books.map(b => BOOK_ID.get(b.toLowerCase())).filter(Boolean) as number[])
      : null

    const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const hit = (text: string, hay: string, token: string) => {
      const needle = caseSensitive ? token : token.toLowerCase()
      return wholeWord
        ? new RegExp(`\\b${esc(needle)}\\b`, caseSensitive ? '' : 'i').test(text)
        : hay.includes(needle)
    }

    const scored: Array<{
      book: string; chapter: number; verse: number; text: string; score: number
    }> = []

    for (const [key, text] of bible.verses) {
      const [b, c, v] = key.split(':').map(Number)

      // Books 1–39 are the Old Testament, 40–66 the New.
      if (testament === 'OT' && b > 39) continue
      if (testament === 'NT' && b <= 39) continue
      if (bookFilter && !bookFilter.has(b)) continue

      const book = BOOKS[b - 1]
      if (!book) continue

      const hay = caseSensitive ? text : text.toLowerCase()
      let score = 0

      if (mode === 'phrase' || tokens.length === 1) {
        if (hit(text, hay, tokens[0])) score = 1
      } else if (mode === 'all') {
        if (tokens.every(t => hit(text, hay, t))) score = tokens.length
      } else {
        const n = tokens.filter(t => hit(text, hay, t)).length
        if (n > 0) score = n / tokens.length
      }

      if (score > 0) scored.push({ book, chapter: c, verse: v, text, score })
    }

    // Rank: strongest match first, then the more concise verse — a short verse
    // containing the phrase is almost always the one being looked for.
    scored.sort((a, b) => b.score - a.score || a.text.length - b.text.length)

    return { results: scored.slice(offset, offset + limit), total: scored.length }
  })
}
