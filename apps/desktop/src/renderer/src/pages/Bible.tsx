import { useState, useRef, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, BookOpen, Star, Send, ChevronRight,
  ChevronLeft, Copy, ArrowUpRight, Layers, Hash, Tag,
  Calendar, Bookmark, SlidersHorizontal, Tv2, Tv,
  Languages, MonitorPlay, CheckCircle2, Circle, X, Plus,
  ChevronDown, ChevronUp, Radio, Eye, Mic
} from 'lucide-react'
import { cn } from '../lib/utils'
import { LowerThird } from '../components/bible/LowerThird'
import type { LowerThirdStyle } from '../components/bible/LowerThird'
import { useServiceStore, type LiveItem } from '../stores/serviceStore'
import { BackgroundPicker } from '../components/bible/BackgroundPicker'
import { SlideBackdrop } from '../components/bible/SlideBackdrop'
import { loadCrossReferences, crossReferencesFor, crossReferenceLicense } from '../lib/studyData'
import { useBackgroundStore } from '../stores/backgroundStore'
import {
  loadTranslation, isLoaded, isBundled, getChapter, getVerseText, searchBibleMerged,
  highlightTerms, highlightRegex, BUNDLED_TRANSLATIONS,
  type SearchMode, type SearchHit,
} from '../lib/bibleData'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Book { id: number; name: string; chapterCount: number; testament: 'OT' | 'NT' }
interface Translation { id: string; name: string; lang: string; flag?: string }
interface VerseData { verse: number; text: string; bookmarked?: boolean; highlighted?: string }

interface QueueItem {
  id: string
  book: string
  chapter: number
  verse: number
  primaryText: string
  primaryRef: string
  primaryTranslation: string
  secondaryText?: string
  secondaryTranslation?: string
  style: LowerThirdStyle
  background: string
  state: 'prepared' | 'preview' | 'program'
  timestamp: number
}

type RightTab = 'crossrefs' | 'search' | 'topics' | 'bookmarks' | 'wordStudy' | 'readingPlan'

// ─── Book data ────────────────────────────────────────────────────────────────

const BOOKS: Book[] = [
  {id:1,name:'Genesis',chapterCount:50,testament:'OT'},{id:2,name:'Exodus',chapterCount:40,testament:'OT'},{id:3,name:'Leviticus',chapterCount:27,testament:'OT'},{id:4,name:'Numbers',chapterCount:36,testament:'OT'},{id:5,name:'Deuteronomy',chapterCount:34,testament:'OT'},
  {id:6,name:'Joshua',chapterCount:24,testament:'OT'},{id:7,name:'Judges',chapterCount:21,testament:'OT'},{id:8,name:'Ruth',chapterCount:4,testament:'OT'},{id:9,name:'1 Samuel',chapterCount:31,testament:'OT'},{id:10,name:'2 Samuel',chapterCount:24,testament:'OT'},
  {id:11,name:'1 Kings',chapterCount:22,testament:'OT'},{id:12,name:'2 Kings',chapterCount:25,testament:'OT'},{id:13,name:'1 Chronicles',chapterCount:29,testament:'OT'},{id:14,name:'2 Chronicles',chapterCount:36,testament:'OT'},{id:15,name:'Ezra',chapterCount:10,testament:'OT'},
  {id:16,name:'Nehemiah',chapterCount:13,testament:'OT'},{id:17,name:'Esther',chapterCount:10,testament:'OT'},{id:18,name:'Job',chapterCount:42,testament:'OT'},{id:19,name:'Psalms',chapterCount:150,testament:'OT'},{id:20,name:'Proverbs',chapterCount:31,testament:'OT'},
  {id:21,name:'Ecclesiastes',chapterCount:12,testament:'OT'},{id:22,name:'Song of Solomon',chapterCount:8,testament:'OT'},{id:23,name:'Isaiah',chapterCount:66,testament:'OT'},{id:24,name:'Jeremiah',chapterCount:52,testament:'OT'},{id:25,name:'Lamentations',chapterCount:5,testament:'OT'},
  {id:26,name:'Ezekiel',chapterCount:48,testament:'OT'},{id:27,name:'Daniel',chapterCount:12,testament:'OT'},{id:28,name:'Hosea',chapterCount:14,testament:'OT'},{id:29,name:'Joel',chapterCount:3,testament:'OT'},{id:30,name:'Amos',chapterCount:9,testament:'OT'},
  {id:31,name:'Obadiah',chapterCount:1,testament:'OT'},{id:32,name:'Jonah',chapterCount:4,testament:'OT'},{id:33,name:'Micah',chapterCount:7,testament:'OT'},{id:34,name:'Nahum',chapterCount:3,testament:'OT'},{id:35,name:'Habakkuk',chapterCount:3,testament:'OT'},
  {id:36,name:'Zephaniah',chapterCount:3,testament:'OT'},{id:37,name:'Haggai',chapterCount:2,testament:'OT'},{id:38,name:'Zechariah',chapterCount:14,testament:'OT'},{id:39,name:'Malachi',chapterCount:4,testament:'OT'},
  {id:40,name:'Matthew',chapterCount:28,testament:'NT'},{id:41,name:'Mark',chapterCount:16,testament:'NT'},{id:42,name:'Luke',chapterCount:24,testament:'NT'},{id:43,name:'John',chapterCount:21,testament:'NT'},{id:44,name:'Acts',chapterCount:28,testament:'NT'},
  {id:45,name:'Romans',chapterCount:16,testament:'NT'},{id:46,name:'1 Corinthians',chapterCount:16,testament:'NT'},{id:47,name:'2 Corinthians',chapterCount:13,testament:'NT'},{id:48,name:'Galatians',chapterCount:6,testament:'NT'},{id:49,name:'Ephesians',chapterCount:6,testament:'NT'},
  {id:50,name:'Philippians',chapterCount:4,testament:'NT'},{id:51,name:'Colossians',chapterCount:4,testament:'NT'},{id:52,name:'1 Thessalonians',chapterCount:5,testament:'NT'},{id:53,name:'2 Thessalonians',chapterCount:3,testament:'NT'},{id:54,name:'1 Timothy',chapterCount:6,testament:'NT'},
  {id:55,name:'2 Timothy',chapterCount:4,testament:'NT'},{id:56,name:'Titus',chapterCount:3,testament:'NT'},{id:57,name:'Philemon',chapterCount:1,testament:'NT'},{id:58,name:'Hebrews',chapterCount:13,testament:'NT'},{id:59,name:'James',chapterCount:5,testament:'NT'},
  {id:60,name:'1 Peter',chapterCount:5,testament:'NT'},{id:61,name:'2 Peter',chapterCount:3,testament:'NT'},{id:62,name:'1 John',chapterCount:5,testament:'NT'},{id:63,name:'2 John',chapterCount:1,testament:'NT'},{id:64,name:'3 John',chapterCount:1,testament:'NT'},
  {id:65,name:'Jude',chapterCount:1,testament:'NT'},{id:66,name:'Revelation',chapterCount:22,testament:'NT'},
]

// ─── Translations (global) ───────────────────────────────────────────────────

/**
 * Translations that ship inside the app. Everything beyond this is discovered
 * at runtime from the operator's own library (imported .bib files and
 * API.Bible downloads).
 *
 * This list used to name 22 translations — Twi, Yoruba, Hausa, French,
 * Arabic and more — none of which the app actually had. Selecting one showed
 * five hardcoded sample verses and blanks everywhere else, which on a live
 * programme output is worse than not offering it at all: the operator sees
 * John 3:16 render perfectly, then projects an empty screen on 3:17.
 */
