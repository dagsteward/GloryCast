import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Mic, MicOff, Plus, UserPlus, ChevronLeft, ChevronRight,
  Maximize2, MonitorOff, Clock, Image as ImageIcon, FileText, Share2, Check,
} from 'lucide-react'
import { useServiceStore } from '../stores/serviceStore'
import { useAppStore } from '../stores/appStore'
import { useTeamStore, TEAM_ROLES, type TeamRole } from '../stores/teamStore'
import { cn } from '../lib/utils'

// ═════════════════════════════════════════════════════════════════════════════
// Minimal AI Workspace — home.
//
// Three columns: the AI assistant on the left, one large slide in the middle,
// the service plan and team on the right. Everything a volunteer needs on a
// Sunday and nothing else — no switcher, no mixer, no NDI.
// ═════════════════════════════════════════════════════════════════════════════

export function MinimalHomePage() {
  const userDisplayName = useAppStore(s => s.userDisplayName)
  const syncSelf = useTeamStore(s => s.syncSelf)

  // Keep the roster's "you" entry aligned with the signed-in account.
  useEffect(() => { syncSelf(userDisplayName) }, [userDisplayName, syncSelf])

  return (
    <div className="w-full h-full overflow-y-auto p-4">
      <div className="grid gap-4 grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)_300px] items-start">
        <AiAssistantPanel />
        <SlideStage />
        <div className="space-y-4">
          <ServicePlanPanel />
          <TeamPanel />
        </div>
      </div>
    </div>
  )
}

// ── Card primitive ──────────────────────────────────────────────────────────

function Card({
  title, action, children, className,
}: {
  title?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn(
      'rounded-xl bg-chrome border border-white/[0.07] overflow-hidden',
      className,
    )}>
      {title && (
        <header className="flex items-center justify-between h-9 px-3.5 border-b border-white/[0.06]">
          <h3 className="text-[10px] font-bold tracking-[0.14em] text-white/45">{title}</h3>
          {action}
        </header>
      )}
      {children}
    </section>
  )
}

// ── AI assistant ────────────────────────────────────────────────────────────

function AiAssistantPanel() {
  const aiListening    = useServiceStore(s => s.aiListening)
  const setAiListening = useServiceStore(s => s.setAiListening)
  const detections     = useServiceStore(s => s.detections)
  const cutToProgram   = useServiceStore(s => s.cutToProgram)

  // Newest unacted scripture is what the assistant offers to project.
  const latest = useMemo(
    () => detections.find(d => d.kind === 'scripture'),
    [detections],
  )

  const [dismissed, setDismissed] = useState<string | null>(null)
  const showing = latest && latest.id !== dismissed ? latest : null

  return (
    <Card
      title="AI ASSISTANT"
      action={
        <button
          onClick={() => setAiListening(!aiListening)}
          title={aiListening ? 'Stop listening' : 'Start listening'}
          className="w-6 h-6 rounded-md flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.07] transition-colors"
        >
          {aiListening ? <Mic size={13} className="text-purple-500" /> : <MicOff size={13} />}
        </button>
      }
    >
      {/* Listening state */}
      <div className="px-3.5 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2 mb-2.5">
          <span className={cn(
            'w-1.5 h-1.5 rounded-full',
            aiListening ? 'bg-purple-500 animate-pulse' : 'bg-white/20',
          )} />
          <span className="text-[11px] text-white/50">
            {aiListening ? 'Listening…' : 'Not listening'}
          </span>
        </div>
        <Waveform active={aiListening} />
      </div>

      {/* Detection */}
      <AnimatePresence mode="wait">
        {showing ? (
          <motion.div
            key={showing.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-3.5"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-500">
                <Check size={11} strokeWidth={3} />
                Scripture Detected
              </span>
              <button
                onClick={() => setDismissed(showing.id)}
                className="w-5 h-5 rounded flex items-center justify-center text-white/30 hover:text-white/70"
              >
                <X size={11} />
              </button>
            </div>

            <h4 className="text-[19px] font-bold tracking-tight text-white/90">
              {showing.reference}
            </h4>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-white/50 line-clamp-4">
              {showing.text}
            </p>

            <div className="mt-3 space-y-1.5">
              <ActionButton
                primary
                onClick={() => cutToProgram({
                  kind: 'scripture',
                  title: showing.reference,
                  body: showing.text,
                  subtitle: showing.subtitle,
                  source: 'ai',
                })}
              >
                Display Verse
              </ActionButton>
              <ActionButton icon={<ImageIcon size={12} />}>Find Background</ActionButton>
              <ActionButton icon={<FileText size={12} />}>Generate Notes</ActionButton>
              <ActionButton icon={<Share2 size={12} />}>Create Social Post</ActionButton>
            </div>
          </motion.div>
        ) : (
          <div className="p-6 text-center">
            <p className="text-[11.5px] text-white/35 leading-relaxed">
              {aiListening
                ? 'Waiting for a scripture reference…'
                : 'Turn on listening and the assistant will detect scripture as it is spoken.'}
            </p>
          </div>
        )}
      </AnimatePresence>
    </Card>
  )
}

function ActionButton({
  children, primary, icon, onClick,
}: {
  children: React.ReactNode
  primary?: boolean
  icon?: React.ReactNode
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full h-8 rounded-lg text-[11.5px] font-semibold transition-colors',
        'flex items-center justify-center gap-1.5',
        primary
          ? 'bg-purple-600 text-white hover:bg-purple-500'
          : 'border border-purple-500/30 text-purple-500 hover:bg-purple-500/10',
      )}
    >
      {icon}
      {children}
    </button>
  )
}

