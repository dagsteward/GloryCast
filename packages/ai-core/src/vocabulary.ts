// ─────────────────────────────────────────────────────────────────────────────
// Scripture-aware language priors.
//
// A general ASR model has never been trained on a Sunday sermon. Left alone it
// renders "Habakkuk" as "have a cook", "Melchizedek" as "mel kizzy deck", and —
// worst of all for us — "Ephesians two eight" as "if he shuns two eight".
// Every one of those failures breaks scripture detection downstream.
//
// Whisper accepts an initial prompt that conditions decoding. Feeding it the
// vocabulary a church actually uses is the single highest-leverage accuracy
// win available, and it costs nothing at runtime.
// ─────────────────────────────────────────────────────────────────────────────

/** All 66 books, the tokens most likely to appear next to a chapter number. */
export const BIBLE_BOOKS = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges',
  'Ruth', 'First Samuel', 'Second Samuel', 'First Kings', 'Second Kings',
  'First Chronicles', 'Second Chronicles', 'Ezra', 'Nehemiah', 'Esther', 'Job',
  'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah',
  'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos', 'Obadiah',
  'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah',
  'Malachi', 'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans',
  'First Corinthians', 'Second Corinthians', 'Galatians', 'Ephesians',
  'Philippians', 'Colossians', 'First Thessalonians', 'Second Thessalonians',
  'First Timothy', 'Second Timothy', 'Titus', 'Philemon', 'Hebrews', 'James',
  'First Peter', 'Second Peter', 'First John', 'Second John', 'Third John',
  'Jude', 'Revelation',
] as const

/** Names and terms that recur constantly and that ASR reliably mangles. */
export const CHURCH_VOCABULARY = [
  'Jesus Christ', 'Yahweh', 'Jehovah', 'Messiah', 'Emmanuel', 'Holy Spirit',
  'Melchizedek', 'Nebuchadnezzar', 'Zerubbabel', 'Bartholomew', 'Thessalonica',
  'Corinth', 'Galilee', 'Nazareth', 'Bethlehem', 'Jerusalem', 'Samaria',
  'Gethsemane', 'Golgotha', 'Calvary', 'Pentecost', 'Passover',
  'righteousness', 'redemption', 'sanctification', 'justification',
  'atonement', 'covenant', 'discipleship', 'testimony', 'benediction',
  'doxology', 'hallelujah', 'amen', 'apostle', 'epistle', 'parable',
  'tabernacle', 'sanctuary', 'congregation', 'communion', 'baptism',
] as const

/**
 * Build the prompt handed to Whisper before each segment.
 *
 * Kept well under Whisper's 224-token prompt budget: overflow silently drops
 * the *end* of the prompt, so an over-long list would quietly discard the very
 * terms we care most about. Books come first for that reason.
 *
 * `recentContext` carries the tail of what was just said, which helps the model
 * stay consistent across an utterance boundary mid-sentence.
 */
export function buildScripturePrompt(recentContext = ''): string {
  // A sentence-shaped prompt conditions better than a bare word list, because
  // it matches the distribution Whisper was trained on.
  const books = BIBLE_BOOKS.slice(0, 40).join(', ')
  const base =
    `The following is a church service. Scripture references and names are used often: ${books}.`

  const tail = recentContext.trim().slice(-180)
  return tail ? `${base} ${tail}` : base
}

/**
 * Spoken-form numbers that appear in references, so "chapter three verse
 * sixteen" and "three sixteen" both survive to the detector.
 */
export const SPOKEN_NUMBERS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14,
  fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
  eighty: 80, ninety: 90, hundred: 100,
}

/**
 * Normalise spoken references into the digit form the scripture detector
 * expects: "John chapter three verse sixteen" → "John 3:16".
 *
 * Whisper often writes numbers as words in conversational speech, and the
 * existing regex detector only matches digits — so without this pass, a
 * correctly transcribed reference still fails to detect.
 */
export function normalizeSpokenReferences(text: string): string {
  let out = text

  // "chapter N verse M" / "chapter N verses M through P"
  out = out.replace(
    /\b(chapter)\s+([\w-]+)\s+(?:verse|verses)\s+([\w-]+)(?:\s*(?:through|to|and)\s*([\w-]+))?/gi,
    (match, _chapterWord, chapter, verse, endVerse) => {
      const c = parseSpokenNumber(chapter)
      const v = parseSpokenNumber(verse)
      if (c === null || v === null) return match
      const e = endVerse ? parseSpokenNumber(endVerse) : null
      return e !== null ? `${c}:${v}-${e}` : `${c}:${v}`
    },
  )

  // "chapter N" on its own
  out = out.replace(/\b(chapter)\s+([\w-]+)/gi, (match, _word, chapter) => {
    const c = parseSpokenNumber(chapter)
    return c === null ? match : String(c)
  })

  // A book name followed by two spoken numbers: "Romans eight twenty-eight".
  const bookPattern = BIBLE_BOOKS
    .map(b => b.replace(/^(First|Second|Third)\s/, '$1 '))
    .join('|')
  out = out.replace(
    new RegExp(`\\b(${bookPattern})\\s+([\\w-]+)\\s+([\\w-]+)`, 'gi'),
    (match, book, a, b) => {
      const chapter = parseSpokenNumber(a)
      const verse = parseSpokenNumber(b)
      if (chapter === null || verse === null) return match
      return `${book} ${chapter}:${verse}`
    },
  )

  // Ordinal book prefixes, so they match the detector's "1 Corinthians" form.
  out = out
    .replace(/\bFirst\s+(?=[A-Z])/g, '1 ')
    .replace(/\bSecond\s+(?=[A-Z])/g, '2 ')
    .replace(/\bThird\s+(?=[A-Z])/g, '3 ')

  return out
}

/** Parse "twenty-eight", "eight", or "28" into a number. Null if not numeric. */
export function parseSpokenNumber(input: string): number | null {
  const trimmed = input.trim().toLowerCase()
  if (!trimmed) return null

  if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10)

  // "twenty-eight" and "twenty eight" both occur in transcripts.
  const parts = trimmed.split(/[-\s]+/)
  let total = 0
  let matched = false

  for (const part of parts) {
    const value = SPOKEN_NUMBERS[part]
    if (value === undefined) return null
    matched = true
    // "one hundred" multiplies rather than adds.
    total = value === 100 ? Math.max(1, total) * 100 : total + value
  }

  return matched ? total : null
}