const BUILT_IN_TRANSLATIONS: Translation[] = [
  { id: 'WEB', name: 'World English Bible', lang: 'English' },
  { id: 'KJV', name: 'King James Version',  lang: 'English' },
]

/** Live list — built-ins plus whatever the user has actually installed. */
function useAvailableTranslations(): Translation[] {
  const [installed, setInstalled] = useState<Translation[]>([])

  useEffect(() => {
    let cancelled = false
    void window.glorycast?.bible?.list()
      .then(list => {
        if (cancelled) return
        setInstalled(
          list
            .filter(t => !BUILT_IN_TRANSLATIONS.some(b => b.id === t.id))
            .map(t => ({ id: t.id, name: t.name, lang: 'Installed' })),
        )
      })
      .catch(() => { /* browser preview — built-ins only */ })
    return () => { cancelled = true }
  }, [])

  return useMemo(() => [...BUILT_IN_TRANSLATIONS, ...installed], [installed])
}

// ─── Secondary-translation snippets (non-bundled languages) ────────────────────
// Illustrative dual-screen text for the non-bundled translations (Twi, French, …)
// until the user installs the licensed file for that language. The primary text
// (WEB / KJV) now comes from the full bundled Bible via lib/bibleData.

/**
 * Secondary-column text.
 *
 * This used to read from SECONDARY_TEXTS — five hand-written verses per
 * language. Any other reference rendered blank, so dual mode looked functional
 * on John 3:16 and silently produced nothing on the next verse. It now reads
 * the real installed translation and returns undefined when there genuinely is
 * no text, which the caller renders as an honest placeholder.
 */
function getSecondaryText(
  translationId: string, bookName: string, chapter: number, verse: number,
): string | undefined {
  return getVerseText(translationId, bookName, chapter, verse)
}

// ─── Verse helpers ────────────────────────────────────────────────────────────

const HIGHLIGHT_COLORS: Record<string, string> = {
  yellow: 'bg-yellow-500/20 border-yellow-500/30',
  green:  'bg-emerald-500/15 border-emerald-500/25',
  blue:   'bg-blue-500/15 border-blue-500/25',
  purple: 'bg-purple-500/20 border-purple-500/30',
  pink:   'bg-pink-500/15 border-pink-500/25',
}

// ─── Quote → verse finder ─────────────────────────────────────────────────────
// Producers often remember a *line* of a verse, not its reference. The ranking
// engine lives in lib/bibleData (searchBible) and scans the full bundled Bible
// (WEB / KJV) with fuzzy paraphrase matching. Here we just render highlights.

// Render verse text with the matched query terms highlighted (stem-aware).
function Highlighted({ text, query, mode }: { text: string; query: string; mode: SearchMode }) {
  const terms = highlightTerms(query, mode)
  const re = highlightRegex(terms)
  if (!re) return <>{text}</>

  const out: React.ReactNode[] = []
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  re.lastIndex = 0
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(<span key={i++}>{text.slice(last, m.index)}</span>)
    out.push(<mark key={i++} className="bg-purple-500/30 text-purple-100 rounded px-0.5">{m[0]}</mark>)
    last = m.index + m[0].length
    if (m.index === re.lastIndex) re.lastIndex++   // guard against zero-width
  }
  if (last < text.length) out.push(<span key={i++}>{text.slice(last)}</span>)
  return <>{out}</>
}

// ─── Cross-references & topics ────────────────────────────────────────────────

const CROSS_REFS: Record<string, { ref: string; text: string }[]> = {
  'Romans:8:28': [
    { ref: 'Gen 50:20',  text: 'You intended to harm me, but God intended it for good...' },
    { ref: 'Jer 29:11',  text: 'For I know the plans I have for you, declares the Lord...' },
    { ref: 'Phil 4:13',  text: 'I can do all this through him who gives me strength.' },
    { ref: 'Ps 37:23',   text: 'The LORD makes firm the steps of the one who delights in him.' },
  ],
  'John:3:16': [
    { ref: '1 John 4:9',  text: 'This is how God showed his love among us...' },
    { ref: 'Rom 5:8',     text: 'But God demonstrates his own love for us in this...' },
    { ref: 'John 3:17',   text: 'For God did not send his Son to condemn the world...' },
    { ref: 'Eph 2:8',     text: 'For it is by grace you have been saved, through faith...' },
  ],
  'Psalms:23:1': [
    { ref: 'Ezek 34:11', text: 'I myself will search for my sheep and look after them.' },
    { ref: 'John 10:11', text: 'I am the good shepherd. The good shepherd lays down his life.' },
    { ref: 'Ps 28:9',    text: 'Save your people and bless your inheritance; be their shepherd.' },
  ],
}

const TOPIC_DOT: Record<string, string> = {
  purple:  'bg-purple-400', blue:    'bg-blue-400',
  emerald: 'bg-emerald-400', pink:   'bg-pink-400',
  orange:  'bg-orange-400', teal:    'bg-teal-400',
  sky:     'bg-sky-400',    yellow:  'bg-yellow-400',
}

const TOPICS = [
  { id: 'salvation',    name: 'Salvation',    dot: 'purple',  count: 47 },
  { id: 'prayer',       name: 'Prayer',       dot: 'blue',    count: 38 },
  { id: 'faith',        name: 'Faith',        dot: 'emerald', count: 52 },
  { id: 'love',         name: 'Love',         dot: 'pink',    count: 61 },
  { id: 'grace',        name: 'Grace',        dot: 'orange',  count: 29 },
  { id: 'peace',        name: 'Peace',        dot: 'teal',    count: 33 },
  { id: 'worship',      name: 'Worship',      dot: 'purple',  count: 41 },
  { id: 'holy-spirit',  name: 'Holy Spirit',  dot: 'sky',     count: 35 },
  { id: 'strength',     name: 'Strength',     dot: 'orange',  count: 31 },
  { id: 'wisdom',       name: 'Wisdom',       dot: 'yellow',  count: 44 },
]

const READING_PLANS = [
  { id: 'bible-year',      name: 'Bible in a Year',        duration: 365, progress: 42 },
  { id: 'nt-90',           name: 'NT in 90 Days',          duration: 90,  progress: 0  },
  { id: 'psalms-proverbs', name: 'Psalms & Proverbs',      duration: 31,  progress: 12 },
  { id: 'gospels',         name: 'Four Gospels in 40 Days', duration: 40, progress: 0  },
]

const LT_STYLES: { id: LowerThirdStyle; label: string }[] = [
  { id: 'standard',  label: 'Standard'  },
  { id: 'broadcast', label: 'Broadcast' },
  { id: 'minimal',   label: 'Minimal'   },
  { id: 'cinematic', label: 'Cinematic' },
]

// ─── BiblePage ────────────────────────────────────────────────────────────────

