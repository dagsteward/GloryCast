// Core engine
export { BibleEngine } from './core/BibleEngine.js'
export type { BibleEngineConfig } from './core/BibleEngine.js'

// Reference parsing
export { parseReference, parseMultiple, formatRef, resolveBook, refsAreEqual, refToLinear, isInRange } from './core/ReferenceParser.js'

// Types
export type { BibleBook, BibleVerse, BibleChapter, BiblePassage, BibleTranslation, VerseRef, ParsedReference, ComparisonResult, StrongsWord, Testament, BibleGenre } from './types/bible.js'
export type { SearchOptions, SearchResult, SearchResponse, SearchMode, CrossReference, CrossReferenceResult, StrongsEntry, WordStudyResult, TopicEntry, TopicSearchResult, Bookmark, VerseNote, Highlight, HighlightColor, UserAnnotations, VerseList, VerseListItem, ReadingPlan, ReadingDay, DetectedScripture, DetectionResult } from './types/features.js'
export type { BibleTheme, VerseSlide, LowerThird, DisplayTarget, PresentationState, BackgroundConfig, FontConfig, ShadowConfig, GlowConfig, OutlineConfig } from './types/presentation.js'

// Feature classes (for direct use)
export { SearchEngine } from './features/SearchEngine.js'
export { CrossReferenceDB } from './features/CrossReferenceDB.js'
export { StrongsLexicon } from './features/StrongsLexicon.js'
export { TopicalIndex } from './features/TopicalIndex.js'
export { BookmarkManager } from './features/BookmarkManager.js'
export { VerseListManager } from './features/VerseListManager.js'
export { ReadingPlanManager } from './features/ReadingPlanManager.js'
export { ScriptureDetector } from './features/ScriptureDetector.js'

// Presentation
export { ThemeManager } from './presentation/ThemeManager.js'
export { PlaylistController } from './presentation/PlaylistController.js'

// Data
export { BIBLE_BOOKS, OT_BOOKS, NT_BOOKS, BOOK_BY_ID, BOOK_BY_ABBREV } from './data/books.js'

// Reader (Node/Electron main process only)
export { readBibFile, getVerse, getChapter, searchInDb } from './readers/MdbReader.js'
export type { BibDatabase } from './readers/MdbReader.js'
