import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, BookOpen, Star, Send, BookMarked, ChevronRight,
  ChevronLeft, Copy, ArrowUpRight, Layers, Hash, Tag,
  Calendar, Bookmark, FileText, SlidersHorizontal, Zap,
  Circle, ChevronDown, X, Plus, Clock, RotateCcw
} from 'lucide-react'
import { cn } from '../lib/utils'

// ─── Book data (embedded so renderer needs no IPC for navigation) ─────────

interface Book { id: number; name: string; chapterCount: number; testament: 'OT' | 'NT' }
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

const TRANSLATIONS = ['KJV', 'NIV', 'ESV', 'NKJV', 'NLT', 'MSG', 'GNT']

type RightTab = 'crossrefs' | 'search' | 'topics' | 'bookmarks' | 'wordStudy' | 'readingPlan'

interface VerseData { verse: number; text: string; bookmarked?: boolean; highlighted?: string }

// ─── Demo verse data per book/chapter ────────────────────────────────────
const VERSE_CACHE: Record<string, VerseData[]> = {
  'John:3': [
    {verse:16,text:'For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.'},
    {verse:17,text:'For God did not send his Son into the world to condemn the world, but to save the world through him.'},
    {verse:18,text:'Whoever believes in him is not condemned, but whoever does not believe stands condemned already because they have not believed in the name of God\'s one and only Son.'},
  ],
  'Romans:8': [
    {verse:26,text:'In the same way, the Spirit helps us in our weakness. We do not know what we ought to pray for, but the Spirit himself intercedes for us through wordless groans.'},
    {verse:27,text:'And he who searches our hearts knows the mind of the Spirit, because the Spirit intercedes for God\'s people in accordance with the will of God.'},
    {verse:28,text:'And we know that in all things God works for the good of those who love him, who have been called according to his purpose.',highlighted:'yellow'},
    {verse:29,text:'For those God foreknew he also predestined to be conformed to the image of his Son, that he might be the firstborn among many brothers and sisters.'},
    {verse:30,text:'And those he predestined, he also called; those he called, he also justified; those he justified, he also glorified.'},
    {verse:31,text:'What, then, shall we say in response to these things? If God is for us, who can be against us?'},
    {verse:32,text:'He who did not spare his own Son, but gave him up for us all—how will he not also, along with him, graciously give us all things?'},
    {verse:38,text:'For I am convinced that neither death nor life, neither angels nor demons, neither the present nor the future, nor any powers,'},
    {verse:39,text:'neither height nor depth, nor anything else in all creation, will be able to separate us from the love of God that is in Christ Jesus our Lord.'},
  ],
  'Psalms:23': [
    {verse:1,text:'The LORD is my shepherd, I lack nothing.',highlighted:'purple'},
    {verse:2,text:'He makes me lie down in green pastures, he leads me beside quiet waters,'},
    {verse:3,text:'he refreshes my soul. He guides me along the right paths for his name\'s sake.'},
    {verse:4,text:'Even though I walk through the darkest valley, I will fear no evil, for you are with me; your rod and your staff, they comfort me.'},
    {verse:5,text:'You prepare a table before me in the presence of my enemies. You anoint my head with oil; my cup overflows.'},
    {verse:6,text:'Surely your goodness and love will follow me all the days of my life, and I will dwell in the house of the LORD forever.'},
  ],
  'Philippians:4': [
    {verse:4,text:'Rejoice in the Lord always. I will say it again: Rejoice!'},
    {verse:6,text:'Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God.',highlighted:'green'},
    {verse:7,text:'And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus.'},
    {verse:8,text:'Finally, brothers and sisters, whatever is true, whatever is noble, whatever is right, whatever is pure, whatever is lovely, whatever is admirable—if anything is excellent or praiseworthy—think about such things.'},
    {verse:13,text:'I can do all this through him who gives me strength.',highlighted:'yellow'},
  ],
}

function getVerses(bookName: string, chapter: number): VerseData[] {
  return VERSE_CACHE[`${bookName}:${chapter}`] ?? generateFakeVerses(bookName, chapter)
}

function generateFakeVerses(bookName: string, chapter: number): VerseData[] {
  return Array.from({ length: 8 }, (_, i) => ({
    verse: i + 1,
    text: `[${bookName} ${chapter}:${i + 1}] Scripture text will appear here when connected to the Bible engine.`,
  }))
}

