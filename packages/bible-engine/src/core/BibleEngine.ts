import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import type { BibleTranslation, BibleVerse, BibleChapter, BiblePassage, VerseRef, ComparisonResult } from '../types/bible.js'
import type { SearchOptions, SearchResponse, CrossReferenceResult, WordStudyResult, TopicSearchResult, UserAnnotations, VerseList, ReadingPlan, DetectionResult } from '../types/features.js'
import type { BibleTheme, VerseSlide, LowerThird } from '../types/presentation.js'
import { readBibFile, getVerse, getChapter, type BibDatabase } from '../readers/MdbReader.js'
import { SearchEngine } from '../features/SearchEngine.js'
import { CrossReferenceDB } from '../features/CrossReferenceDB.js'
import { StrongsLexicon } from '../features/StrongsLexicon.js'
import { TopicalIndex } from '../features/TopicalIndex.js'
import { BookmarkManager } from '../features/BookmarkManager.js'
import { VerseListManager } from '../features/VerseListManager.js'
import { ReadingPlanManager } from '../features/ReadingPlanManager.js'
import { ScriptureDetector } from '../features/ScriptureDetector.js'
import { ThemeManager } from '../presentation/ThemeManager.js'
import { PlaylistController } from '../presentation/PlaylistController.js'
import { parseReference, formatRef, parseMultiple, refsAreEqual } from './ReferenceParser.js'
import { BOOK_BY_ID, BIBLE_BOOKS, OT_BOOKS, NT_BOOKS } from '../data/books.js'

export interface BibleEngineConfig {
  biblesPath: string        // path to BibleShow Bibles/ directory
  themesPath?: string       // path to BibleShow Themes/ directory
  autoLoadAll?: boolean     // load all .bib files on init
  defaultTranslation?: string
}

export class BibleEngine {
  private databases = new Map<string, BibDatabase>()
  private defaultTranslation = 'KJV'

  readonly crossRefs    = new CrossReferenceDB()
  readonly strongs      = new StrongsLexicon()
  readonly topics       = new TopicalIndex()
  readonly bookmarks    = new BookmarkManager()
  readonly verseLists   = new VerseListManager()
  readonly readingPlans = new ReadingPlanManager()
  readonly detector     = new ScriptureDetector()
  readonly themeManager = new ThemeManager()

  private _searchEngine?: SearchEngine
  private _playlist?: PlaylistController
  private config: BibleEngineConfig

  constructor(config: BibleEngineConfig) {
    this.config = config
    if (config.defaultTranslation) {
      this.defaultTranslation = config.defaultTranslation
    }
  }

  // ─── Initialization ────────────────────────────────────────────────────

  async init(): Promise<void> {
    if (this.config.autoLoadAll && existsSync(this.config.biblesPath)) {
      await this.loadAllTranslations()
    }
    if (this.config.themesPath && existsSync(this.config.themesPath)) {
      const count = this.themeManager.loadFromDirectory(this.config.themesPath)
      console.log(`[BibleEngine] Loaded ${count} themes`)
    }
  }

  async loadTranslation(filename: string): Promise<BibleTranslation> {
    const path = join(this.config.biblesPath, filename)
    const db = await readBibFile(path)
    const id = db.translation.id || filename.replace(/\.bib$/i, '')
    this.databases.set(id, db)
    this._searchEngine = undefined // invalidate cache
    console.log(`[BibleEngine] Loaded ${id}: ${db.translation.name} (${db.verses.size} verses)`)
    return db.translation
  }

  async loadAllTranslations(): Promise<BibleTranslation[]> {
    if (!existsSync(this.config.biblesPath)) return []
    const files = readdirSync(this.config.biblesPath).filter(f => f.endsWith('.bib'))
    const results: BibleTranslation[] = []
    for (const file of files) {
      try {
        const t = await this.loadTranslation(file)
        results.push(t)
      } catch (e) {
        console.warn(`[BibleEngine] Failed to load ${file}:`, e)
      }
    }
    // Set default translation to first loaded if not set
    if (!this.databases.has(this.defaultTranslation) && this.databases.size > 0) {
      this.defaultTranslation = [...this.databases.keys()][0]
    }
    return results
  }