export function BiblePage() {
  // Only what is genuinely installed — see BUILT_IN_TRANSLATIONS.
  const translations = useAvailableTranslations()
  const [testament,          setTestament]          = useState<'OT'|'NT'>('NT')
  const [bookFilter,         setBookFilter]         = useState('')
  const [selectedBook,       setSelectedBook]       = useState<Book>(BOOKS[42])   // John
  const [selectedChapter,    setSelectedChapter]    = useState(3)
  const [primaryTx,          setPrimaryTx]          = useState('WEB')
  const [secondaryTx,        setSecondaryTx]        = useState<string>('AST')
  const [dualMode,           setDualMode]           = useState(false)
  const [selectedVerse,      setSelectedVerse]      = useState<number|null>(16)
  const [rightTab,           setRightTab]           = useState<RightTab>('crossrefs')
  const [searchQuery,        setSearchQuery]        = useState('')
  const [searchMode,         setSearchMode]         = useState<SearchMode>('smart')
  // Bumped whenever a bundled translation finishes loading, to re-render verses.
  const [bibleTick,          setBibleTick]          = useState(0)
  const [topicQuery,         setTopicQuery]         = useState('')
  const [bookmarks,          setBookmarks]          = useState<Set<string>>(new Set(['Romans:8:28']))
  const [wordStudyWord,      setWordStudyWord]      = useState('')
  const [fontScale,          setFontScale]          = useState(1)
  const [history,            setHistory]            = useState<{book:Book;chapter:number;verse:number|null}[]>([])
  const [ltStyle,            setLtStyle]            = useState<LowerThirdStyle>('standard')
  const [showLtPreview,      setShowLtPreview]      = useState(false)
  const [displayQueue,       setDisplayQueue]       = useState<QueueItem[]>([])
  const [previewItem,        setPreviewItem]        = useState<QueueItem|null>(null)
  const [programItem,        setProgramItem]        = useState<QueueItem|null>(null)
  const [producerOpen,       setProducerOpen]       = useState(true)
  const [showSecondaryDropdown, setShowSecondaryDropdown] = useState(false)
  const verseRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  // Shared production bus — queueing/taking a verse here drives the same
  // Preview → Program bus that the Production switch deck and monitors use.
  const addGraphic     = useServiceStore(s => s.addGraphic)
  const gfxToPreview   = useServiceStore(s => s.sendToPreview)
  const gfxToProgram   = useServiceStore(s => s.cutToProgram)
  const gfxClearProgram = useServiceStore(s => s.clearProgram)

  // Selected slide background (shared registry — gradients, motion, uploads).
  const selectedBg = useBackgroundStore(s => s.selectedId)

  // Which bundled translation to read/search from. NIV/ESV/… aren't bundled, so
  // the reader shows an "install translation" notice and search falls back to WEB.
  const primaryBundled = isBundled(primaryTx)
  const searchTx       = primaryBundled ? primaryTx : 'WEB'

  // Lazy-load bundled text. We load BOTH bundled translations (WEB + KJV): the
  // primary for reading, and both as the quote-search corpus so a quote phrased
  // like any of them still finds the verse. Re-render via bibleTick on load.
  useEffect(() => {
    const wanted = new Set<string>(BUNDLED_TRANSLATIONS)
    if (dualMode && isBundled(secondaryTx)) wanted.add(secondaryTx)
    let cancelled = false
    for (const id of wanted) {
      if (isLoaded(id)) continue
      loadTranslation(id).then(() => { if (!cancelled) setBibleTick(t => t + 1) }).catch(() => {})
    }
    return () => { cancelled = true }
  }, [secondaryTx, dualMode])

  // Real verses from the bundled Bible (empty until loaded / when not bundled).
  const verses: VerseData[] = useMemo(() => {
    void bibleTick   // re-run when a translation finishes loading
    if (!primaryBundled || !isLoaded(primaryTx)) return []
    return getChapter(primaryTx, selectedBook.name, selectedChapter)
      .map(r => ({ verse: r.verse, text: r.text }))
  }, [primaryTx, primaryBundled, selectedBook.name, selectedChapter, bibleTick])
  const bookmarkKey      = (v: number) => `${selectedBook.name}:${selectedChapter}:${v}`
  const selectedVerseData = verses.find(v => v.verse === selectedVerse)
  const chapterCount     = selectedBook.chapterCount
  const visibleBooks     = BOOKS.filter(b =>
    b.testament === testament &&
    (bookFilter ? b.name.toLowerCase().includes(bookFilter.toLowerCase()) : true)
  )
  // Cross-references now come from the real 344,800-reference dataset rather
  // than the 54-verse sample that shipped before — that sample rendered
  // convincingly on John 3:16 and returned nothing for almost every other
  // verse in the Bible.
  const [studyReady, setStudyReady] = useState(false)
  useEffect(() => { void loadCrossReferences().then(() => setStudyReady(true)) }, [])

  const crossRefs = useMemo(() => {
    if (!selectedVerse || !studyReady) return []
    return crossReferencesFor(selectedBook.name, selectedChapter, selectedVerse)
      .map(r => ({
        ref: r.ref,
        // Prefer the translation on screen; fall back to bundled WEB so a
        // reference still reads even when the primary text lacks that verse.
        text: getVerseText(primaryTx, r.book, r.chapter, r.verse)
          ?? getVerseText('WEB', r.book, r.chapter, r.verse)
          ?? '',
      }))
      .filter(x => x.text)
  }, [selectedBook, selectedChapter, selectedVerse, primaryTx, studyReady])

  // ── Navigation ──────────────────────────────────────────────────────────────

  function navigate(book: Book, chapter: number, verse?: number) {
    setHistory(h => [...h.slice(-19), { book: selectedBook, chapter: selectedChapter, verse: selectedVerse }])
    setSelectedBook(book)
    setSelectedChapter(chapter)
    setSelectedVerse(verse ?? null)
  }

  function goBack() {
    const prev = history[history.length - 1]
    if (!prev) return
    setHistory(h => h.slice(0, -1))
    setSelectedBook(prev.book)
    setSelectedChapter(prev.chapter)
    setSelectedVerse(prev.verse)
  }

  // ── Bookmarks ───────────────────────────────────────────────────────────────

  function toggleBookmark(verse: number) {
    const key = bookmarkKey(verse)
    setBookmarks(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // ── Quote → verse finder (live suggestions) ──────────────────────────────────
  // Results update as the producer types/pastes a remembered line — no need to
  // press a button. Each hit can be jumped to, queued, or sent live.
  // Search both bundled translations (primary first so its wording wins ties).
  const searchCorpus = useMemo(
    () => Array.from(new Set([searchTx, ...BUNDLED_TRANSLATIONS])),
    [searchTx],
  )
  const searchReady = searchCorpus.some(isLoaded)
  const searchResults = useMemo(() => {
    void bibleTick
    if (!searchReady) return []
    return searchBibleMerged(searchCorpus, searchQuery, { mode: searchMode })
  }, [searchQuery, searchMode, searchCorpus, searchReady, bibleTick])

  // ── Display queue ────────────────────────────────────────────────────────────

  // Map a Bible queue item to the shared LiveItem graphic-bus shape.
  function toLiveItem(item: QueueItem): Omit<LiveItem, 'id'> {
    return {
      kind:       'scripture',
      title:      `${item.book} ${item.chapter}:${item.verse}`,
      body:       item.primaryText,
      subtitle:   item.secondaryTranslation
        ? `${item.primaryTranslation} + ${item.secondaryTranslation}`
        : item.primaryTranslation,
      background: item.background,
      source:     'bible',
    }
  }

  /**
   * Push a verse straight to the scripture projection window.
   *
   * Deliberately separate from the producer queue: this is the standalone path
   * for a service with no video production, so it does not touch preview /
   * program. Opening the window is idempotent, so hitting Project before the
   * display exists just opens it and shows the verse.
   */
  function projectVerse(v: VerseData, mode: 'full' | 'lower-third') {
    window.glorycast?.window.openBibleDisplay()
    window.glorycast?.bibleDisplay.send({
      text: v.text,
      reference: `${selectedBook.name} ${selectedChapter}:${v.verse}`,
      translation: primaryTx,
      mode,
    })
  }

  /** Blank the projection screen — null text, not a stale verse left up. */
  function clearProjection() {
    window.glorycast?.bibleDisplay.send({
      text: null, reference: null, translation: null, mode: 'full',
    })
  }

  function sendToDisplay(v: VerseData) {
    const primaryRef    = `${selectedBook.name} ${selectedChapter}:${v.verse}`
    const secondaryText = dualMode
      ? (getSecondaryText(secondaryTx, selectedBook.name, selectedChapter, v.verse) ?? `[${secondaryTx}] ${primaryRef}`)
      : undefined

    const item: QueueItem = {
      id:                  `${Date.now()}-${v.verse}`,
      book:                selectedBook.name,
      chapter:             selectedChapter,
      verse:               v.verse,
      primaryText:         v.text,
      primaryRef,
      primaryTranslation:  primaryTx,
      secondaryText,
      secondaryTranslation: dualMode ? secondaryTx : undefined,
      style:               ltStyle,
      background:          selectedBg,
      state:               'prepared',
      timestamp:           Date.now(),
    }
    setDisplayQueue(q => [...q, item])
    // Mirror into the shared graphics deck so it appears in the Production
    // switch deck under the "Graphics" tab.
    addGraphic(toLiveItem(item))
    setProducerOpen(true)
  }

  // Build a QueueItem from a search hit (the finder doesn't carry dual-mode).
  function hitToQueueItem(hit: SearchHit, state: QueueItem['state']): QueueItem {
    return {
      id:                  `${Date.now()}-${hit.verse}`,
      book:                hit.book,
      chapter:             hit.chapter,
      verse:               hit.verse,
      primaryText:         hit.text,
      primaryRef:          hit.ref,
      primaryTranslation:  hit.tx,
      style:               ltStyle,
      background:          selectedBg,
      state,
      timestamp:           Date.now(),
    }
  }

  // Present a found verse straight from the search panel.
  function presentHit(hit: SearchHit, target: 'queue' | 'preview' | 'program') {
    const item = hitToQueueItem(hit, target === 'program' ? 'program' : target === 'preview' ? 'preview' : 'prepared')
    addGraphic(toLiveItem(item))
    if (target === 'queue') {
      setDisplayQueue(q => [...q, item])
    } else if (target === 'preview') {
      if (previewItem) setDisplayQueue(q => [...q, { ...previewItem, state: 'prepared' as const }])
      setPreviewItem(item)
      gfxToPreview(toLiveItem(item))
    } else {
      if (programItem) setDisplayQueue(q => [...q, { ...programItem, state: 'prepared' as const }])
      setProgramItem(item)
      setPreviewItem(null)
      gfxToProgram(toLiveItem(item))
    }
    setProducerOpen(true)
  }

  // Jump the reader to a found verse so the producer can read it in context.
  function jumpToHit(hit: SearchHit) {
    const book = BOOKS.find(b => b.name === hit.book)
    if (book) navigate(book, hit.chapter, hit.verse)
  }

  function moveToPreview(item: QueueItem) {
    const updated = { ...item, state: 'preview' as const }
    setDisplayQueue(q => q.filter(i => i.id !== item.id))
    if (previewItem) setDisplayQueue(q => [...q, { ...previewItem, state: 'prepared' as const }])
    setPreviewItem(updated)
    gfxToPreview(toLiveItem(updated))   // shared bus → Production PREVIEW monitor
  }

  function moveToProgram(item: QueueItem) {
    const updated = { ...item, state: 'program' as const }
    if (programItem) setDisplayQueue(q => [...q, { ...programItem, state: 'prepared' as const }])
    setProgramItem(updated)
    setPreviewItem(null)
    gfxToProgram(toLiveItem(updated))   // shared bus → live on PROGRAM
  }

  function sendPreviewToProgram() {
    if (!previewItem) return
    moveToProgram(previewItem)
  }

  function clearProgram() {
    if (programItem) setDisplayQueue(q => [...q, { ...programItem, state: 'prepared' as const }])
    setProgramItem(null)
    gfxClearProgram()                   // clear the shared PROGRAM graphic too
  }

  function removeFromQueue(id: string) {
    setDisplayQueue(q => q.filter(i => i.id !== id))
    if (previewItem?.id === id)  setPreviewItem(null)
    if (programItem?.id === id)  setProgramItem(null)
  }

  // ── LT preview data ──────────────────────────────────────────────────────────

  const ltPreviewData = selectedVerseData ? {
    primaryText:         selectedVerseData.text,
    primaryRef:          `${selectedBook.name} ${selectedChapter}:${selectedVerseData.verse}`,
    primaryTranslation:  primaryTx,
    secondaryText:       dualMode
      ? (getSecondaryText(secondaryTx, selectedBook.name, selectedChapter, selectedVerseData.verse)
         ?? `[${secondaryTx}] ${selectedBook.name} ${selectedChapter}:${selectedVerseData.verse}`)
      : undefined,
    secondaryTranslation: dualMode ? secondaryTx : undefined,
  } : null

  return (
    <div className="h-full flex flex-col overflow-hidden bg-app">

      {/* ── Main 3-column layout ───────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* ── Left: Book navigator ─────────────────────────────────────────── */}
        <div className="w-44 shrink-0 flex flex-col border-r border-white/[0.05] bg-chrome">
          {/* OT / NT */}
          <div className="flex border-b border-white/[0.05] shrink-0">
            {(['OT','NT'] as const).map(t => (
              <button key={t} onClick={() => setTestament(t)}
                className={cn('flex-1 py-2 text-[10px] font-semibold transition-colors',
                  testament === t ? 'text-purple-400 border-b-2 border-purple-500 bg-purple-600/5' : 'text-white/30 hover:text-white/60')}>
                {t === 'OT' ? 'Old Test.' : 'New Test.'}
              </button>
            ))}
          </div>

          {/* Filter */}
          <div className="px-2 py-1.5 border-b border-white/[0.04] shrink-0">
            <div className="relative">
              <Search size={9} className="absolute left-2 top-1/2 -translate-y-1/2 text-white/25" />
              <input value={bookFilter} onChange={e => setBookFilter(e.target.value)}
                placeholder="Filter books..."
                className="w-full pl-5 pr-2 py-1 rounded bg-white/[0.03] border border-white/[0.06] text-[10px] text-white/60 placeholder:text-white/20 outline-none" />
            </div>
          </div>

          {/* Book list */}
          <div className="flex-1 overflow-y-auto py-0.5">
            {visibleBooks.map(book => (
              <button key={book.id} onClick={() => navigate(book, 1)}
                className={cn('w-full text-left px-3 py-1.5 text-[11px] transition-all border-l-2',
                  selectedBook.id === book.id
                    ? 'text-purple-300 bg-purple-600/10 border-purple-500'
                    : 'text-white/45 hover:text-white/75 hover:bg-white/[0.025] border-transparent')}>
                {book.name}
              </button>
            ))}
          </div>
        </div>

        {/* ── Center: Chapter viewer ────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">

          {/* Toolbar */}
          <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-white/[0.05] bg-chrome flex-wrap">
            {/* Back */}
            <button onClick={goBack} disabled={!history.length}
              className="p-1 rounded text-white/30 hover:text-white/70 disabled:opacity-25 transition-colors">
              <ChevronLeft size={14} />
            </button>

            {/* Book/chapter label */}
            <div className="flex items-center gap-1.5 min-w-0">
              <BookOpen size={13} className="text-purple-400 shrink-0" />
              <span className="text-sm font-semibold text-white/80 truncate">
                {selectedBook.name} {selectedChapter}
              </span>
            </div>

            {/* Chapter pagination */}
            <div className="flex items-center gap-0.5 flex-wrap">
              {chapterCount <= 30 ? (
                [...Array(chapterCount)].map((_, i) => (
                  <button key={i+1} onClick={() => navigate(selectedBook, i+1)}
                    className={cn('w-6 h-6 rounded text-[10px] font-medium transition-colors',
                      selectedChapter === i+1 ? 'bg-purple-600 text-white' : 'text-white/30 hover:bg-white/10 hover:text-white/70')}>
                    {i+1}
                  </button>
                ))
              ) : (
                <>
                  <button onClick={() => navigate(selectedBook, Math.max(1, selectedChapter-1))}
                    className="w-6 h-6 rounded text-white/40 hover:bg-white/10 flex items-center justify-center transition-colors">
                    <ChevronLeft size={11} />
                  </button>
                  <span className="text-xs text-white/50 px-1">{selectedChapter}/{chapterCount}</span>
                  <button onClick={() => navigate(selectedBook, Math.min(chapterCount, selectedChapter+1))}
                    className="w-6 h-6 rounded text-white/40 hover:bg-white/10 flex items-center justify-center transition-colors">
                    <ChevronRight size={11} />
                  </button>
                </>
              )}
            </div>

            <div className="flex-1" />

            {/* Font size */}
            <div className="flex items-center gap-0.5">
              <button onClick={() => setFontScale(s => Math.max(0.8, s-0.1))}
                className="w-6 h-6 rounded text-white/30 hover:text-white/70 hover:bg-white/[0.06] flex items-center justify-center text-[10px] font-bold transition-colors">A</button>
              <button onClick={() => setFontScale(s => Math.min(1.5, s+0.1))}
                className="w-6 h-6 rounded text-white/30 hover:text-white/70 hover:bg-white/[0.06] flex items-center justify-center text-sm font-bold transition-colors">A</button>
            </div>

            {/* Primary translation */}
            <div className="flex items-center gap-1.5">
              <select value={primaryTx} onChange={e => setPrimaryTx(e.target.value)}
                className="bg-white/[0.04] border border-white/10 text-[11px] text-white/70 px-2 py-1 rounded-lg outline-none cursor-pointer">
                {translations.map(t => (
                  <option key={t.id} value={t.id}>{t.id} — {t.name}</option>
                ))}
              </select>
            </div>

            {/* Dual translation toggle */}
            <button
              onClick={() => setDualMode(v => !v)}
              title="Dual translation mode"
              className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all',
                dualMode ? 'bg-violet-600/25 text-violet-300 border border-violet-500/30' : 'text-white/40 hover:text-white/70 hover:bg-white/[0.06]')}>
              <Languages size={11} />
              {dualMode ? 'Dual' : '+2nd'}
            </button>

            {/* Secondary translation selector (visible in dual mode) */}
            <AnimatePresence>
              {dualMode && (
                <motion.div initial={{ opacity:0, width:0 }} animate={{ opacity:1, width:'auto' }} exit={{ opacity:0, width:0 }}
                  className="overflow-hidden">
                  <select value={secondaryTx} onChange={e => setSecondaryTx(e.target.value)}
                    className="bg-violet-900/20 border border-violet-500/25 text-[11px] text-violet-300 px-2 py-1 rounded-lg outline-none cursor-pointer">
                    {translations.filter(t => t.id !== primaryTx).map(t => (
                      <option key={t.id} value={t.id}>{t.id} — {t.name}</option>
                    ))}
                  </select>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Verses area */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-6 py-6 space-y-0.5">
              {/* Chapter heading */}
              <div className="flex items-center gap-3 mb-5">
                <h2 className="text-lg font-bold text-white/70">{selectedBook.name}</h2>
                <span className="text-2xl font-light text-purple-400">{selectedChapter}</span>
                <span className="text-[10px] text-white/25 bg-white/[0.04] border border-white/[0.07] px-2 py-0.5 rounded-full">{primaryTx}</span>
                {dualMode && (
                  <span className="text-[10px] text-violet-400 bg-violet-600/10 border border-violet-500/25 px-2 py-0.5 rounded-full">
                    + {secondaryTx}
                  </span>
                )}
              </div>

              {verses.length === 0 && (
                <div className="py-12 text-center space-y-2">
                  {!primaryBundled ? (
                    <>
                      <p className="text-sm text-white/40">{translations.find(t => t.id === primaryTx)?.name ?? primaryTx} isn't installed</p>
                      <p className="text-[11px] text-white/30 max-w-sm mx-auto leading-relaxed">
                        {primaryTx} is a licensed translation. Install its file in Settings, or switch to the bundled <button onClick={() => setPrimaryTx('WEB')} className="text-purple-400 hover:text-purple-300 underline">WEB</button> / <button onClick={() => setPrimaryTx('KJV')} className="text-purple-400 hover:text-purple-300 underline">KJV</button>.
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-white/35">Loading {primaryTx} Bible…</p>
                  )}
                </div>
              )}

              <AnimatePresence mode="popLayout">
                {verses.map(v => {
                  const isSelected  = selectedVerse === v.verse
                  const isBookmarked = bookmarks.has(bookmarkKey(v.verse))
                  const hlClass     = v.highlighted ? HIGHLIGHT_COLORS[v.highlighted] : ''
                  const secText     = dualMode
                    ? (getSecondaryText(secondaryTx, selectedBook.name, selectedChapter, v.verse)
                       ?? `[${secondaryTx}] ${selectedBook.name} ${selectedChapter}:${v.verse}`)
                    : null

                  return (
                    <motion.div
                      key={`${selectedBook.id}-${selectedChapter}-${v.verse}`}
                      initial={{ opacity:0, y:4 }}
                      animate={{ opacity:1, y:0 }}
                      ref={el => { if (el) verseRefs.current.set(v.verse, el as HTMLDivElement) }}
                      onClick={() => setSelectedVerse(isSelected ? null : v.verse)}
                      className={cn(
                        'group flex gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all border',
                        isSelected
                          ? 'bg-purple-600/12 border-purple-500/30 shadow-[0_0_20px_rgba(124,58,237,0.08)]'
                          : hlClass ? `${hlClass} border`
                          : 'border-transparent hover:bg-white/[0.025] hover:border-white/[0.05]'
                      )}
                    >
                      {/* Verse number */}
                      <span className={cn('text-[11px] font-mono mt-0.5 w-5 shrink-0 text-right select-none',
                        isSelected ? 'text-purple-400' : 'text-white/25 group-hover:text-white/45')}>
                        {v.verse}
                      </span>

                      {/* Text column */}
                      <div className="flex-1 min-w-0">
                        {/* Primary text */}
                        <p className={cn('leading-relaxed select-text',
                          isSelected ? 'text-white' : 'text-white/70')}
                          style={{ fontSize: `${13 * fontScale}px` }}>
                          {v.text}
                        </p>
                        {/* Secondary translation (dual mode) */}
                        {secText && (
                          <p className="mt-1 leading-relaxed select-text italic text-violet-300/60 border-t border-white/[0.04] pt-1"
                            style={{ fontSize: `${11 * fontScale}px` }}>
                            <span className="text-[9px] not-italic font-semibold text-violet-400/70 mr-1.5 tracking-wide">{secondaryTx}</span>
                            {secText}
                          </p>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className={cn('flex flex-col gap-1 shrink-0 transition-opacity',
                        isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-60')}>
                        <button onClick={e => { e.stopPropagation(); toggleBookmark(v.verse) }}
                          title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
                          className={cn('w-6 h-6 rounded-lg flex items-center justify-center transition-colors',
                            isBookmarked ? 'text-yellow-400 bg-yellow-500/15' : 'text-white/30 hover:text-yellow-400 hover:bg-white/[0.07]')}>
                          <Star size={10} fill={isBookmarked ? 'currentColor' : 'none'} />
                        </button>
                        <button onClick={e => { e.stopPropagation(); navigator.clipboard?.writeText(`${v.text} — ${selectedBook.name} ${selectedChapter}:${v.verse} (${primaryTx})`) }}
                          title="Copy"
                          className="w-6 h-6 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.07] flex items-center justify-center transition-colors">
                          <Copy size={10} />
                        </button>
                        <button onClick={e => { e.stopPropagation(); sendToDisplay(v) }}
                          title="Send to display queue"
                          className="w-6 h-6 rounded-lg text-white/30 hover:text-purple-400 hover:bg-purple-600/10 flex items-center justify-center transition-colors">
                          <Send size={10} />
                        </button>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>

              {/* Prev / Next chapter */}
              <div className="flex items-center justify-between pt-6 pb-2">
                <button onClick={() => navigate(selectedBook, Math.max(1, selectedChapter-1))}
                  disabled={selectedChapter === 1}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-white/70 hover:bg-white/[0.05] disabled:opacity-20 transition-all">
                  <ChevronLeft size={12} /> Previous Chapter
                </button>
                <button onClick={() => navigate(selectedBook, Math.min(chapterCount, selectedChapter+1))}
                  disabled={selectedChapter === chapterCount}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-white/70 hover:bg-white/[0.05] disabled:opacity-20 transition-all">
                  Next Chapter <ChevronRight size={12} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: Feature panel ──────────────────────────────────────────── */}
        <div className="w-72 shrink-0 border-l border-white/[0.05] flex flex-col bg-chrome">
          {/* Tab bar */}
          <div className="flex shrink-0 border-b border-white/[0.05] overflow-x-auto scrollbar-none">
            {([
              { id: 'crossrefs',   icon: ArrowUpRight, label: 'X-Refs' },
              { id: 'search',      icon: Search,       label: 'Search' },
              { id: 'topics',      icon: Tag,          label: 'Topics' },
              { id: 'bookmarks',   icon: Bookmark,     label: 'Saved'  },
              { id: 'wordStudy',   icon: Hash,         label: 'Word'   },
              { id: 'readingPlan', icon: Calendar,     label: 'Plans'  },
            ] as const).map(tab => (
              <button key={tab.id} onClick={() => setRightTab(tab.id)}
                className={cn('flex flex-col items-center gap-0.5 px-3 py-2 text-[9px] font-medium transition-colors shrink-0',
                  rightTab === tab.id ? 'text-purple-400 border-b-2 border-purple-500' : 'text-white/25 hover:text-white/55')}>
                <tab.icon size={12} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Selected verse card + Display controls */}
          {selectedVerseData && (
            <div className="shrink-0 p-3 border-b border-white/[0.04] space-y-2">
              <div className="p-3 rounded-xl bg-purple-600/8 border border-purple-500/20 space-y-2">
                {/* Primary */}
                <p className="text-[11px] text-white/70 leading-relaxed italic">
                  "{selectedVerseData.text.slice(0,100)}{selectedVerseData.text.length>100?'…':''}"
                </p>
                {/* Secondary (dual mode) */}
                {dualMode && ltPreviewData?.secondaryText && (
                  <p className="text-[10px] text-violet-300/60 leading-relaxed italic border-t border-white/[0.04] pt-1.5">
                    <span className="text-[9px] not-italic font-semibold text-violet-400/70 mr-1">{secondaryTx}</span>
                    {ltPreviewData.secondaryText.slice(0,90)}{ltPreviewData.secondaryText.length>90?'…':''}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-purple-400 font-semibold">
                    {selectedBook.name} {selectedChapter}:{selectedVerseData.verse} ({primaryTx})
                  </span>
                  <button onClick={() => sendToDisplay(selectedVerseData)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-[10px] text-white font-medium transition-colors">
                    <Send size={9} /> Queue
                  </button>
                </div>

                {/* Direct projection — standalone, independent of Production.
                    A church with no video mix still gets scripture on screen;
                    mode is chosen per verse rather than as a global setting. */}
                <div className="flex items-center gap-1.5 pt-2 mt-1 border-t border-white/[0.06]">
                  <span className="text-[9px] uppercase tracking-wider text-white/35 mr-auto">Project</span>
                  <button
                    onClick={() => projectVerse(selectedVerseData, 'full')}
                    title="Show full screen on the scripture display"
                    className="px-2 py-1 rounded-md bg-white/[0.06] hover:bg-white/[0.12] text-[10px] text-white/80 font-medium transition-colors"
                  >Full</button>
                  <button
                    onClick={() => projectVerse(selectedVerseData, 'lower-third')}
                    title="Show as a lower third on the scripture display"
                    className="px-2 py-1 rounded-md bg-white/[0.06] hover:bg-white/[0.12] text-[10px] text-white/80 font-medium transition-colors"
                  >Lower 3rd</button>
                  <button
                    onClick={clearProjection}
                    title="Clear the scripture display"
                    className="px-2 py-1 rounded-md bg-white/[0.04] hover:bg-red-600/30 text-[10px] text-white/55 hover:text-red-200 transition-colors"
                  >Clear</button>
                </div>
              </div>

              {/* Lower third style + preview toggle */}
              <div className="flex items-center gap-2">
                <div className="flex gap-1 flex-1 flex-wrap">
                  {LT_STYLES.map(s => (
                    <button key={s.id} onClick={() => setLtStyle(s.id)}
                      className={cn('px-2 py-0.5 rounded text-[9px] font-medium transition-colors',
                        ltStyle === s.id ? 'bg-purple-600/30 text-purple-300 border border-purple-500/30' : 'bg-white/[0.04] text-white/35 hover:bg-white/[0.07] hover:text-white/55')}>
                      {s.label}
                    </button>
                  ))}
                </div>
                <button onClick={() => setShowLtPreview(v => !v)}
                  title="Toggle lower third preview"
                  className={cn('p-1.5 rounded-lg transition-colors shrink-0',
                    showLtPreview ? 'text-purple-400 bg-purple-600/15' : 'text-white/30 hover:text-white/60 hover:bg-white/[0.05]')}>
                  <Tv2 size={12} />
                </button>
              </div>

              {/* Background chooser (gradients, motion graphics, custom uploads) */}
              <BackgroundPicker />

              {/* LT preview — verse composited over the selected background */}
              <AnimatePresence>
                {showLtPreview && ltPreviewData && (
                  <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }}
                    className="overflow-hidden">
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
                      <SlideBackdrop bgId={selectedBg} />
                      <LowerThird style={ltStyle} fullBleed {...ltPreviewData} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Panel content */}
          <div className="flex-1 overflow-y-auto">

            {/* Cross-references */}
            {rightTab === 'crossrefs' && (
              <div className="p-3 space-y-2">
                <div className="text-[10px] text-white/35 uppercase tracking-widest mb-1">
                  Cross-References {crossRefs.length > 0 && `(${crossRefs.length})`}
                </div>
                {crossRefs.length === 0 ? (
                  <p className="text-[11px] text-white/25 text-center py-6">
                    {!studyReady
                      ? 'Loading cross-references…'
                      : selectedVerse
                        ? 'No cross-references for this verse'
                        : 'Select a verse to see cross-references'}
                  </p>
                ) : crossRefs.map(xr => (
                  <div key={xr.ref} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] cursor-pointer hover:bg-white/[0.04] hover:border-white/10 transition-all group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-purple-400 font-semibold">{xr.ref}</span>
                      <ArrowUpRight size={9} className="text-white/20 group-hover:text-purple-400 transition-colors" />
                    </div>
                    <p className="text-[10px] text-white/45 leading-relaxed line-clamp-2">{xr.text}</p>
                  </div>
                ))}

                {/* CC-BY makes attribution a condition of use, so it travels
                    with the data rather than living only in Settings. */}
                {crossRefs.length > 0 && crossReferenceLicense() && (
                  <p className="text-[9px] text-white/25 pt-2 border-t border-white/[0.05] leading-relaxed">
                    {crossReferenceLicense()}
                  </p>
                )}
              </div>
            )}

            {/* Search */}
            {rightTab === 'search' && (
              <div className="p-3 space-y-3">
                {/* Quote → verse finder */}
                <div className="relative">
                  <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/25" />
                  <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Type or paste a line you heard…"
                    autoComplete="off"
                    className="w-full pl-7 pr-7 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white/70 placeholder:text-white/25 outline-none focus:border-purple-500/40" />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors">
                      <X size={11} />
                    </button>
                  )}
                </div>

                {/* Match mode */}
                <div className="flex gap-1">
                  {([
                    { id: 'smart',  label: 'Smart' },
                    { id: 'phrase', label: 'Exact phrase' },
                    { id: 'all',    label: 'All words' },
                    { id: 'any',    label: 'Any word' },
                  ] as { id: SearchMode; label: string }[]).map(m => (
                    <button key={m.id} onClick={() => setSearchMode(m.id)}
                      className={cn('px-2 py-0.5 rounded-full text-[9px] font-medium transition-colors',
                        searchMode === m.id
                          ? 'bg-purple-600/30 text-purple-300 border border-purple-500/30'
                          : 'bg-white/[0.04] text-white/35 hover:bg-purple-600/15 hover:text-purple-400 border border-transparent')}>
                      {m.label}
                    </button>
                  ))}
                </div>

                {!searchQuery && (
                  <p className="text-[10px] text-white/25 leading-relaxed text-center py-3 px-2">
                    Remember a line but not the reference? Type or paraphrase what you heard and matching verses appear instantly — searching the full WEB &amp; KJV text. Then queue or send them live.
                  </p>
                )}
                {searchQuery && !searchReady && (
                  <p className="text-[11px] text-white/30 text-center py-4">Loading Bible…</p>
                )}
                {searchQuery && searchReady && searchResults.length === 0 && (
                  <p className="text-[11px] text-white/30 text-center py-4">No matching verses found</p>
                )}
                {searchResults.length > 0 && (
                  <div className="text-[9px] text-white/30 uppercase tracking-widest">
                    {searchResults.length} {searchResults.length === 1 ? 'match' : 'matches'}
                  </div>
                )}

                {searchResults.map(hit => (
                  <div key={hit.ref}
                    className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-purple-500/25 transition-all group space-y-2">
                    <div className="flex items-center justify-between">
                      <button onClick={() => jumpToHit(hit)}
                        title="Open in reader"
                        className="text-[10px] text-purple-400 font-semibold hover:text-purple-300 flex items-center gap-1 transition-colors">
                        {hit.ref}
                        <ArrowUpRight size={9} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                      <span className="text-[8px] text-white/25 font-mono">{hit.tx}</span>
                    </div>
                    <p className="text-[11px] text-white/65 leading-relaxed">
                      <Highlighted text={hit.text} query={searchQuery} mode={searchMode} />
                    </p>
                    {/* Present actions */}
                    <div className="flex gap-1 pt-0.5">
                      <button onClick={() => presentHit(hit, 'queue')}
                        className="flex-1 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-white/55 text-[9px] font-semibold transition-colors flex items-center justify-center gap-1">
                        <Plus size={9} /> Queue
                      </button>
                      <button onClick={() => presentHit(hit, 'preview')}
                        className="flex-1 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/35 text-blue-300 text-[9px] font-semibold transition-colors flex items-center justify-center gap-1">
                        <Eye size={9} /> Preview
                      </button>
                      <button onClick={() => presentHit(hit, 'program')}
                        title="Send live to program"
                        className="flex-1 py-1 rounded-lg bg-red-600/25 hover:bg-red-600/40 text-red-300 text-[9px] font-semibold transition-colors flex items-center justify-center gap-1">
                        <Radio size={9} /> Live
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Topics */}
            {rightTab === 'topics' && (
              <div className="p-3 space-y-2">
                <input value={topicQuery} onChange={e => setTopicQuery(e.target.value)}
                  placeholder="Filter topics..."
                  className="w-full px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white/70 placeholder:text-white/25 outline-none mb-2" />
                {TOPICS.filter(t => !topicQuery || t.name.toLowerCase().includes(topicQuery.toLowerCase())).map(topic => (
                  <button key={topic.id}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-purple-500/25 hover:bg-purple-600/5 transition-all text-left">
                    <div className="flex items-center gap-2">
                      <div className={cn('w-2 h-2 rounded-full', TOPIC_DOT[topic.dot] ?? 'bg-white/40')} />
                      <span className="text-xs text-white/65">{topic.name}</span>
                    </div>
                    <span className="text-[10px] text-white/25">{topic.count} refs</span>
                  </button>
                ))}
              </div>
            )}

            {/* Bookmarks */}
            {rightTab === 'bookmarks' && (
              <div className="p-3 space-y-2">
                <div className="text-[10px] text-white/35 uppercase tracking-widest mb-2">
                  Saved Verses ({bookmarks.size})
                </div>
                {bookmarks.size === 0 && (
                  <p className="text-[11px] text-white/25 text-center py-6">Click the ★ icon on any verse to bookmark it</p>
                )}
                {[...bookmarks].map(key => {
                  const [bk, ch, v] = key.split(':')
                  return (
                    <div key={key} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-yellow-500/20 transition-all group cursor-pointer">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-yellow-400 font-semibold">{bk} {ch}:{v}</span>
                        <button onClick={() => setBookmarks(p => { const n=new Set(p); n.delete(key); return n })}
                          className="text-white/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                          <X size={10} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Word Study */}
            {rightTab === 'wordStudy' && (
              <div className="p-3 space-y-3">
                <div className="text-[10px] text-white/35 uppercase tracking-widest">Strong's Concordance</div>
                <input value={wordStudyWord} onChange={e => setWordStudyWord(e.target.value)}
                  placeholder="Enter word or Strong's # (G3056)..."
                  className="w-full px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white/70 placeholder:text-white/25 outline-none" />
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.07] space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-purple-400 font-mono font-bold">G26</span>
                    <span className="text-sm text-white/80 font-semibold">ἀγάπη</span>
                    <span className="text-[10px] text-white/40">agapē</span>
                  </div>
                  <div className="text-[10px] text-white/30">Noun Feminine — Love / Charity</div>
                  <p className="text-[11px] text-white/55 leading-relaxed">
                    Love, affection, or benevolence; specifically the divine love shown by God toward man and man toward God.
                  </p>
                  <div className="flex items-center gap-2 text-[9px] text-white/30">
                    <span className="px-1.5 py-0.5 rounded bg-white/[0.04]">KJV: charity (28)</span>
                    <span className="px-1.5 py-0.5 rounded bg-white/[0.04]">love (86)</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] text-white/35 uppercase tracking-widest">Common NT Words</div>
                  {[{n:'G26',g:'ἀγάπη',e:'Love'},{n:'G4102',g:'πίστις',e:'Faith'},{n:'G5485',g:'χάρις',e:'Grace'},{n:'G2316',g:'θεός',e:'God'},{n:'G3056',g:'λόγος',e:'Word'}].map(w => (
                    <button key={w.n} onClick={() => setWordStudyWord(w.n)}
                      className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/[0.04] transition-colors text-left">
                      <span className="text-[10px] text-purple-400/70 font-mono w-10">{w.n}</span>
                      <span className="text-xs text-white/60">{w.g}</span>
                      <span className="text-[10px] text-white/35 ml-auto">{w.e}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Reading Plans */}
            {rightTab === 'readingPlan' && (
              <div className="p-3 space-y-3">
                <div className="text-[10px] text-white/35 uppercase tracking-widest">Reading Plans</div>
                <div className="p-3 rounded-xl bg-purple-600/10 border border-purple-500/20">
                  <div className="text-[10px] text-purple-400 font-semibold mb-2 flex items-center gap-1.5">
                    <Calendar size={10} /> Today's Reading
                  </div>
                  <div className="space-y-1">
                    {[{ ref:'Genesis 1–2', label:'OT' },{ ref:'Matthew 1', label:'NT' }].map(p => (
                      <div key={p.ref} className="flex items-center gap-2">
                        <span className="text-[9px] text-white/30 w-5">{p.label}</span>
                        <span className="text-[11px] text-white/60">{p.ref}</span>
                        <button className="ml-auto text-[9px] text-purple-400 hover:text-purple-300">Go →</button>
                      </div>
                    ))}
                  </div>
                </div>
                {READING_PLANS.map(plan => (
                  <div key={plan.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/65 font-medium">{plan.name}</span>
                      <span className="text-[9px] text-white/30">{plan.duration}d</span>
                    </div>
                    {plan.progress > 0 && (
                      <>
                        <div className="h-1 rounded-full bg-white/[0.06]">
                          <motion.div initial={{ width:0 }}
                            animate={{ width:`${(plan.progress/plan.duration)*100}%` }}
                            className="h-full rounded-full bg-purple-500" />
                        </div>
                        <span className="text-[9px] text-white/30">Day {plan.progress} of {plan.duration}</span>
                      </>
                    )}
                    {plan.progress === 0 && (
                      <button className="w-full py-1.5 rounded-lg border border-purple-500/25 text-[10px] text-purple-400 hover:bg-purple-600/10 transition-colors">
                        Start Plan
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Producer Queue Panel ────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-white/[0.05] bg-app">
        {/* Collapse toggle bar */}
        <button onClick={() => setProducerOpen(v => !v)}
          className="w-full flex items-center gap-2 px-4 py-1.5 hover:bg-white/[0.03] transition-colors group">
          <MonitorPlay size={12} className="text-purple-400" />
          <span className="text-[10px] font-semibold text-white/50 uppercase tracking-widest">Producer Queue</span>
          {displayQueue.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-purple-600/30 text-purple-300 text-[9px] font-bold">{displayQueue.length}</span>
          )}
          {programItem && (
            <span className="flex items-center gap-1 ml-1 px-1.5 py-0.5 rounded-full bg-red-600/25 text-red-400 text-[9px] font-bold">
              <Radio size={8} className="animate-pulse" /> LIVE
            </span>
          )}
          <div className="flex-1" />
          {producerOpen ? <ChevronDown size={11} className="text-white/25" /> : <ChevronUp size={11} className="text-white/25" />}
        </button>

        <AnimatePresence>
          {producerOpen && (
            <motion.div
              initial={{ height:0, opacity:0 }}
              animate={{ height:'auto', opacity:1 }}
              exit={{ height:0, opacity:0 }}
              className="overflow-hidden"
            >
              <div className="flex gap-2 px-3 pb-3 overflow-x-auto scrollbar-none">

                {/* PREPARED queue */}
                <div className="flex-1 min-w-0">
                  <div className="text-[9px] text-white/30 uppercase tracking-widest mb-1.5 px-1">
                    Prepared ({displayQueue.length})
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {displayQueue.length === 0 && (
                      <div className="min-w-48 flex items-center justify-center py-3 rounded-lg border border-dashed border-white/[0.07] text-[10px] text-white/20">
                        Queue is empty
                      </div>
                    )}
                    {displayQueue.map(item => (
                      <div key={item.id}
                        className="min-w-52 shrink-0 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.07] space-y-1.5 group">
                        <div className="flex items-start justify-between gap-1">
                          <div>
                            <p className="text-[10px] text-white/70 font-semibold leading-tight truncate max-w-36">{item.book} {item.chapter}:{item.verse}</p>
                            <p className="text-[9px] text-white/35">{item.primaryTranslation}{item.secondaryTranslation ? ` + ${item.secondaryTranslation}` : ''} · {item.style}</p>
                          </div>
                          <button onClick={() => removeFromQueue(item.id)}
                            className="text-white/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0">
                            <X size={9} />
                          </button>
                        </div>
                        <p className="text-[9px] text-white/40 line-clamp-1">{item.primaryText}</p>
                        <button onClick={() => moveToPreview(item)}
                          className="w-full py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/35 text-blue-300 text-[9px] font-semibold transition-colors flex items-center justify-center gap-1">
                          <Eye size={9} /> Send to Preview
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Divider */}
                <div className="w-px bg-white/[0.05] self-stretch mx-1" />

                {/* PREVIEW slot */}
                <div className="w-56 shrink-0">
                  <div className="text-[9px] text-blue-400/70 uppercase tracking-widest mb-1.5 px-1 flex items-center gap-1">
                    <Eye size={8} /> Preview
                  </div>
                  {previewItem ? (
                    <div className="p-2.5 rounded-xl bg-blue-600/10 border border-blue-500/30 space-y-1.5">
                      <p className="text-[10px] text-white/70 font-semibold">{previewItem.book} {previewItem.chapter}:{previewItem.verse}</p>
                      <p className="text-[9px] text-blue-300/70">{previewItem.primaryTranslation}{previewItem.secondaryTranslation ? ` + ${previewItem.secondaryTranslation}` : ''}</p>
                      <p className="text-[9px] text-white/40 line-clamp-2">{previewItem.primaryText}</p>
                      {previewItem.secondaryText && (
                        <p className="text-[9px] text-violet-300/50 italic line-clamp-1">{previewItem.secondaryText}</p>
                      )}
                      <div className="pt-1 flex gap-1.5">
                        <button onClick={sendPreviewToProgram}
                          className="flex-1 py-1 rounded-lg bg-red-600/80 hover:bg-red-600 text-white text-[9px] font-bold transition-colors flex items-center justify-center gap-1">
                          <Radio size={8} /> TAKE LIVE
                        </button>
                        <button onClick={() => { setPreviewItem(null); setDisplayQueue(q => [...q, { ...previewItem, state:'prepared' }]) }}
                          className="px-2 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.09] text-white/40 text-[9px] transition-colors">
                          <X size={9} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-5 rounded-xl border border-dashed border-blue-500/15 text-[10px] text-blue-400/30">
                      No preview
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="w-px bg-white/[0.05] self-stretch mx-1" />

                {/* PROGRAM slot */}
                <div className="w-56 shrink-0">
                  <div className="text-[9px] text-red-400/80 uppercase tracking-widest mb-1.5 px-1 flex items-center gap-1">
                    <Radio size={8} className={programItem ? 'animate-pulse' : ''} /> Program
                  </div>
                  {programItem ? (
                    <div className="p-2.5 rounded-xl bg-red-600/10 border border-red-500/40 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-white/80 font-semibold">{programItem.book} {programItem.chapter}:{programItem.verse}</p>
                        <span className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[8px] font-bold">LIVE</span>
                      </div>
                      <p className="text-[9px] text-red-300/70">{programItem.primaryTranslation}{programItem.secondaryTranslation ? ` + ${programItem.secondaryTranslation}` : ''} · {programItem.style}</p>
                      <p className="text-[9px] text-white/50 line-clamp-2">{programItem.primaryText}</p>
                      {programItem.secondaryText && (
                        <p className="text-[9px] text-violet-300/50 italic line-clamp-1">{programItem.secondaryText}</p>
                      )}
                      <button onClick={clearProgram}
                        className="w-full py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.09] text-white/40 text-[9px] transition-colors">
                        Clear Program
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-5 rounded-xl border border-dashed border-red-500/15 text-[10px] text-red-400/25">
                      Nothing on air
                    </div>
                  )}
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