const HIGHLIGHT_COLORS: Record<string, string> = {
  yellow: 'bg-yellow-500/20 border-yellow-500/30',
  green:  'bg-emerald-500/15 border-emerald-500/25',
  blue:   'bg-blue-500/15 border-blue-500/25',
  purple: 'bg-purple-500/20 border-purple-500/30',
  pink:   'bg-pink-500/15 border-pink-500/25',
}

const CROSS_REFS: Record<string, { ref: string; text: string }[]> = {
  'Romans:8:28': [
    { ref: 'Gen 50:20',  text: 'You intended to harm me, but God intended it for good...' },
    { ref: 'Jer 29:11',  text: 'For I know the plans I have for you, declares the Lord...' },
    { ref: 'Phil 4:13',  text: 'I can do all this through him who gives me strength.' },
    { ref: 'Ps 37:23',   text: 'The LORD makes firm the steps of the one who delights in him.' },
  ],
  'John:3:16': [
    { ref: '1 John 4:9',  text: 'This is how God showed his love among us: He sent his one and only Son...' },
    { ref: 'Rom 5:8',     text: 'But God demonstrates his own love for us in this: While we were still sinners...' },
    { ref: 'John 3:17',   text: 'For God did not send his Son into the world to condemn the world...' },
    { ref: 'Eph 2:8',     text: 'For it is by grace you have been saved, through faith...' },
  ],
  'Psalms:23:1': [
    { ref: 'Ezek 34:11', text: 'For this is what the Sovereign LORD says: I myself will search for my sheep...' },
    { ref: 'John 10:11', text: 'I am the good shepherd. The good shepherd lays down his life for the sheep.' },
    { ref: 'Ps 28:9',    text: 'Save your people and bless your inheritance; be their shepherd...' },
  ],
}

const TOPIC_DOT: Record<string, string> = {
  purple:  'bg-purple-400',
  blue:    'bg-blue-400',
  emerald: 'bg-emerald-400',
  pink:    'bg-pink-400',
  orange:  'bg-orange-400',
  teal:    'bg-teal-400',
  sky:     'bg-sky-400',
  yellow:  'bg-yellow-400',
}

const TOPICS = [
  { id: 'salvation',    name: 'Salvation',       dot: 'purple',  count: 47 },
  { id: 'prayer',       name: 'Prayer',           dot: 'blue',    count: 38 },
  { id: 'faith',        name: 'Faith',            dot: 'emerald', count: 52 },
  { id: 'love',         name: 'Love',             dot: 'pink',    count: 61 },
  { id: 'grace',        name: 'Grace',            dot: 'orange',  count: 29 },
  { id: 'peace',        name: 'Peace',            dot: 'teal',    count: 33 },
  { id: 'worship',      name: 'Worship',          dot: 'purple',  count: 41 },
  { id: 'forgiveness',  name: 'Forgiveness',      dot: 'blue',    count: 26 },
  { id: 'holy-spirit',  name: 'Holy Spirit',      dot: 'sky',     count: 35 },
  { id: 'eternal-life', name: 'Eternal Life',     dot: 'emerald', count: 22 },
  { id: 'strength',     name: 'Strength',         dot: 'orange',  count: 31 },
  { id: 'wisdom',       name: 'Wisdom',           dot: 'yellow',  count: 44 },
]

const READING_PLANS = [
  { id: 'bible-year',      name: 'Bible in a Year',        duration: 365, progress: 42 },
  { id: 'nt-90',           name: 'NT in 90 Days',          duration: 90,  progress: 0 },
  { id: 'psalms-proverbs', name: 'Psalms & Proverbs',      duration: 31,  progress: 12 },
  { id: 'gospels',         name: 'Four Gospels in 40 Days', duration: 40, progress: 0 },
]

// ─── Component ────────────────────────────────────────────────────────────