  setDefaultTranslation(id: string): void {
    if (this.databases.has(id)) this.defaultTranslation = id
  }

  // ─── Verse / Chapter / Passage ─────────────────────────────────────────

  getVerse(ref: VerseRef, translationId?: string): BibleVerse | null {
    const db = this.getDb(translationId)
    if (!db) return null
    return getVerse(db, ref.book, ref.chapter, ref.verse)
  }

  getVerseByRef(refString: string, translationId?: string): BibleVerse | null {
    const parsed = parseReference(refString)
    if (!parsed.isValid) return null
    return this.getVerse(parsed.ref, translationId)
  }

  getChapter(book: number, chapter: number, translationId?: string): BibleChapter | null {
    const db = this.getDb(translationId)
    if (!db) return null
    const ch = getChapter(db, book, chapter)
    return ch.verses.length > 0 ? ch : null
  }

  getPassage(start: VerseRef, end: VerseRef, translationId?: string): BiblePassage | null {
    const db = this.getDb(translationId)
    if (!db) return null
    const verses: BibleVerse[] = []
    for (let b = start.book; b <= end.book; b++) {
      const startChapter = b === start.book ? start.chapter : 1
      const endChapter = b === end.book ? end.chapter : (BOOK_BY_ID.get(b)?.chapterCount ?? 1)
      for (let c = startChapter; c <= endChapter; c++) {
        const startV = (b === start.book && c === start.chapter) ? start.verse : 1
        const endV   = (b === end.book   && c === end.chapter)   ? (end.verse ?? 176) : 176
        for (let v = startV; v <= endV; v++) {
          const verse = getVerse(db, b, c, v)
          if (!verse) break
          verses.push(verse)
        }
      }
    }
    return {
      start, end, verses,
      translation: db.translation.id,
      reference: `${formatRef(start)}–${formatRef(end)}`,
    }
  }

  /** Compare the same verse across multiple translations */
  compareTranslations(ref: VerseRef, translationIds?: string[]): ComparisonResult {
    const ids = translationIds ?? [...this.databases.keys()]
    const translations = ids.map(id => {
      const db = this.databases.get(id)
      const verse = db ? getVerse(db, ref.book, ref.chapter, ref.verse) : null
      return { id, name: db?.translation.name ?? id, text: verse?.text ?? '' }
    })
    return { ref, reference: formatRef(ref), translations }
  }

  // ─── Search ────────────────────────────────────────────────────────────

  search(query: string, options: SearchOptions = {}): SearchResponse {
    return this.searchEngine.search(query, options)
  }

  booleanSearch(query: string, options: SearchOptions = {}): SearchResponse {
    return this.searchEngine.booleanSearch(query, options)
  }

  wordStudy(word: string, translationId?: string) {
    return this.searchEngine.wordStudy(word, translationId)
  }

  // ─── Cross-references ──────────────────────────────────────────────────

  getCrossReferences(ref: VerseRef): CrossReferenceResult {
    const result = this.crossRefs.get(ref)
    // Enrich targets with verse text
    return result
  }

  // ─── Strong's ──────────────────────────────────────────────────────────

  lookupStrongs(number: string) {
    return this.strongs.lookup(number)
  }

  searchStrongs(query: string) {
    return this.strongs.search(query)
  }

  // ─── Topical ───────────────────────────────────────────────────────────

  searchTopics(query: string): TopicSearchResult {
    return this.topics.search(query)
  }

  getTopicByRef(ref: VerseRef) {
    return this.topics.getByRef(ref)
  }

  // ─── Scripture detection ───────────────────────────────────────────────

  detectScripture(text: string): DetectionResult {
    return this.detector.detect(text)
  }

  /** Detect + resolve verse text for detected references */
  async detectAndResolve(text: string, translationId?: string) {
    const result = this.detector.detect(text)
    return result.detections.map(d => ({
      ...d,
      verse: this.getVerse(d.ref, translationId),
    }))
  }

  // ─── Daily verse ───────────────────────────────────────────────────────

