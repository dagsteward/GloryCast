export type Testament = 'OT' | 'NT'

export type BibleGenre =
  | 'Law'
  | 'History'
  | 'Wisdom'
  | 'MajorProphets'
  | 'MinorProphets'
  | 'Gospels'
  | 'Acts'
  | 'PaulEpistles'
  | 'GeneralEpistles'
  | 'Revelation'

export interface BibleBook {
  id: number               // 1–66
  name: string             // "Genesis"
  shortName: string        // "Gen"
  abbreviations: string[]  // ['Gen', 'Ge', 'Gn']
  testament: Testament
  genre: BibleGenre
  chapterCount: number
  verseCount: number
  author?: string
  period?: string          // approximate writing date
  hebrewName?: string
  greekName?: string
  summary?: string
}

export interface VerseRef {
  book: number             // 1–66
  chapter: number
  verse: number
  endVerse?: number        // for ranges like John 3:16-17
  endChapter?: number      // for ranges like John 3:16-4:5
}

export interface ParsedReference {
  ref: VerseRef
  raw: string
  formatted: string
  isRange: boolean
  isValid: boolean
  error?: string
}

export interface BibleVerse {
  ref: VerseRef
  text: string
  translation: string
  wordsOfChrist?: boolean  // red-letter text
  footnotes?: string[]
  strongs?: StrongsWord[]
}

export interface StrongsWord {
  word: string
  number: string           // 'G3056' | 'H1254'
  index: number            // position in verse
}

export interface BibleChapter {
  book: number
  chapter: number
  verses: BibleVerse[]
  translation: string
  title?: string
}

export interface BiblePassage {
  start: VerseRef
  end: VerseRef
  verses: BibleVerse[]
  translation: string
  reference: string        // "John 3:16-17"
}

export interface BibleTranslation {
  id: string               // 'KJV'
  name: string             // 'King James Version (1769)'
  abbreviation: string     // 'KJV'
  year: number
  language: string
  languageCode: string     // 'en'
  copyright?: string
  publisher?: string
  description?: string
  website?: string
  hasStrongs?: boolean
  hasRedWords?: boolean
  hasFootnotes?: boolean
  hasCrossReferences?: boolean
  hasApocrypha?: boolean
  loaded: boolean
  path?: string
  verseCount?: number
}

export interface ComparisonResult {
  ref: VerseRef
  reference: string
  translations: { id: string; name: string; text: string }[]
}