export function BiblePage() {
  const [testament, setTestament]   = useState<'OT' | 'NT'>('NT')
  const [bookFilter, setBookFilter] = useState('')
  const [selectedBook, setSelectedBook] = useState<Book>(BOOKS[42])   // John
  const [selectedChapter, setSelectedChapter] = useState(3)
  const [translation, setTranslation] = useState('KJV')
  const [selectedVerse, setSelectedVerse] = useState<number | null>(16)
  const [rightTab, setRightTab] = useState<RightTab>('crossrefs')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ref:string;text:string}[]>([])
  const [topicQuery, setTopicQuery] = useState('')
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set(['Romans:8:28']))
  const [comparingTranslations, setComparingTranslations] = useState(false)
  const [wordStudyWord, setWordStudyWord] = useState('')
  const [fontScale, setFontScale] = useState(1)
  const [history, setHistory] = useState<{book:Book;chapter:number;verse:number|null}[]>([])
  const verseRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  const verses = getVerses(selectedBook.name, selectedChapter)
  const bookmarkKey = (v: number) => `${selectedBook.name}:${selectedChapter}:${v}`
  const selectedVerseData = verses.find(v => v.verse === selectedVerse)

  const crossRefs = selectedVerse
    ? (CROSS_REFS[`${selectedBook.name}:${selectedChapter}:${selectedVerse}`] ??
       CROSS_REFS[`${selectedBook.name}:${selectedChapter}:1`] ?? [])
    : []

  const visibleBooks = BOOKS.filter(b =>
    b.testament === testament &&
    (bookFilter ? b.name.toLowerCase().includes(bookFilter.toLowerCase()) : true)
  )

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

  function toggleBookmark(verse: number) {
    const key = bookmarkKey(verse)
    setBookmarks(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function runSearch() {
    if (!searchQuery.trim()) { setSearchResults([]); return }
    const q = searchQuery.toLowerCase()
    const results: {ref:string;text:string}[] = []
    Object.entries(VERSE_CACHE).forEach(([key, vs]) => {
      const [bookName, chap] = key.split(':')
      vs.forEach(v => {
        if (v.text.toLowerCase().includes(q)) {
          results.push({ ref: `${bookName} ${chap}:${v.verse}`, text: v.text })
        }
      })
    })
    setSearchResults(results.slice(0, 20))
  }

  const chapterCount = selectedBook.chapterCount

  return (
    <div className="h-full flex overflow-hidden bg-[#07070a]">

      {/* ── Left: Book navigator ─────────────────────────────────────── */}
      <div className="w-44 shrink-0 flex flex-col border-r border-white/[0.05] bg-[#090910]">
        {/* OT / NT tabs */}
        <div className="flex border-b border-white/[0.05] shrink-0">
          {(['OT', 'NT'] as const).map(t => (
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

      {/* ── Center: Chapter viewer ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Toolbar */}
        <div className="shrink-0 flex items-center gap-2 px-4 py-2 border-b border-white/[0.05] bg-[#0a0a12]">
          {/* Nav arrows */}
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
          <div className="flex items-center gap-0.5 ml-1 flex-wrap max-w-xs">
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
                <button onClick={() => navigate(selectedBook, Math.max(1, selectedChapter - 1))}
                  className="w-6 h-6 rounded text-white/40 hover:bg-white/10 hover:text-white/70 flex items-center justify-center transition-colors">
                  <ChevronLeft size={11} />
                </button>
                <span className="text-xs text-white/50 px-2">
                  {selectedChapter} / {chapterCount}
                </span>
                <button onClick={() => navigate(selectedBook, Math.min(chapterCount, selectedChapter + 1))}
                  className="w-6 h-6 rounded text-white/40 hover:bg-white/10 hover:text-white/70 flex items-center justify-center transition-colors">
                  <ChevronRight size={11} />
                </button>
              </>
            )}
          </div>

          <div className="flex-1" />

          {/* Compare toggle */}
          <button onClick={() => setComparingTranslations(v => !v)}
            className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all',
              comparingTranslations ? 'bg-blue-600/25 text-blue-400 border border-blue-500/30' : 'text-white/40 hover:text-white/70 hover:bg-white/[0.06]')}>
            <Layers size={11} />
            Compare
          </button>

          {/* Font size */}
          <div className="flex items-center gap-1">
            <button onClick={() => setFontScale(s => Math.max(0.8, s - 0.1))}
              className="w-6 h-6 rounded text-white/30 hover:text-white/70 hover:bg-white/[0.06] flex items-center justify-center text-[10px] font-bold transition-colors">A</button>
            <button onClick={() => setFontScale(s => Math.min(1.5, s + 0.1))}
              className="w-6 h-6 rounded text-white/30 hover:text-white/70 hover:bg-white/[0.06] flex items-center justify-center text-sm font-bold transition-colors">A</button>
          </div>

          {/* Translation */}
          <select value={translation} onChange={e => setTranslation(e.target.value)}
            className="bg-white/[0.04] border border-white/10 text-[11px] text-white/60 px-2 py-1 rounded-lg outline-none cursor-pointer">
            {TRANSLATIONS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Verses area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-8 py-6 space-y-0.5">
            {/* Chapter heading */}
            <div className="flex items-center gap-3 mb-5">
              <h2 className="text-lg font-bold text-white/70">{selectedBook.name}</h2>
              <span className="text-2xl font-light text-purple-400">{selectedChapter}</span>
              <span className="text-[10px] text-white/25 bg-white/[0.04] border border-white/[0.07] px-2 py-0.5 rounded-full">{translation}</span>
            </div>

            <AnimatePresence mode="popLayout">
              {verses.map(v => {
                const isSelected = selectedVerse === v.verse
                const isBookmarked = bookmarks.has(bookmarkKey(v.verse))
                const hlClass = v.highlighted ? HIGHLIGHT_COLORS[v.highlighted] : ''

                return (
                  <motion.div
                    key={`${selectedBook.id}-${selectedChapter}-${v.verse}`}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    ref={el => { if (el) verseRefs.current.set(v.verse, el) }}
                    onClick={() => setSelectedVerse(isSelected ? null : v.verse)}
                    className={cn(
                      'group flex gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all border',
                      isSelected
                        ? 'bg-purple-600/12 border-purple-500/30 shadow-[0_0_20px_rgba(124,58,237,0.08)]'
                        : hlClass
                        ? `${hlClass} border`
                        : 'border-transparent hover:bg-white/[0.025] hover:border-white/[0.05]'
                    )}
                  >
                    {/* Verse number */}
                    <span className={cn('text-[11px] font-mono mt-0.5 w-5 shrink-0 text-right select-none',
                      isSelected ? 'text-purple-400' : 'text-white/25 group-hover:text-white/45')}>
                      {v.verse}
                    </span>

                    {/* Verse text */}
                    <p className={cn('flex-1 leading-relaxed select-text',
                      isSelected ? 'text-white' : 'text-white/70')}
                      style={{ fontSize: `${13 * fontScale}px` }}>
                      {v.text}
                    </p>

                    {/* Action buttons (visible on select/hover) */}
                    <div className={cn('flex flex-col gap-1 shrink-0 transition-opacity',
                      isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-60')}>
                      <button onClick={e => { e.stopPropagation(); toggleBookmark(v.verse) }}
                        title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
                        className={cn('w-6 h-6 rounded-lg flex items-center justify-center transition-colors',
                          isBookmarked ? 'text-yellow-400 bg-yellow-500/15' : 'text-white/30 hover:text-yellow-400 hover:bg-white/[0.07]')}>
                        <Star size={10} fill={isBookmarked ? 'currentColor' : 'none'} />
                      </button>
                      <button onClick={e => { e.stopPropagation(); navigator.clipboard?.writeText(`${v.text} — ${selectedBook.name} ${selectedChapter}:${v.verse} (${translation})`) }}
                        title="Copy"
                        className="w-6 h-6 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.07] flex items-center justify-center transition-colors">
                        <Copy size={10} />
                      </button>
                      <button onClick={e => { e.stopPropagation(); setRightTab('crossrefs') }}
                        title="Send to display"
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
              <button
                onClick={() => navigate(selectedBook, Math.max(1, selectedChapter - 1))}
                disabled={selectedChapter === 1}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-white/70 hover:bg-white/[0.05] disabled:opacity-20 transition-all">
                <ChevronLeft size={12} /> Previous Chapter
              </button>
              <button
                onClick={() => navigate(selectedBook, Math.min(chapterCount, selectedChapter + 1))}
                disabled={selectedChapter === chapterCount}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-white/70 hover:bg-white/[0.05] disabled:opacity-20 transition-all">
                Next Chapter <ChevronRight size={12} />
              </button>
            </div>
          </div>
        </div>

        {/* Translation compare strip */}
        <AnimatePresence>
          {comparingTranslations && selectedVerse && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
              className="shrink-0 border-t border-white/[0.05] bg-[#0c0c18] overflow-hidden">
              <div className="flex gap-3 overflow-x-auto px-4 py-3">
                {TRANSLATIONS.filter(t => t !== translation).map(t => (
                  <div key={t} className="min-w-48 flex-1 p-3 rounded-xl bg-white/[0.03] border border-white/[0.07]">
                    <div className="text-[10px] text-purple-400 font-semibold mb-1">{t}</div>
                    <p className="text-[11px] text-white/55 leading-relaxed">
                      {selectedVerseData?.text.slice(0, 80)}… <span className="text-white/25">[{t} translation]</span>
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Right: Feature panel ──────────────────────────────────────── */}
      <div className="w-72 shrink-0 border-l border-white/[0.05] flex flex-col bg-[#09090f]">
        {/* Tab bar */}
        <div className="flex shrink-0 border-b border-white/[0.05] overflow-x-auto scrollbar-none">
          {([
            { id: 'crossrefs',    icon: ArrowUpRight, label: 'X-Refs' },
            { id: 'search',       icon: Search,       label: 'Search' },
            { id: 'topics',       icon: Tag,          label: 'Topics' },
            { id: 'bookmarks',    icon: Bookmark,     label: 'Saved' },
            { id: 'wordStudy',    icon: Hash,         label: 'Word' },
            { id: 'readingPlan',  icon: Calendar,     label: 'Plans' },
          ] as const).map(tab => (
            <button key={tab.id} onClick={() => setRightTab(tab.id)}
              className={cn('flex flex-col items-center gap-0.5 px-3 py-2 text-[9px] font-medium transition-colors shrink-0',
                rightTab === tab.id ? 'text-purple-400 border-b-2 border-purple-500' : 'text-white/25 hover:text-white/55')}>
              <tab.icon size={12} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Selected verse card */}
        {selectedVerseData && (
          <div className="shrink-0 p-3 border-b border-white/[0.04]">
            <div className="p-3 rounded-xl bg-purple-600/8 border border-purple-500/20">
              <p className="text-[11px] text-white/70 leading-relaxed italic">"{selectedVerseData.text.slice(0,120)}{selectedVerseData.text.length > 120 ? '…' : ''}"</p>
              <div className="flex items-center justify-between mt-2.5">
                <span className="text-[10px] text-purple-400 font-semibold">
                  {selectedBook.name} {selectedChapter}:{selectedVerseData.verse} ({translation})
                </span>
                <button className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-[10px] text-white font-medium transition-colors">
                  <Send size={9} />
                  Display
                </button>
              </div>
            </div>
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
                <p className="text-[11px] text-white/25 text-center py-6">Select a verse to see cross-references</p>
              ) : (
                crossRefs.map(xr => (
                  <div key={xr.ref} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] cursor-pointer hover:bg-white/[0.04] hover:border-white/10 transition-all group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-purple-400 font-semibold">{xr.ref}</span>
                      <ArrowUpRight size={9} className="text-white/20 group-hover:text-purple-400 transition-colors" />
                    </div>
                    <p className="text-[10px] text-white/45 leading-relaxed line-clamp-2">{xr.text}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Search */}
          {rightTab === 'search' && (
            <div className="p-3 space-y-3">
              <div className="flex gap-2">
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && runSearch()}
                  placeholder="Search scriptures..."
                  className="flex-1 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white/70 placeholder:text-white/25 outline-none focus:border-purple-500/40" />
                <button onClick={runSearch}
                  className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-colors">
                  Go
                </button>
              </div>

              <div className="flex gap-1 flex-wrap">
                {['phrase', 'any word', 'all words'].map(mode => (
                  <button key={mode}
                    className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-white/[0.04] text-white/35 hover:bg-purple-600/20 hover:text-purple-400 transition-colors">
                    {mode}
                  </button>
                ))}
              </div>

              {searchResults.length === 0 && searchQuery && (
                <p className="text-[11px] text-white/30 text-center py-4">No results in cached verses</p>
              )}

              {searchResults.map(r => (
                <div key={r.ref} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] cursor-pointer hover:border-purple-500/25 transition-all">
                  <div className="text-[10px] text-purple-400 font-semibold mb-1">{r.ref}</div>
                  <p className="text-[10px] text-white/50 leading-relaxed">{r.text.slice(0, 100)}…</p>
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
                <p className="text-[11px] text-white/25 text-center py-6">
                  Click the ★ icon on any verse to bookmark it
                </p>
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

              {/* Sample Strong's entry */}
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

              {/* Today's reading */}
              <div className="p-3 rounded-xl bg-purple-600/10 border border-purple-500/20">
                <div className="text-[10px] text-purple-400 font-semibold mb-2 flex items-center gap-1.5">
                  <Calendar size={10} /> Today's Reading
                </div>
                <div className="space-y-1">
                  {[{ ref: 'Genesis 1–2', label: 'OT' }, { ref: 'Matthew 1', label: 'NT' }].map(p => (
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
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(plan.progress / plan.duration) * 100}%` }}
                          className="h-full rounded-full bg-purple-500"
                        />
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
  )
}
