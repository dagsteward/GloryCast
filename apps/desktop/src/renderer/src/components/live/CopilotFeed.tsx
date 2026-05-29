import { motion, AnimatePresence } from 'framer-motion'
import { Zap, BookOpen, Music, Mic2, MonitorPlay, Send, Sparkles, Power } from 'lucide-react'
import { useServiceStore } from '../../stores/serviceStore'
import { cn } from '../../lib/utils'

// Shared AI Copilot feed — the live scripture + song detection list with the
// auto-pilot toggle. Reads/writes the one serviceStore, so the same feed shows
// on the Dashboard and inside Production.

interface Props {
  compact?: boolean
}

export function CopilotFeed({ compact = false }: Props) {
  const aiListening  = useServiceStore(s => s.aiListening)
  const autoPilot    = useServiceStore(s => s.autoPilot)
  const transcript   = useServiceStore(s => s.transcript)
  const detections   = useServiceStore(s => s.detections)
  const toggleAutoPilot = useServiceStore(s => s.toggleAutoPilot)
  const setAiListening  = useServiceStore(s => s.setAiListening)
  const sendToPreview   = useServiceStore(s => s.sendToPreview)

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-purple-600/25 border border-purple-500/30 flex items-center justify-center">
            <Sparkles size={12} className="text-purple-400" />
          </div>
          <span className="text-xs font-semibold text-white/80">AI Copilot</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={cn('w-1.5 h-1.5 rounded-full', aiListening ? 'live-dot bg-purple-400' : 'bg-white/20')} />
          <span className={cn('text-[10px] font-medium', aiListening ? 'text-purple-400' : 'text-white/30')}>
            {aiListening ? 'Listening' : 'Idle'}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.05]">
        <button
          onClick={toggleAutoPilot}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors',
            autoPilot
              ? 'bg-purple-600/30 text-purple-300 border border-purple-500/30'
              : 'bg-white/[0.04] text-white/40 border border-white/[0.08]',
          )}
        >
          <Zap size={11} />
          Auto-Pilot {autoPilot ? 'On' : 'Off'}
        </button>
        <button
          onClick={() => setAiListening(!aiListening)}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors',
            aiListening
              ? 'bg-white/[0.06] text-white/60 border border-white/[0.1]'
              : 'bg-emerald-600/25 text-emerald-300 border border-emerald-500/30',
          )}
        >
          <Power size={11} />
          {aiListening ? 'Pause' : 'Listen'}
        </button>
      </div>

      {/* Live transcript */}
      {!compact && (
        <div className="px-3 py-2.5 border-b border-white/[0.05]">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Mic2 size={10} className="text-white/35" />
            <span className="text-[9px] text-white/35 uppercase tracking-widest">Live Transcript</span>
          </div>
          <div className="min-h-[38px] px-2.5 py-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
            <p className="text-[11px] text-white/55 leading-relaxed italic">
              {transcript ? `…${transcript.slice(-180)}` : 'Waiting for audio — start the service to listen…'}
            </p>
          </div>
        </div>
      )}

      {/* Detections */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        <div className="flex items-center gap-1.5 mb-1">
          <Zap size={10} className="text-white/35" />
          <span className="text-[9px] text-white/35 uppercase tracking-widest">Detected</span>
          {autoPilot && (
            <span className="text-[8px] text-purple-400/70 ml-auto">auto → preview</span>
          )}
        </div>

        {detections.length === 0 ? (
          <div className="text-center py-8 text-white/20">
            <Sparkles size={26} className="mx-auto mb-2 opacity-30" />
            <p className="text-xs">Nothing detected yet</p>
            <p className="text-[10px] text-white/15 mt-0.5">Scripture & songs appear here live</p>
          </div>
        ) : (
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
                  d.kind === 'song'
                    ? 'bg-blue-600/10 border-blue-500/25'
                    : 'bg-purple-600/10 border-purple-500/25',
                  d.acted && 'opacity-60',
                )}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {d.kind === 'song'
                      ? <Music size={11} className="text-blue-400 shrink-0" />
                      : <BookOpen size={11} className="text-purple-400 shrink-0" />}
                    <span className={cn('text-xs font-bold truncate', d.kind === 'song' ? 'text-blue-300' : 'text-purple-300')}>
                      {d.reference}
                    </span>
                    {d.subtitle && <span className="text-[9px] text-white/30 shrink-0">{d.subtitle}</span>}
                  </div>
                  <ConfBadge confidence={d.confidence} />
                </div>

                <p className="text-[11px] text-white/55 leading-relaxed line-clamp-2 mb-2">{d.text}</p>

                {d.acted ? (
                  <div className="flex items-center gap-1 text-[10px] text-emerald-400">
                    <MonitorPlay size={10} /> Sent to Preview
                  </div>
                ) : (
                  <button
                    onClick={() => sendToPreview({
                      kind: d.kind, title: d.reference, body: d.text, subtitle: d.subtitle, source: 'ai',
                    })}
                    className={cn(
                      'w-full flex items-center justify-center gap-1.5 py-1 rounded-lg text-[10px] font-semibold transition-colors',
                      d.kind === 'song'
                        ? 'bg-blue-600/30 hover:bg-blue-600/50 text-blue-300'
                        : 'bg-purple-600/30 hover:bg-purple-600/50 text-purple-300',
                    )}
                  >
                    <Send size={10} /> Send to Preview
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}

function ConfBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100)
  return (
    <span className={cn(
      'text-[9px] font-mono px-1 py-0.5 rounded shrink-0',
      pct >= 90 ? 'text-emerald-400 bg-emerald-400/10'
        : pct >= 75 ? 'text-yellow-400 bg-yellow-400/10'
        : 'text-red-400 bg-red-400/10',
    )}>
      {pct}%
    </span>
  )
}
