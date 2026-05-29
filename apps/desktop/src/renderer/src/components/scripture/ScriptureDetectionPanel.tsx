import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic2, BookOpen, Zap, CheckCircle2, Clock, Monitor, Send, MicOff } from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import { cn } from '../../lib/utils'

export interface DetectedScripture {
  id: string
  reference: string
  text: string
  translation: string
  confidence: number
  detectedAt: Date
  state: 'detected' | 'preview' | 'program'
}

interface Props {
  onSendToPreview?: (reference: string, text: string) => void
}

// ─── Scripture detection helpers ─────────────────────────────────────────────

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
  'gi'
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

interface RawDetection { reference: string; book: string; chapter: number; verse?: number; endVerse?: number; confidence: number }

function detectInText(text: string, seen: Set<string>): RawDetection[] {
  const results: RawDetection[] = []
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
    const reference = verse ? `${book} ${chapter}:${verse}${endVerse ? `–${endVerse}` : ''}` : `${book} ${chapter}`
    if (seen.has(reference)) continue
    seen.add(reference)
    const confidence = endVerse ? 0.95 : verse ? 0.9 : 0.6
    results.push({ reference, book, chapter, verse, endVerse, confidence })
  }
  return results
}

async function fetchVerseText(book: string, chapter: number, verse?: number): Promise<string> {
  try {
    const path = verse
      ? `/reference/${encodeURIComponent(book)}/${chapter}/${verse}?translation=NIV`
      : `/reference/${encodeURIComponent(book)}/${chapter}?translation=NIV`
    const res = await fetch(`http://localhost:3001/api/v1/bible${path}`)
    if (!res.ok) return ''
    const data = await res.json()
    const verses: any[] = data?.data?.verses ?? []
    if (verses.length === 0) return ''
    return verses.map((v: any) => v.text).join(' ')
  } catch {
    return ''
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ScriptureDetectionPanel({ onSendToPreview }: Props) {
  const { setCurrentDetectedScripture, addDetectedScripture } = useAppStore()

  const [detections, setDetections] = useState<DetectedScripture[]>(DEMO_DETECTIONS)
  const [transcription, setTranscription] = useState('')
  const [micError, setMicError] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)

  const recognitionRef = useRef<any>(null)
  const finalTranscriptRef = useRef('')
  const seenRefsRef = useRef<Set<string>>(new Set(DEMO_DETECTIONS.map(d => d.reference)))
  const activeRef = useRef(true)

  const addDetection = useCallback(async (raw: RawDetection) => {
    const text = await fetchVerseText(raw.book, raw.chapter, raw.verse)
    const detection: DetectedScripture = {
      id: `det-${Date.now()}-${Math.random()}`,
      reference: raw.reference,
      text: text || '(verse text unavailable — check Bible page)',
      translation: 'NIV',
      confidence: raw.confidence,
      detectedAt: new Date(),
      state: 'detected',
    }
    setDetections(prev => [detection, ...prev.slice(0, 9)])
    setCurrentDetectedScripture(raw.reference)
    addDetectedScripture(raw.reference)
  }, [setCurrentDetectedScripture, addDetectedScripture])

  useEffect(() => {
    activeRef.current = true

    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
    if (!SR) {
      setMicError('Speech recognition is not supported in this environment.')
      return
    }

    const recognition: any = new SR()
    recognitionRef.current = recognition
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognition.maxAlternatives = 1

    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => {
      setIsListening(false)
      // Auto-restart unless unmounted
      if (activeRef.current) {
        try { recognition.start() } catch { /* already starting */ }
      }
    }
    recognition.onerror = (e: any) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setMicError('Microphone permission denied. Allow access in Electron settings.')
        activeRef.current = false
      }
      // 'no-speech' and 'audio-capture' are transient — let onend restart
    }

    recognition.onresult = (e: any) => {
      let interim = ''
      for (let idx = e.resultIndex; idx < e.results.length; idx++) {
        const t = e.results[idx][0].transcript
        if (e.results[idx].isFinal) {
          finalTranscriptRef.current += ' ' + t
        } else {
          interim += t
        }
      }
      // Keep last 500 chars of final + current interim
      const window600 = (finalTranscriptRef.current + ' ' + interim).slice(-600)
      setTranscription(window600.trim())

      // Run detection on the combined window
      const newDets = detectInText(window600, seenRefsRef.current)
      for (const d of newDets) addDetection(d)
    }

    try {
      recognition.start()
    } catch (err) {
      setMicError('Could not start speech recognition.')
    }

    return () => {
      activeRef.current = false
      recognitionRef.current = null
      try { recognition.stop() } catch { /* ignore */ }
    }
  }, [addDetection])

  const sendToPreview = (d: DetectedScripture) => {
    setDetections(prev => prev.map(x => x.id === d.id ? { ...x, state: 'preview' } : x))
    onSendToPreview?.(d.reference, d.text)
  }

  const markProgram = (d: DetectedScripture) => {
    setDetections(prev => prev.map(x => x.id === d.id ? { ...x, state: 'program' } : x))
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#09090f]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-purple-600/25 border border-purple-500/30 flex items-center justify-center">
            <Zap size={12} className="text-purple-400" />
          </div>
          <span className="text-xs font-semibold text-white/80">AI Scripture</span>
        </div>
        <div className="flex items-center gap-1.5">
          {micError ? (
            <MicOff size={12} className="text-red-400" />
          ) : (
            <>
              <span className={cn('w-1.5 h-1.5 rounded-full', isListening ? 'live-dot bg-purple-400' : 'bg-white/20')} />
              <span className={cn('text-[10px] font-medium', isListening ? 'text-purple-400' : 'text-white/30')}>
                {isListening ? 'Listening' : 'Starting…'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Live transcription */}
      <div className="px-3 py-2.5 border-b border-white/[0.05]">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Mic2 size={10} className="text-white/35" />
          <span className="text-[9px] text-white/35 uppercase tracking-widest">Live Transcript</span>
        </div>
        <div className="min-h-[40px] px-2.5 py-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
          {micError ? (
            <p className="text-[11px] text-red-400/70 leading-relaxed">{micError}</p>
          ) : (
            <AnimatePresence mode="wait">
              <motion.p
                key={transcription.slice(-40)}
                initial={{ opacity: 0.6 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="text-[11px] text-white/55 leading-relaxed italic"
              >
                {transcription
                  ? `…${transcription.slice(-180)}`
                  : 'Waiting for audio — speak a scripture reference…'}
              </motion.p>
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Detected list */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        <div className="flex items-center gap-1.5 mb-1">
          <BookOpen size={10} className="text-white/35" />
          <span className="text-[9px] text-white/35 uppercase tracking-widest">Detected</span>
        </div>

        <AnimatePresence initial={false}>
          {detections.map(d => (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className={cn(
                'rounded-xl border p-2.5 overflow-hidden',
                d.state === 'program' && 'bg-red-500/10 border-red-500/30 opacity-70',
                d.state === 'preview' && 'bg-emerald-500/10 border-emerald-500/30',
                d.state === 'detected' && 'bg-purple-600/10 border-purple-500/25',
              )}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-purple-300">{d.reference}</span>
                  <span className="text-[9px] text-white/30">{d.translation}</span>
                  <ConfBadge confidence={d.confidence} />
                </div>
                <span className="text-[9px] text-white/25 font-mono flex items-center gap-0.5">
                  <Clock size={8} />
                  {fmt(d.detectedAt)}
                </span>
              </div>

              <p className="text-[11px] text-white/55 leading-relaxed line-clamp-2 mb-2">{d.text}</p>

              {d.state === 'detected' && (
                <button
                  onClick={() => sendToPreview(d)}
                  className="w-full flex items-center justify-center gap-1.5 py-1 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 text-[10px] font-semibold transition-colors"
                >
                  <Monitor size={10} />
                  Send to Preview
                </button>
              )}
              {d.state === 'preview' && (
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 flex items-center gap-1 text-[10px] text-emerald-400">
                    <Monitor size={10} />
                    In Preview
                  </div>
                  <button
                    onClick={() => markProgram(d)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-red-600/30 hover:bg-red-600/50 text-red-300 text-[10px] font-semibold transition-colors"
                  >
                    <Send size={9} />
                    Take Live
                  </button>
                </div>
              )}
              {d.state === 'program' && (
                <div className="flex items-center gap-1 text-[10px] text-red-400">
                  <CheckCircle2 size={10} />
                  On Program
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

function ConfBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100)
  return (
    <span className={cn(
      'text-[9px] font-mono px-1 py-0.5 rounded',
      pct >= 90 ? 'text-emerald-400 bg-emerald-400/10' :
      pct >= 75 ? 'text-yellow-400 bg-yellow-400/10' :
                  'text-red-400 bg-red-400/10',
    )}>
      {pct}%
    </span>
  )
}

function fmt(d: Date) {
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

const DEMO_DETECTIONS: DetectedScripture[] = [
  {
    id: 'demo-1',
    reference: 'Psalm 23:1',
    text: 'The Lord is my shepherd, I lack nothing.',
    translation: 'NIV',
    confidence: 0.99,
    detectedAt: new Date(Date.now() - 310_000),
    state: 'program',
  },
  {
    id: 'demo-2',
    reference: 'Philippians 4:13',
    text: 'I can do all this through him who gives me strength.',
    translation: 'NIV',
    confidence: 0.95,
    detectedAt: new Date(Date.now() - 180_000),
    state: 'preview',
  },
]
