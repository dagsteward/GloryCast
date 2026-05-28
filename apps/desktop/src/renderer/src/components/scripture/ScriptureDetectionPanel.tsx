import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic2, BookOpen, Zap, CheckCircle2, Clock, Monitor, Send } from 'lucide-react'
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

const SIMULATE_DETECTIONS: { reference: string; text: string; translation: string }[] = [
  { reference: 'Romans 8:28',    text: 'And we know that in all things God works for the good of those who love him, who have been called according to his purpose.', translation: 'NIV' },
  { reference: 'John 3:16',      text: 'For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.', translation: 'NIV' },
  { reference: 'Philippians 4:13', text: 'I can do all this through him who gives me strength.', translation: 'NIV' },
  { reference: 'Psalm 23:1',     text: 'The Lord is my shepherd, I lack nothing.', translation: 'NIV' },
  { reference: 'Isaiah 40:31',   text: 'But those who hope in the Lord will renew their strength. They will soar on wings like eagles.', translation: 'NIV' },
]

const TRANSCRIPTION_PHRASES = [
  '"Turn with me to Romans chapter 8..."',
  '"...verse twenty-eight. And we know..."',
  '"...in all things God works for the good..."',
  '"Now look at John chapter 3, verse 16..."',
  '"...whoever believes in him shall not perish..."',
]

export function ScriptureDetectionPanel({ onSendToPreview }: Props) {
  const { setCurrentDetectedScripture, addDetectedScripture } = useAppStore()
  const [detections, setDetections] = useState<DetectedScripture[]>(DEMO_DETECTIONS)
  const [transcription, setTranscription] = useState<string>('')
  const [simIndex, setSimIndex] = useState(0)
  const [detIndex, setDetIndex] = useState(0)

  // Simulate live transcription + periodic scripture detection
  useEffect(() => {
    const txInterval = setInterval(() => {
      setTranscription(TRANSCRIPTION_PHRASES[simIndex % TRANSCRIPTION_PHRASES.length])
      setSimIndex(i => i + 1)
    }, 3000)

    const detInterval = setInterval(() => {
      const next = SIMULATE_DETECTIONS[detIndex % SIMULATE_DETECTIONS.length]
      const detection: DetectedScripture = {
        id: `det-${Date.now()}`,
        reference:  next.reference,
        text:       next.text,
        translation:next.translation,
        confidence: 0.88 + Math.random() * 0.12,
        detectedAt: new Date(),
        state: 'detected',
      }
      setDetections(prev => {
        // Don't add duplicate if same reference is already pending
        if (prev[0]?.reference === next.reference && prev[0]?.state === 'detected') return prev
        return [detection, ...prev.slice(0, 9)]
      })
      setCurrentDetectedScripture(next.reference)
      addDetectedScripture(next.reference)
      setDetIndex(i => i + 1)
    }, 12000)

    return () => { clearInterval(txInterval); clearInterval(detInterval) }
  }, [simIndex, detIndex, setCurrentDetectedScripture, addDetectedScripture])

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
          <span className="live-dot w-1.5 h-1.5 rounded-full bg-purple-400" />
          <span className="text-[10px] text-purple-400 font-medium">Listening</span>
        </div>
      </div>

      {/* Live transcription */}
      <div className="px-3 py-2.5 border-b border-white/[0.05]">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Mic2 size={10} className="text-white/35" />
          <span className="text-[9px] text-white/35 uppercase tracking-widest">Live Transcript</span>
        </div>
        <div className="min-h-[40px] px-2.5 py-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
          <AnimatePresence mode="wait">
            <motion.p
              key={transcription}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="text-[11px] text-white/55 leading-relaxed italic"
            >
              {transcription || 'Waiting for audio…'}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      {/* Detected list */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        <div className="flex items-center gap-1.5 mb-1">
          <BookOpen size={10} className="text-white/35" />
          <span className="text-[9px] text-white/35 uppercase tracking-widest">Detected</span>
        </div>

        <AnimatePresence initial={false}>
          {detections.map((d, i) => (
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
              {/* Reference + confidence */}
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

              {/* Verse text */}
              <p className="text-[11px] text-white/55 leading-relaxed line-clamp-2 mb-2">
                {d.text}
              </p>

              {/* Actions */}
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
      pct >= 75 ? 'text-yellow-400 bg-yellow-400/10'  :
                  'text-red-400   bg-red-400/10',
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
