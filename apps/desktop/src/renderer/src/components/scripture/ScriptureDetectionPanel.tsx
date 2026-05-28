import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic2, BookOpen, Zap, CheckCircle2, Clock, ChevronRight } from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import { cn } from '../../lib/utils'

interface DetectedScripture {
  id: string
  reference: string
  text: string
  translation: string
  confidence: number
  detectedAt: Date
  displayedAt?: Date
}

export function ScriptureDetectionPanel() {
  const { currentDetectedScripture, setCurrentDetectedScripture } = useAppStore()
  const [recentDetections, setRecentDetections] = useState<DetectedScripture[]>(DEMO_DETECTIONS)
  const [isActive, setIsActive] = useState(true)
  const [transcription, setTranscription] = useState<string>('')

  // Simulate live transcription
  useEffect(() => {
    const phrases = [
      'Turn with me to the book of Romans...',
      'Romans chapter eight, verse twenty-eight...',
      'And we know that in all things God works...',
    ]
    let index = 0

    const interval = setInterval(() => {
      setTranscription(phrases[index % phrases.length])
      index++

      // Simulate scripture detection
      if (index === 2) {
        const detected: DetectedScripture = {
          id: `det-${Date.now()}`,
          reference: 'Romans 8:28',
          text: 'And we know that in all things God works for the good of those who love him...',
          translation: 'NIV',
          confidence: 0.97,
          detectedAt: new Date(),
        }
        setRecentDetections(prev => [detected, ...prev.slice(0, 9)])
        setCurrentDetectedScripture(detected.reference)
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [setCurrentDetectedScripture])

  const handleDisplay = (detection: DetectedScripture) => {
    setRecentDetections(prev =>
      prev.map(d => d.id === detection.id ? { ...d, displayedAt: new Date() } : d),
    )
  }

  return (
    <div className="h-full flex flex-col card-premium overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/[0.06]">
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
      <div className="p-3 border-b border-white/[0.05]">
        <div className="flex items-center gap-1.5 mb-2">
          <Mic2 size={11} className="text-white/40" />
          <span className="text-[10px] text-white/40 uppercase tracking-widest">Live Transcript</span>
        </div>
        <div className="min-h-[48px] p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
          <AnimatePresence mode="wait">
            <motion.p
              key={transcription}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-xs text-white/60 leading-relaxed italic"
            >
              {transcription || 'Waiting for audio...'}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      {/* Detected scriptures */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <div className="flex items-center gap-1.5 mb-1">
          <BookOpen size={11} className="text-white/40" />
          <span className="text-[10px] text-white/40 uppercase tracking-widest">Detected</span>
        </div>

        <AnimatePresence>
          {recentDetections.map((detection, i) => (
            <motion.div
              key={detection.id}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                'rounded-lg border p-2.5 cursor-pointer transition-all',
                detection.displayedAt
                  ? 'bg-white/[0.02] border-white/[0.06] opacity-60'
                  : 'bg-purple-600/10 border-purple-500/25 hover:bg-purple-600/15',
              )}
              onClick={() => handleDisplay(detection)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs font-semibold text-purple-300">
                      {detection.reference}
                    </span>
                    <span className="text-[9px] text-white/30">{detection.translation}</span>
                    <ConfidenceBadge confidence={detection.confidence} />
                  </div>
                  <p className="text-[11px] text-white/55 leading-relaxed line-clamp-2">
                    {detection.text}
                  </p>
                </div>

                <div className="shrink-0 flex flex-col items-end gap-1.5">
                  {detection.displayedAt ? (
                    <CheckCircle2 size={14} className="text-emerald-400" />
                  ) : (
                    <button className="flex items-center gap-0.5 px-2 py-0.5 rounded bg-purple-600 hover:bg-purple-500 text-[9px] text-white font-medium transition-colors">
                      Display
                      <ChevronRight size={9} />
                    </button>
                  )}
                  <span className="text-[9px] text-white/25 font-mono flex items-center gap-0.5">
                    <Clock size={8} />
                    {formatTime(detection.detectedAt)}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100)
  const color = pct >= 90 ? 'text-emerald-400' : pct >= 75 ? 'text-yellow-400' : 'text-red-400'
  return (
    <span className={cn('text-[9px] font-mono', color)}>{pct}%</span>
  )
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

const DEMO_DETECTIONS: DetectedScripture[] = [
  {
    id: 'demo-1',
    reference: 'Psalm 23:1',
    text: 'The Lord is my shepherd, I lack nothing.',
    translation: 'NIV',
    confidence: 0.99,
    detectedAt: new Date(Date.now() - 300000),
    displayedAt: new Date(Date.now() - 299000),
  },
  {
    id: 'demo-2',
    reference: 'Philippians 4:13',
    text: 'I can do all this through him who gives me strength.',
    translation: 'NIV',
    confidence: 0.95,
    detectedAt: new Date(Date.now() - 120000),
    displayedAt: new Date(Date.now() - 119000),
  },
]
