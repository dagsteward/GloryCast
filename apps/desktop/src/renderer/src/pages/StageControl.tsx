import { useEffect, useState } from 'react'
import {
  MonitorSmartphone, Play, Square, Eraser, Timer as TimerIcon,
  MessageSquare, StickyNote, ExternalLink,
} from 'lucide-react'
import { useServiceStore } from '../stores/serviceStore'
import { cn } from '../lib/utils'

// ─────────────────────────────────────────────────────────────────────────────
// Stage Display control — what the platform sees.
//
// The projection window (pages/StageDisplay.tsx) and its IPC relay already
// exist; this is the operator's control surface over them. The window is a
// separate renderer process with no shared state, so everything reaches it
// through window.glorycast.stage.send().
//
// Kept deliberately plain: this is used mid-service, often by a volunteer,
// frequently in a dark room. Large targets, obvious state, no hidden modes.
// ─────────────────────────────────────────────────────────────────────────────

type StageTab = 'notes' | 'announcement' | 'timer'

export function StageControlPage() {
  // The verse the producer last pushed to In-House, so this page reflects what
  // is actually on the platform screen rather than its own idea of it.
  const detections = useServiceStore(s => s.detections)
  const latest = detections.find(d => d.kind === 'scripture')

  const [tab, setTab] = useState<StageTab>('notes')
  const [notes, setNotes] = useState('')
  const [announcement, setAnnouncement] = useState('')
  const [windowOpen, setWindowOpen] = useState(false)

  // Countdown shown on the platform screen — for "5 minutes to service" and
  // for keeping a speaker to time.
  const [minutes, setMinutes] = useState(5)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (!running || remaining === null) return
    const t = setInterval(() => {
      setRemaining(r => (r === null ? null : Math.max(0, r - 1)))
    }, 1000)
    return () => clearInterval(t)
  }, [running, remaining])

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  /** Push the current stage state. Called on every change the platform sees. */
  const push = (patch: { notes?: string | null; body?: string | null; reference?: string | null }) => {
    window.glorycast?.stage.send({
      body: patch.body ?? null,
      reference: patch.reference ?? null,
      translation: null,
      nextUp: null,
      notes: patch.notes ?? null,
    })
  }

  const openWindow = () => {
    window.glorycast?.window.openStageDisplay()
    setWindowOpen(true)
  }

  const closeWindow = () => {
    window.glorycast?.window.closeStageDisplay()
    setWindowOpen(false)
  }

  const clearStage = () => {
    push({})
    setNotes('')
    setAnnouncement('')
  }

  const sendNotes = () => push({ notes: notes.trim() || null })

  const sendAnnouncement = () =>
    push({ body: announcement.trim() || null, reference: 'Announcement' })

  const sendVerse = () =>
    latest && push({ body: latest.text, reference: latest.reference })

  return (
    <div className="w-full h-full overflow-y-auto p-6 text-white/90">
      <div className="max-w-5xl mx-auto space-y-5">

        {/* Header + window control */}
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-xl font-bold text-white/90">Stage Display</h1>
            <p className="text-[13px] text-white/45 mt-1 leading-relaxed max-w-xl">
              What the platform sees — the current verse, your notes, announcements and a
              timer. Opens on a second monitor and is independent of the stream, so it
              works whether or not you are broadcasting.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={openWindow}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-[13px] font-semibold text-white transition-colors"
            >
              <ExternalLink size={14} /> Open Display
            </button>
            <button
              onClick={closeWindow}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-[13px] text-white/70 transition-colors"
            >
              <Square size={13} /> Close
            </button>
          </div>
        </div>

        {/* What is on stage now */}
        <section className="rounded-xl bg-chrome border border-white/[0.06] p-5">
          <div className="flex items-center gap-2 mb-3">
            <MonitorSmartphone size={14} className="text-cyan-400" />
            <h2 className="text-[13px] font-semibold text-white/80 uppercase tracking-wide">On Stage Now</h2>
            {windowOpen && (
              <span className="ml-auto flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Display open
              </span>
            )}
          </div>

          {latest ? (
            <div className="rounded-lg bg-well border border-white/[0.06] p-4">
              <div className="text-[11px] font-bold text-purple-300 uppercase tracking-wider mb-1.5">
                {latest.reference}
              </div>
              <p className="text-[13px] text-white/70 leading-relaxed line-clamp-3">{latest.text}</p>
              <button
                onClick={sendVerse}
                className="mt-3 px-3 py-1.5 rounded-lg bg-cyan-600/80 hover:bg-cyan-600 text-[12px] font-semibold text-white transition-colors"
              >
                Send to Stage
              </button>
            </div>
          ) : (
            <p className="text-[12.5px] text-white/35 py-6 text-center">
              No verse detected yet. Detected scripture appears here, ready to push to the platform.
            </p>
          )}
        </section>

        {/* Notes / announcement / timer */}
        <section className="rounded-xl bg-chrome border border-white/[0.06] overflow-hidden">
          <div className="flex items-center gap-1 px-3 h-11 border-b border-white/[0.06]">
            {([
              ['notes', 'Notes', StickyNote],
              ['announcement', 'Announcement', MessageSquare],
              ['timer', 'Timer', TimerIcon],
            ] as const).map(([id, label, Icon]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors',
                  tab === id ? 'bg-purple-600/20 text-purple-300' : 'text-white/50 hover:text-white/80',
                )}
              >
                <Icon size={12} /> {label}
              </button>
            ))}

            <button
              onClick={clearStage}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] text-white/45 hover:text-red-300 hover:bg-red-500/10 transition-colors"
            >
              <Eraser size={12} /> Clear stage
            </button>
          </div>

          <div className="p-5">
            {tab === 'notes' && (
              <>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Notes only the speaker sees — running order, reminders, a cue to wrap up…"
                  className="w-full h-32 rounded-lg bg-well border border-white/[0.06] p-3 text-[13px] text-white/80 placeholder:text-white/25 outline-none resize-none focus:border-purple-500/40"
                />
                <button
                  onClick={sendNotes}
                  className="mt-3 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-[12.5px] font-semibold text-white transition-colors"
                >Show on Stage</button>
              </>
            )}

            {tab === 'announcement' && (
              <>
                <textarea
                  value={announcement}
                  onChange={e => setAnnouncement(e.target.value)}
                  placeholder="A message to display large on the platform screen…"
                  className="w-full h-32 rounded-lg bg-well border border-white/[0.06] p-3 text-[13px] text-white/80 placeholder:text-white/25 outline-none resize-none focus:border-purple-500/40"
                />
                <button
                  onClick={sendAnnouncement}
                  className="mt-3 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-[12.5px] font-semibold text-white transition-colors"
                >Show on Stage</button>
              </>
            )}

            {tab === 'timer' && (
              <div className="flex items-center gap-6">
                <div className="text-5xl font-mono font-bold tabular-nums text-white/90">
                  {fmt(remaining ?? minutes * 60)}
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-1.5">
                    {[5, 10, 15, 20, 30, 45].map(m => (
                      <button
                        key={m}
                        onClick={() => { setMinutes(m); setRemaining(m * 60); setRunning(false) }}
                        className={cn(
                          'px-3 py-1.5 rounded-md text-[12px] font-semibold transition-colors',
                          minutes === m ? 'bg-purple-600 text-white' : 'bg-white/[0.06] text-white/60 hover:bg-white/[0.12]',
                        )}
                      >{m}m</button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setRemaining(r => r ?? minutes * 60); setRunning(r => !r) }}
                      className={cn(
                        'flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12.5px] font-semibold text-white transition-colors',
                        running ? 'bg-amber-600 hover:bg-amber-500' : 'bg-emerald-600 hover:bg-emerald-500',
                      )}
                    >
                      {running ? <Square size={13} /> : <Play size={13} />}
                      {running ? 'Pause' : 'Start'}
                    </button>
                    <button
                      onClick={() => { setRemaining(minutes * 60); setRunning(false) }}
                      className="px-4 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-[12.5px] text-white/70 transition-colors"
                    >Reset</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