  getDailyVerse(date = new Date(), translationId?: string): BibleVerse | null {
    // Deterministic selection based on day of year
    const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86_400_000)
    const DAILY_POOL = [
      { book: 43, chapter: 3, verse: 16 },
      { book: 23, chapter: 40, verse: 31 },
      { book: 50, chapter: 4, verse: 13 },
      { book: 19, chapter: 23, verse: 1 },
      { book: 24, chapter: 29, verse: 11 },
      { book: 20, chapter: 3, verse: 5 },
      { book: 45, chapter: 8, verse: 28 },
      { book: 49, chapter: 6, verse: 10 },
      { book: 40, chapter: 11, verse: 28 },
      { book: 50, chapter: 4, verse: 7 },
      { book: 19, chapter: 119, verse: 105 },
      { book: 55, chapter: 3, verse: 16 },
      { book: 60, chapter: 5, verse: 7 },
      { book: 59, chapter: 1, verse: 5 },
      { book: 45, chapter: 10, verse: 9 },
      { book: 19, chapter: 46, verse: 1 },
      { book: 66, chapter: 3, verse: 20 },
    ]
    const entry = DAILY_POOL[dayOfYear % DAILY_POOL.length]
    return this.getVerse(entry, translationId)
  }

  // ─── Presentation ──────────────────────────────────────────────────────

  buildSlide(ref: VerseRef, themeId?: string, translationId?: string): VerseSlide | null {
    const verse = this.getVerse(ref, translationId)
    if (!verse) return null
    const theme = themeId
      ? (this.themeManager.get(themeId) ?? this.themeManager.getDefault())
      : this.themeManager.getDefault()
    const db = this.getDb(translationId)
    return {
      id: `${formatRef(ref)}-${db?.translation.id ?? 'UNK'}`,
      ref,
      text: verse.text,
      reference: `${formatRef(ref)} (${db?.translation.abbreviation ?? ''})`,
      translation: db?.translation.id ?? '',
      theme,
    }
  }

  buildLowerThird(ref: VerseRef, translationId?: string, style: LowerThird['style'] = 'standard'): LowerThird | null {
    const verse = this.getVerse(ref, translationId)
    if (!verse) return null
    const db = this.getDb(translationId)
    return {
      ref,
      text: verse.text.length > 120 ? verse.text.slice(0, 117) + '…' : verse.text,
      reference: `${formatRef(ref)} (${db?.translation.id ?? ''})`,
      style,
      position: 'bottom',
      backgroundColor: 'rgba(7,7,9,0.82)',
      textColor: '#ffffff',
      accentColor: '#7c3aed',
      showAnimation: true,
    }
  }

  // ─── Playlist control ──────────────────────────────────────────────────

  get playlist(): PlaylistController {
    if (!this._playlist) {
      this._playlist = new PlaylistController(this.databases, this.defaultTranslation, this.themeManager)
    }
    return this._playlist
  }

  // ─── Metadata ──────────────────────────────────────────────────────────

  getLoadedTranslations(): BibleTranslation[] {
    return [...this.databases.values()].map(db => db.translation)
  }

  getBooks() {
    return BIBLE_BOOKS
  }

  getOTBooks() {
    return OT_BOOKS
  }

  getNTBooks() {
    return NT_BOOKS
  }

  getBookInfo(bookId: number) {
    return BOOK_BY_ID.get(bookId) ?? null
  }

  parseRef(refString: string) {
    return parseReference(refString)
  }

  formatRef(ref: VerseRef) {
    return formatRef(ref)
  }

  get stats() {
    const total = [...this.databases.values()].reduce((acc, db) => acc + db.verses.size, 0)
    return {
      translations:  this.databases.size,
      verses:        total,
      books:         BIBLE_BOOKS.length,
      themes:        this.themeManager.count,
      crossRefs:     this.crossRefs.totalEntries,
      strongsLoaded: this.strongs.totalLoaded,
      topics:        this.topics.count,
      bookmarks:     this.bookmarks.stats.bookmarks,
      notes:         this.bookmarks.stats.notes,
    }
  }

  // ─── Private ───────────────────────────────────────────────────────────

  private getDb(translationId?: string): BibDatabase | undefined {
    const id = translationId ?? this.defaultTranslation
    return this.databases.get(id) ?? [...this.databases.values()][0]
  }

  private get searchEngine(): SearchEngine {
    if (!this._searchEngine) {
      this._searchEngine = new SearchEngine(this.databases)
    }
    return this._searchEngine
  }
}