/**
 * Listening indicator. Bars are driven by a fixed pattern rather than real
 * audio levels — the ASR pipeline does not expose amplitude yet, so this
 * animates only to show the engine is armed, and freezes flat when it is not.
 */
function Waveform({ active }: { active: boolean }) {
  const bars = 40
  return (
    <div className="flex items-center gap-[2px] h-7">
      {Array.from({ length: bars }).map((_, i) => (
        <motion.span
          key={i}
          className={cn('flex-1 rounded-full', active ? 'bg-purple-500/70' : 'bg-white/12')}
          animate={active
            ? { scaleY: [0.25, 0.5 + Math.abs(Math.sin(i * 1.7)) * 0.5, 0.25] }
            : { scaleY: 0.12 }}
          transition={active
            ? { duration: 1.1, repeat: Infinity, delay: i * 0.035, ease: 'easeInOut' }
            : { duration: 0.2 }}
          style={{ height: '100%', originY: 0.5 }}
        />
      ))}
    </div>
  )
}

// ── Slide stage ─────────────────────────────────────────────────────────────

function SlideStage() {
  const program = useServiceStore(s => s.program)
  const clearProgram = useServiceStore(s => s.clearProgram)
  const history = useServiceStore(s => s.history)

  // Position in the session's slide history, for the counter beneath the stage.
  const total = history.length + (program ? 1 : 0)
  const index = program ? 1 : 0

  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-video bg-gradient-to-br from-[#1a1030] via-[#2d1b4e] to-[#12101f] flex items-center justify-center p-10">
        <AnimatePresence mode="wait">
          {program ? (
            <motion.div
              key={program.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center max-w-2xl"
            >
              <h2 className="text-[clamp(22px,3.2vw,40px)] font-bold text-white leading-tight drop-shadow-lg">
                {program.title}
              </h2>
              {program.body && (
                <p className="mt-4 text-[clamp(12px,1.4vw,18px)] leading-relaxed text-white/85 drop-shadow">
                  {program.body}
                </p>
              )}
              {program.subtitle && (
                <span className="inline-block mt-4 px-2 py-0.5 rounded text-[10px] font-bold tracking-widest text-white/70 bg-white/12">
                  {program.subtitle}
                </span>
              )}
            </motion.div>
          ) : (
            <motion.p
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[13px] text-white/35"
            >
              Nothing on screen
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Transport */}
      <div className="flex items-center justify-between h-11 px-3 border-t border-white/[0.06]">
        <div className="flex items-center gap-1">
          <TransportButton icon={<Maximize2 size={13} />} label="Full screen" />
          <TransportButton
            icon={<MonitorOff size={13} />}
            label="Clear screen"
            onClick={clearProgram}
            disabled={!program}
          />
          <TransportButton icon={<Clock size={13} />} label="Countdown" />
        </div>

        <div className="flex items-center gap-2.5">
          <TransportButton icon={<ChevronLeft size={14} />} label="Previous" />
          <div className="w-24 h-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-purple-500 transition-all"
              style={{ width: total ? `${(index / total) * 100}%` : '0%' }}
            />
          </div>
          <span className="text-[11px] tabular-nums text-white/45 w-10 text-center">
            {index} / {total}
          </span>
          <TransportButton icon={<ChevronRight size={14} />} label="Next" />
        </div>
      </div>
    </Card>
  )
}

function TransportButton({
  icon, label, onClick, disabled,
}: {
  icon: React.ReactNode
  label: string
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
        disabled
          ? 'text-white/15 cursor-not-allowed'
          : 'text-white/45 hover:text-white hover:bg-white/[0.07]',
      )}
    >
      {icon}
    </button>
  )
}

