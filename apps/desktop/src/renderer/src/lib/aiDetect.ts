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

const BOOK_PATTERN = BOOK_NAMES
  .map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  .join('|')

const SCRIPTURE_REGEX = new RegExp(
  `\\b(${BOOK_PATTERN})\\.?\\s+(\\d{1,3})(?::\\s*(\\d{1,3})(?:\\s*[-–]\\s*(\\d{1,3}))?)?`,
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

function normalizeBook(raw: string): string {
  return ABBREV_MAP[raw.toLowerCase().trim()] ?? raw.trim()
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

/** Fetch verse text from the local backend. Defaults to the church translation (NIV). */
export async function fetchVerseText(
  book: string,
  chapter: number,
  verse?: number,
  translation = 'NIV',
): Promise<string> {
  try {
    const path = verse
      ? `/reference/${encodeURIComponent(book)}/${chapter}/${verse}?translation=${translation}`
      : `/reference/${encodeURIComponent(book)}/${chapter}?translation=${translation}`
    const res = await fetch(`http://localhost:3001/api/v1/bible${path}`)
    if (!res.ok) return ''
    const data = await res.json()
    const verses: any[] = data?.data?.verses ?? []
    return verses.map((v: any) => v.text).join(' ')
  } catch {
    return ''
  }
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
