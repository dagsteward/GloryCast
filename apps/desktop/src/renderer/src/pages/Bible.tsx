import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, BookOpen, ChevronRight, Star, Send, BookMarked, History } from 'lucide-react'
import { cn } from '../lib/utils'

interface Verse {
  book: string; chapter: number; verse: number; text: string; translation: string
}

const OT_BOOKS = ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel', '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi']
const NT_BOOKS = ['Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James', '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude', 'Revelation']

const DEMO_CHAPTER: Verse[] = [
  { book: 'Romans', chapter: 8, verse: 26, text: 'In the same way, the Spirit helps us in our weakness. We do not know what we ought to pray for, but the Spirit himself intercedes for us through wordless groans.', translation: 'NIV' },
  { book: 'Romans', chapter: 8, verse: 27, text: 'And he who searches our hearts knows the mind of the Spirit, because the Spirit intercedes for God\'s people in accordance with the will of God.', translation: 'NIV' },
  { book: 'Romans', chapter: 8, verse: 28, text: 'And we know that in all things God works for the good of those who love him, who have been called according to his purpose.', translation: 'NIV' },
  { book: 'Romans', chapter: 8, verse: 29, text: 'For those God foreknew he also predestined to be conformed to the image of his Son, that he might be the firstborn among many brothers and sisters.', translation: 'NIV' },
  { book: 'Romans', chapter: 8, verse: 30, text: 'And those he predestined, he also called; those he called, he also justified; those he justified, he also glorified.', translation: 'NIV' },
  { book: 'Romans', chapter: 8, verse: 31, text: 'What, then, shall we say in response to these things? If God is for us, who can be against us?', translation: 'NIV' },
  { book: 'Romans', chapter: 8, verse: 32, text: 'He who did not spare his own Son, but gave him up for us all—how will he not also, along with him, graciously give us all things?', translation: 'NIV' },
  { book: 'Romans', chapter: 8, verse: 38, text: 'For I am convinced that neither death nor life, neither angels nor demons, neither the present nor the future, nor any powers,', translation: 'NIV' },
  { book: 'Romans', chapter: 8, verse: 39, text: 'neither height nor depth, nor anything else in all creation, will be able to separate us from the love of God that is in Christ Jesus our Lord.', translation: 'NIV' },
]