// ── Service plan ────────────────────────────────────────────────────────────

function ServicePlanPanel() {
  const segments        = useServiceStore(s => s.segments)
  const activeSegmentId = useServiceStore(s => s.activeSegmentId)
  const setActiveSegment= useServiceStore(s => s.setActiveSegment)

  return (
    <Card title="SERVICE PLAN">
      <div className="p-2 space-y-1">
        {segments.map((segment) => {
          const active = segment.id === activeSegmentId
          return (
            <button
              key={segment.id}
              onClick={() => setActiveSegment(active ? null : segment.id)}
              className={cn(
                'w-full flex items-center gap-2 h-9 px-2.5 rounded-lg text-left transition-colors',
                active
                  ? 'bg-purple-600 text-white'
                  : 'hover:bg-white/[0.05] text-white/70',
              )}
            >
              <span className={cn(
                'flex-1 truncate text-[12px] font-medium',
                segment.done && !active && 'line-through opacity-45',
              )}>
                {segment.label}
              </span>
              {segment.time && (
                <span className={cn(
                  'text-[10.5px] tabular-nums shrink-0',
                  active ? 'text-white/75' : 'text-white/35',
                )}>
                  {segment.time}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="px-2 pb-2">
        <button className="w-full h-8 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[11.5px] font-semibold flex items-center justify-center gap-1.5 transition-colors">
          <Plus size={13} />
          Add Item
        </button>
      </div>
    </Card>
  )
}

// ── Team ────────────────────────────────────────────────────────────────────

function TeamPanel() {
  const members     = useTeamStore(s => s.members)
  const addMember   = useTeamStore(s => s.addMember)
  const [inviting, setInviting] = useState(false)
  const [name, setName] = useState('')
  const [role, setRole] = useState<TeamRole>('Volunteer')

  const submit = () => {
    if (!name.trim()) return
    addMember(name, role)
    setName('')
    setRole('Volunteer')
    setInviting(false)
  }

  return (
    <Card
      title="TEAM"
      action={
        <button
          onClick={() => setInviting(v => !v)}
          title="Invite"
          className="w-6 h-6 rounded-md flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.07] transition-colors"
        >
          <Plus size={13} />
        </button>
      }
    >
      <div className="p-2 space-y-0.5">
        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-2.5 h-10 px-2 rounded-lg hover:bg-white/[0.04]">
            <div className="relative shrink-0">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#a855f7] to-[#f97316] flex items-center justify-center text-[10px] font-bold text-white">
                {m.name.charAt(0).toUpperCase()}
              </div>
              {m.online && (
                <span className="absolute -bottom-px -right-px w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[var(--gc-chrome)]" />
              )}
            </div>
            <div className="min-w-0 leading-tight">
              <div className="text-[12px] font-medium text-white/85 truncate">
                {m.name}{m.isSelf && <span className="text-white/40 font-normal"> (You)</span>}
              </div>
              <div className="text-[10.5px] text-white/40 truncate">{m.role}</div>
            </div>
          </div>
        ))}

        {members.length === 0 && (
          <p className="px-2 py-4 text-[11.5px] text-white/35 text-center leading-relaxed">
            No one else on the team yet.
          </p>
        )}
      </div>

      <AnimatePresence>
        {inviting && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/[0.06]"
          >
            <div className="p-2.5 space-y-2">
              <input
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submit()}
                placeholder="Name"
                className="w-full h-8 px-2.5 rounded-lg bg-white/[0.05] border border-white/[0.09] text-[12px] text-white/85 outline-none focus:border-purple-500/50"
              />
              <select
                value={role}
                onChange={e => setRole(e.target.value as TeamRole)}
                className="w-full h-8 px-2 rounded-lg bg-white/[0.05] border border-white/[0.09] text-[12px] text-white/85 outline-none focus:border-purple-500/50"
              >
                {TEAM_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <button
                onClick={submit}
                className="w-full h-8 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[11.5px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <UserPlus size={13} />
                Add to team
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}
