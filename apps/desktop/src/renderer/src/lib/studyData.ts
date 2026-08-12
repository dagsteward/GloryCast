// ─────────────────────────────────────────────────────────────────────────────
// Study data — cross-references, Strong's numbers and topics.
//
// Three datasets built by scripts/build-{crossrefs,strongs,topics}.mjs and
// served from public/data. Each is fetched lazily on first use, exactly like
// the bundled Bibles: together they are ~3.3 MB, which is worth avoiding on a
// cold start for a producer who only ever projects verses.
//
// Every dataset carries an attribution requirement (CC-BY / CC-BY-SA). The
// `licenseOf` helpers exist so the UI can render that alongside the data —
// it is a condition of the licence, not a nicety. See components/settings/
// Attributions.tsx for the full disclosure surface.
// ─────────────────────────────────────────────────────────────────────────────

/** Canonical 66-book order — dataset keys are "<bookIndex>.<chapter>.<verse>". */
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

const BOOK_INDEX = new Map(BOOKS.map((n, i) => [n.toLowerCase(), i + 1]))

export interface VerseRef {
  book: string
  chapter: number
  verse: number
  /** "John 3:16" — ready to display or hand to the projection queue. */
  ref: string
}

export interface StrongsEntry {
  id: string
  /** Original-language word (Greek or Hebrew script). */
  lemma: string
  transliteration: string
  definition: string
  /** How the KJV renders it. */
  kjvUsage: string
}

// ─── Lazy loading ────────────────────────────────────────────────────────────

interface CrossRefFile { license: string; refs: Record<string, string> }
interface StrongsFile  { license: string; entries: Record<string, { l: string; t: string; d: string; k: string }> }
interface TopicsFile   { license: string; topics: Record<string, string> }

let _crossRefs: CrossRefFile | null = null
let _strongs: StrongsFile | null = null
let _topics: TopicsFile | null = null

const _inflight = new Map<string, Promise<unknown>>()

/** Fetch a dataset once; concurrent callers share the same request. */
async function loadOnce<T>(name: string, assign: (data: T) => void): Promise<void> {
  const existing = _inflight.get(name)
  if (existing) { await existing; return }

  const p = (async () => {
    const res = await fetch(`data/${name}.json`)
    if (!res.ok) throw new Error(`${name} dataset failed to load (${res.status})`)
    assign((await res.json()) as T)
  })()

  _inflight.set(name, p)
  try {
    await p
  } catch {
    // A missing dataset must degrade to "no results", never break the page —
    // clearing the entry lets a later attempt retry rather than caching failure.
    _inflight.delete(name)
  }
}

export const loadCrossReferences = () => loadOnce<CrossRefFile>('cross-references', d => { _crossRefs = d })
export const loadStrongs         = () => loadOnce<StrongsFile>('strongs',          d => { _strongs = d })
export const loadTopics          = () => loadOnce<TopicsFile>('topics',            d => { _topics = d })

/** Load everything the study panels need. Safe to call repeatedly. */
export async function loadStudyData(): Promise<void> {
  await Promise.all([loadCrossReferences(), loadStrongs(), loadTopics()])
}

// ─── Key helpers ─────────────────────────────────────────────────────────────

function keyFor(book: string, chapter: number, verse: number): string | null {
  const index = BOOK_INDEX.get(book.toLowerCase())
  return index ? `${index}.${chapter}.${verse}` : null
}

/** "43.3.16" → { book: 'John', chapter: 3, verse: 16, ref: 'John 3:16' }. */
function parseKey(key: string): VerseRef | null {
  const [b, c, v] = key.split('.').map(Number)
  const book = BOOKS[b - 1]
  if (!book || !Number.isFinite(c) || !Number.isFinite(v)) return null
  return { book, chapter: c, verse: v, ref: `${book} ${c}:${v}` }
}

// ─── Public lookups ──────────────────────────────────────────────────────────

/**
 * Cross-references for a verse, strongest association first.
 * Empty until loadCrossReferences() has resolved.
 */
export function crossReferencesFor(book: string, chapter: number, verse: number): VerseRef[] {
  const key = keyFor(book, chapter, verse)
  const raw = key ? _crossRefs?.refs[key] : undefined
  if (!raw) return []
  return raw.split(',').map(parseKey).filter((r): r is VerseRef => r !== null)
}

/** A Strong's entry by id ("G26", "H430"), or null. */
export function strongsEntry(id: string): StrongsEntry | null {
  const raw = _strongs?.entries[id.toUpperCase()]
  if (!raw) return null
  return {
    id: id.toUpperCase(),
    lemma: raw.l,
    transliteration: raw.t,
    definition: raw.d,
    kjvUsage: raw.k,
  }
}

/** Passages for a topic, best-scoring first. Topic match is case-insensitive. */
export function versesForTopic(topic: string): VerseRef[] {
  const raw = _topics?.topics[topic.trim().toLowerCase()]
  if (!raw) return []
  return raw.split(',').map(parseKey).filter((r): r is VerseRef => r !== null)
}

/**
 * Topics whose name contains `query`, shortest first.
 *
 * Shortest-first matters: searching "love" should surface "love" itself ahead
 * of "love of money" and "brotherly love".
 */
export function searchTopics(query: string, limit = 25): string[] {
  const q = query.trim().toLowerCase()
  if (q.length < 2 || !_topics) return []

  const hits: string[] = []
  for (const name of Object.keys(_topics.topics)) {
    if (name.includes(q)) hits.push(name)
  }
  return hits.sort((a, b) => a.length - b.length || a.localeCompare(b)).slice(0, limit)
}

// ─── Attribution ─────────────────────────────────────────────────────────────
// Render these wherever the corresponding data is shown.

export const crossReferenceLicense = () => _crossRefs?.license ?? ''
export const strongsLicense        = () => _strongs?.license ?? ''
export const topicsLicense         = () => _topics?.license ?? ''

/** True once a dataset is resident, so panels can show a loading state. */
export const studyDataReady = () => ({
  crossRefs: _crossRefs !== null,
  strongs: _strongs !== null,
  topics: _topics !== null,
})