export function BiblePage() {
  const [selectedBook, setSelectedBook] = useState('Romans')
  const [selectedChapter, setSelectedChapter] = useState(8)
  const [searchQuery, setSearchQuery] = useState('')
  const [translation, setTranslation] = useState('NIV')
  const [selectedVerse, setSelectedVerse] = useState<number | null>(28)
  const [bookSection, setBookSection] = useState<'OT' | 'NT'>('NT')

  const displayVerse = DEMO_CHAPTER.find(v => v.verse === selectedVerse)

  return (
    <div className="h-full flex overflow-hidden">
      {/* Left: Book navigator */}
      <div className="w-48 shrink-0 flex flex-col border-r border-white/[0.05] bg-[#09090f]">
        <div className="flex border-b border-white/[0.05]">
          {(['OT', 'NT'] as const).map(s => (
            <button
              key={s}
              onClick={() => setBookSection(s)}
              className={cn(
                'flex-1 py-2 text-[11px] font-semibold transition-colors',
                bookSection === s ? 'text-purple-400 border-b-2 border-purple-500' : 'text-white/30 hover:text-white/60',
              )}
            >
              {s === 'OT' ? 'Old Testament' : 'New Testament'}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {(bookSection === 'OT' ? OT_BOOKS : NT_BOOKS).map(book => (
            <button
              key={book}
              onClick={() => { setSelectedBook(book); setSelectedChapter(1) }}
              className={cn(
                'w-full text-left px-3 py-1.5 text-xs transition-colors',
                selectedBook === book
                  ? 'text-purple-400 bg-purple-600/10'
                  : 'text-white/45 hover:text-white/75 hover:bg-white/[0.03]',
              )}
            >
              {book}
            </button>
          ))}
        </div>
      </div>

      {/* Center: Chapter text */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Controls */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.05] bg-[#0a0a12] shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen size={14} className="text-purple-400" />
            <span className="text-sm font-semibold text-white/80">
              {selectedBook} {selectedChapter}
            </span>
            <div className="flex items-center gap-1 ml-2">
              {[...Array(16)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setSelectedChapter(i + 1)}
                  className={cn(
                    'w-6 h-6 rounded text-[10px] font-medium transition-colors',
                    selectedChapter === i + 1 ? 'bg-purple-600 text-white' : 'text-white/30 hover:bg-white/10 hover:text-white/70',
                  )}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={translation}
              onChange={e => setTranslation(e.target.value)}
              className="bg-white/[0.04] border border-white/10 text-xs text-white/60 px-2 py-1 rounded-lg outline-none"
            >
              {['NIV', 'ESV', 'KJV', 'NKJV', 'NLT', 'NASB', 'MSG'].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Verses */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto space-y-1">
            {DEMO_CHAPTER.map(verse => (
              <motion.div
                key={verse.verse}
                onClick={() => setSelectedVerse(verse.verse === selectedVerse ? null : verse.verse)}
                className={cn(
                  'group flex gap-3 p-2 rounded-lg cursor-pointer transition-all',
                  selectedVerse === verse.verse
                    ? 'bg-purple-600/15 border border-purple-500/30'
                    : 'hover:bg-white/[0.03]',
                )}
              >
                <span className="text-[11px] text-purple-400/70 font-mono mt-1 w-5 shrink-0 text-right">
                  {verse.verse}
                </span>
                <p className={cn(
                  'text-sm leading-relaxed flex-1',
                  selectedVerse === verse.verse ? 'text-white/90' : 'text-white/65',
                )}>
                  {verse.text}
                </p>
                {selectedVerse === verse.verse && (
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      title="Send to presentation"
                      className="w-7 h-7 rounded-lg bg-purple-600/25 hover:bg-purple-600 text-purple-400 hover:text-white flex items-center justify-center transition-colors"
                    >
                      <Send size={11} />
                    </button>
                    <button
                      title="Save"
                      className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white flex items-center justify-center transition-colors"
                    >
                      <Star size={11} />
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Cross-references + Notes */}
      <div className="w-64 shrink-0 border-l border-white/[0.05] flex flex-col">
        <div className="px-3 py-2.5 border-b border-white/[0.05]">
          <div className="relative">
            <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/25" />
            <input
              placeholder="Search scriptures..."
              className="w-full pl-7 pr-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.07] text-xs text-white/70 placeholder:text-white/25 outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {displayVerse && (
            <div>
              <div className="text-[10px] text-white/40 uppercase tracking-widest mb-2">Selected</div>
              <div className="p-3 rounded-lg bg-purple-600/10 border border-purple-500/20">
                <p className="text-xs text-white/70 italic leading-relaxed">{displayVerse.text}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] text-purple-400 font-semibold">
                    {displayVerse.book} {displayVerse.chapter}:{displayVerse.verse}
                  </span>
                  <button className="flex items-center gap-1 px-2 py-1 rounded bg-purple-600 hover:bg-purple-500 text-[10px] text-white font-medium transition-colors">
                    <Send size={9} />
                    Display
                  </button>
                </div>
              </div>
            </div>
          )}

          <div>
            <div className="text-[10px] text-white/40 uppercase tracking-widest mb-2">Cross-References</div>
            <div className="space-y-1.5">
              {[
                { ref: 'Gen 50:20', text: 'You intended to harm me, but God intended it for good...' },
                { ref: 'Phil 4:13', text: 'I can do all this through him who gives me strength.' },
                { ref: 'Jer 29:11', text: 'For I know the plans I have for you, declares the Lord...' },
                { ref: 'Eph 1:11', text: '...having been predestined according to the plan of him...' },
              ].map(xref => (
                <div key={xref.ref} className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.05] cursor-pointer hover:bg-white/[0.04] transition-colors">
                  <div className="text-[10px] text-purple-400 font-semibold mb-0.5">{xref.ref}</div>
                  <p className="text-[10px] text-white/45 leading-relaxed line-clamp-2">{xref.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
