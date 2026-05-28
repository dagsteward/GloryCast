import type { VerseRef, BibleVerse } from './bible.js'

// ─── Search ───────────────────────────────────────────────────────────────

export type SearchMode = 'phrase' | 'all' | 'any'

export interface SearchOptions {
  translations?: string[]
  books?: number[]
  testament?: 'OT' | 'NT' | 'both'
  caseSensitive?: boolean
  wholeWord?: boolean
  mode?: SearchMode
  limit?: number
  offset?: number
  includeApocrypha?: boolean
}

export interface SearchResult {
  ref: VerseRef
  text: string
  translation: string
  score: number
  highlights: [number, number][]  // [start, end] char positions
  bookName?: string
  reference?: string
}

export interface SearchResponse {
  results: SearchResult[]
  total: number
  query: string
  elapsed: number
}

// ─── Cross-references ─────────────────────────────────────────────────────

export interface CrossReference {
  source: VerseRef
  target: VerseRef
  note?: string
  weight?: number          // 1–10 relevance
}

export interface CrossReferenceResult {
  ref: VerseRef
  reference: string
  references: Array<{ ref: VerseRef; reference: string; note?: string }>
}

// ─── Strong's Concordance ─────────────────────────────────────────────────

export interface StrongsEntry {
  number: string           // 'G3056' | 'H1254'
  lemma: string            // original Greek/Hebrew
  transliteration: string
  phonetic?: string
  partOfSpeech?: string
  definition: string
  kjvUsage?: string        // how KJV translates this word
  derivation?: string
  notes?: string
  occurrences?: number
  relatedWords?: string[]
}

export interface WordStudyResult {
  word: string
  strongsNumber: string
  entry: StrongsEntry
  occurrences: BibleVerse[]
}

// ─── Topical Bible ────────────────────────────────────────────────────────

export interface TopicEntry {
  id: string
  name: string
  description?: string
  references: VerseRef[]
  subtopics?: string[]
  parentTopic?: string
  tags?: string[]
}

export interface TopicSearchResult {
  topics: TopicEntry[]
  total: number
}

// ─── Bookmarks & Notes ────────────────────────────────────────────────────

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink' | 'purple' | 'orange'

export interface Bookmark {
  id: string
  ref: VerseRef
  endRef?: VerseRef
  note?: string
  color?: HighlightColor
  tags?: string[]
  isFavorite?: boolean
  createdAt: number
  updatedAt: number
}

export interface VerseNote {
  id: string
  ref: VerseRef
  title?: string
  text: string
  type?: 'note' | 'comment' | 'illustration' | 'question' | 'prayer'
  tags?: string[]
  createdAt: number
  updatedAt: number
}

export interface Highlight {
  id: string
  ref: VerseRef
  color: HighlightColor
  createdAt: number
}

export interface UserAnnotations {
  bookmarks: Bookmark[]
  notes: VerseNote[]
  highlights: Highlight[]
}

// ─── Verse Lists & Playlists ──────────────────────────────────────────────

export interface VerseListItem {
  ref: VerseRef
  endRef?: VerseRef
  theme?: string
  displayTime?: number
  transitionType?: string
}

export interface VerseList {
  id: string
  name: string
  items: VerseListItem[]
  loop?: boolean
  random?: boolean
  defaultDisplayTime?: number
  defaultTheme?: string
  createdAt?: number
}

// ─── Reading Plans ────────────────────────────────────────────────────────

export interface ReadingDay {
  day: number
  passages: Array<{ start: VerseRef; end: VerseRef; label?: string }>
  completed?: boolean
  completedAt?: number
}

export interface ReadingPlan {
  id: string
  name: string
  description?: string
  duration: number         // days
  startDate?: number       // timestamp
  schedule: ReadingDay[]
  currentDay?: number
  completionPercent?: number
}

// ─── Scripture Detection ──────────────────────────────────────────────────

export interface DetectedScripture {
  raw: string              // original matched text
  ref: VerseRef
  reference: string        // formatted
  confidence: number       // 0–1
  position: number         // char offset in source text
  length: number
  context?: string         // surrounding text
}

export interface DetectionResult {
  detections: DetectedScripture[]
  text: string
  elapsed: number
}
