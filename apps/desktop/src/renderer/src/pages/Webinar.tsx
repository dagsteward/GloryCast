import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Video, VideoOff, Mic2, MicOff, MonitorUp, Users, MessageSquare,
  PieChart, Globe, Settings, PhoneOff, Circle, Send, CheckCircle2,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '../lib/utils'

interface Participant {
  id: string
  name: string
  role: 'host' | 'speaker' | 'attendee'
  videoOn: boolean
  audioOn: boolean
  handRaised: boolean
}

const DEMO_PARTICIPANTS: Participant[] = [
  { id: '1', name: 'Pastor James',  role: 'host',     videoOn: true,  audioOn: true,  handRaised: false },
  { id: '2', name: 'Worship Leader',role: 'speaker',  videoOn: true,  audioOn: false, handRaised: false },
  { id: '3', name: 'Online Guest 1',role: 'attendee', videoOn: false, audioOn: false, handRaised: true  },
  { id: '4', name: 'Online Guest 2',role: 'attendee', videoOn: true,  audioOn: false, handRaised: false },
  { id: '5', name: 'Online Guest 3',role: 'attendee', videoOn: false, audioOn: false, handRaised: false },
]

export function WebinarPage() {
  const navigate = useNavigate()
  const [participants, setParticipants] = useState<Participant[]>(DEMO_PARTICIPANTS)
  const [videoOn,    setVideoOn]    = useState(true)
  const [audioOn,    setAudioOn]    = useState(true)
  const [sharing,    setSharing]    = useState(false)
  const [isRecording,setIsRecording]= useState(false)
  const [ended,      setEnded]      = useState(false)
  const [activeTab,  setActiveTab]  = useState<'chat' | 'qa' | 'polling' | 'participants'>('participants')

  const screenStreamRef = useRef<MediaStream | null>(null)

  const lowerHand = (id: string) =>
    setParticipants(prev => prev.map(p => p.id === id ? { ...p, handRaised: false } : p))

  const toggleShare = async () => {
    if (sharing) {
      screenStreamRef.current?.getTracks().forEach(t => t.stop())
      screenStreamRef.current = null
      setSharing(false)
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
        screenStreamRef.current = stream
        stream.getVideoTracks()[0]?.addEventListener('ended', () => setSharing(false))
        setSharing(true)
      } catch {
        // user cancelled or permission denied — do nothing
      }
    }
  }

  const endEvent = () => {
    screenStreamRef.current?.getTracks().forEach(t => t.stop())
    screenStreamRef.current = null
    setEnded(true)
  }

  if (ended) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
          <CheckCircle2 size={28} className="text-emerald-400" />
        </div>
        <h2 className="text-xl font-bold text-white/90">Event Ended</h2>
        <p className="text-sm text-white/40 max-w-xs">
          The hybrid event has been closed. All participants have been disconnected.
        </p>
        <div className="flex gap-3 mt-2">
          <button
            onClick={() => { setEnded(false); setParticipants(DEMO_PARTICIPANTS) }}
            className="px-4 py-2 rounded-lg bg-white/[0.06] border border-white/10 text-sm text-white/60 hover:text-white/80 transition-colors"
          >
            New Event
          </button>
          <button
            onClick={() => navigate('/analytics')}
            className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-500 transition-colors"
          >
            View Analytics
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] bg-[#0a0a12] shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-white/80">Hybrid Event</h2>
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-[10px] text-emerald-400 font-medium">
              {participants.length} Connected
            </span>
          </div>
          {isRecording && (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/25">
              <span className="live-dot w-1.5 h-1.5 rounded-full bg-red-400" />
              <span className="text-[10px] text-red-400 font-medium">Recording</span>
            </div>
          )}
          {sharing && (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/25">
              <MonitorUp size={10} className="text-blue-400" />
              <span className="text-[10px] text-blue-400 font-medium">Sharing screen</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <PlatformBadge name="Zoom"        color="blue"    />
          <PlatformBadge name="Teams"       color="purple"  />
          <PlatformBadge name="Google Meet" color="emerald" />
          <PlatformBadge name="LiveKit"     color="orange"  />
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main video grid */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 p-3 grid grid-cols-3 grid-rows-2 gap-2 overflow-hidden">
            {participants.slice(0, 6).map(participant => (
              <ParticipantTile
                key={participant.id}
                participant={participant}
                onLowerHand={() => lowerHand(participant.id)}
              />
            ))}
          </div>

          {/* Controls bar */}
          <div className="shrink-0 flex items-center justify-center gap-3 py-3 px-6 border-t border-white/[0.05] bg-[#08080f]">
            <ControlButton
              icon={audioOn ? Mic2 : MicOff}
              label={audioOn ? 'Mute' : 'Unmute'}
              onClick={() => setAudioOn(v => !v)}
              danger={!audioOn}
            />
            <ControlButton
              icon={videoOn ? Video : VideoOff}
              label={videoOn ? 'Stop Video' : 'Start Video'}
              onClick={() => setVideoOn(v => !v)}
              danger={!videoOn}
            />
            <ControlButton
              icon={MonitorUp}
              label={sharing ? 'Stop Share' : 'Share Screen'}
              onClick={toggleShare}
              accent={sharing}
            />
            <ControlButton
              icon={Circle}
              label={isRecording ? 'Stop Rec' : 'Record'}
              onClick={() => setIsRecording(v => !v)}
              danger={isRecording}
            />
            <ControlButton
              icon={Globe}
              label="Translate"
              onClick={() => setActiveTab('chat')}
              title="Live translation — select in chat panel"
            />
            <ControlButton
              icon={Settings}
              label="Settings"
              onClick={() => navigate('/settings')}
            />

            <div className="w-px h-8 bg-white/10 mx-1" />

            <button
              onClick={endEvent}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition-colors"
            >
              <PhoneOff size={13} />
              End Event
            </button>
          </div>
        </div>

        {/* Right panel */}
        <div className="w-72 shrink-0 border-l border-white/[0.05] flex flex-col">
          <div className="flex border-b border-white/[0.05] shrink-0">
            {(['participants', 'chat', 'qa', 'polling'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'flex-1 py-2 text-[11px] font-medium capitalize transition-colors',
                  activeTab === tab
                    ? 'text-purple-400 border-b-2 border-purple-500'
                    : 'text-white/35 hover:text-white/60',
                )}
              >
                {tab === 'qa' ? 'Q&A' : tab}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3 flex flex-col">
            {activeTab === 'participants' && (
              <ParticipantList participants={participants} onLowerHand={lowerHand} />
            )}
            {activeTab === 'chat'     && <ChatPanel />}
            {activeTab === 'qa'       && <QAPanel />}
            {activeTab === 'polling'  && <PollingPanel />}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── ParticipantTile ──────────────────────────────────────────────────────────

function ParticipantTile({ participant, onLowerHand }: {
  participant: Participant; onLowerHand: () => void
}) {
  const roleColor =
    participant.role === 'host'    ? 'border-purple-500/60' :
    participant.role === 'speaker' ? 'border-blue-500/50'   : 'border-white/10'

  return (
    <div className={cn('relative rounded-xl overflow-hidden border-2 bg-gray-900', roleColor)}>
      <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-950 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-purple-600/30 border border-purple-500/40 flex items-center justify-center">
          <span className="text-white/80 text-lg font-semibold">{participant.name[0]}</span>
        </div>
      </div>

      {participant.handRaised && (
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-2 right-2">
          <button
            onClick={onLowerHand}
            className="w-7 h-7 rounded-full bg-yellow-500 flex items-center justify-center text-sm shadow-lg"
            title="Lower hand"
          >
            ✋
          </button>
        </motion.div>
      )}

      <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between">
        <span className="text-xs text-white/90 font-medium">{participant.name}</span>
        <div className="flex items-center gap-1">
          {!participant.audioOn && <MicOff  size={10} className="text-red-400" />}
          {!participant.videoOn && <VideoOff size={10} className="text-red-400" />}
        </div>
      </div>

      {participant.role !== 'attendee' && (
        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/60 text-[9px] font-medium uppercase text-white/60">
          {participant.role}
        </div>
      )}
    </div>
  )
}

// ─── ControlButton ────────────────────────────────────────────────────────────

function ControlButton({ icon: Icon, label, onClick, danger, accent, title }: {
  icon: React.ElementType; label: string; onClick: () => void
  danger?: boolean; accent?: boolean; title?: string
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        'flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all text-xs',
        danger  ? 'bg-red-600/20   text-red-400  hover:bg-red-600/30' :
        accent  ? 'bg-blue-600/25  text-blue-400 border border-blue-500/30' :
                  'text-white/50 hover:text-white hover:bg-white/[0.07]',
      )}
    >
      <Icon size={16} />
      <span className="text-[10px]">{label}</span>
    </button>
  )
}

// ─── PlatformBadge ────────────────────────────────────────────────────────────

function PlatformBadge({ name, color }: { name: string; color: string }) {
  const colors: Record<string, string> = {
    blue:    'bg-blue-600/15    border-blue-500/25    text-blue-400',
    purple:  'bg-purple-600/15  border-purple-500/25  text-purple-400',
    emerald: 'bg-emerald-600/15 border-emerald-500/25 text-emerald-400',
    orange:  'bg-orange-600/15  border-orange-500/25  text-orange-400',
  }
  return (
    <span className={cn('px-2 py-0.5 rounded-full border text-[10px] font-medium', colors[color])}>
      {name}
    </span>
  )
}

// ─── ParticipantList ──────────────────────────────────────────────────────────

function ParticipantList({ participants, onLowerHand }: {
  participants: Participant[]; onLowerHand: (id: string) => void
}) {
  return (
    <div className="space-y-1">
      {participants.map(p => (
        <div key={p.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/[0.03] transition-colors">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-purple-600/25 flex items-center justify-center text-xs font-semibold text-purple-300">
              {p.name[0]}
            </div>
            <div>
              <div className="text-xs text-white/70">{p.name}</div>
              <div className="text-[9px] text-white/30 capitalize">{p.role}</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {p.handRaised && (
              <button onClick={() => onLowerHand(p.id)} className="text-yellow-400 text-xs">✋</button>
            )}
            {!p.audioOn && <MicOff  size={10} className="text-red-400" />}
            {!p.videoOn && <VideoOff size={10} className="text-red-400" />}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── ChatPanel ────────────────────────────────────────────────────────────────

interface ChatMessage { id: number; name: string; text: string; time: string }

function ChatPanel() {
  const [input, setInput]     = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 1, name: 'Online Guest 1', text: 'Amen! So powerful!',                            time: '10:32' },
    { id: 2, name: 'Online Guest 2', text: 'This is exactly what I needed to hear today 🙏', time: '10:33' },
    { id: 3, name: 'Online Guest 3', text: 'Can someone share the scripture reference?',     time: '10:34' },
  ])

  const send = () => {
    const text = input.trim()
    if (!text) return
    const now = new Date()
    const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
    setMessages(prev => [...prev, { id: Date.now(), name: 'You (Host)', text, time }])
    setInput('')
  }

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex-1 space-y-2 overflow-y-auto">
        {messages.map(msg => (
          <div key={msg.id} className="text-xs">
            <span className={cn('font-medium', msg.name === 'You (Host)' ? 'text-orange-400' : 'text-purple-400')}>
              {msg.name}
            </span>
            <span className="text-white/30 ml-1 text-[9px]">{msg.time}</span>
            <p className="text-white/60 mt-0.5">{msg.text}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2 shrink-0">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Message everyone..."
          className="flex-1 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white/70 placeholder:text-white/25 outline-none focus:border-purple-500/40 transition-colors"
        />
        <button
          onClick={send}
          disabled={!input.trim()}
          className="p-1.5 rounded-lg bg-purple-600/25 text-purple-300 hover:bg-purple-600/40 disabled:opacity-30 transition-colors"
        >
          <Send size={13} />
        </button>
      </div>
    </div>
  )
}

// ─── QAPanel ─────────────────────────────────────────────────────────────────

interface QAQuestion { id: number; name: string; question: string; votes: number; answered: boolean }

function QAPanel() {
  const [questions, setQuestions] = useState<QAQuestion[]>([
    { id: 1, name: 'Anonymous',     question: 'How do I apply Romans 8:28 when everything seems lost?', votes: 12, answered: false },
    { id: 2, name: 'Online Guest 1',question: 'Is there a study guide for this message?',                votes: 8,  answered: true  },
  ])

  const markAnswered = (id: number) =>
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, answered: true } : q))

  const upvote = (id: number) =>
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, votes: q.votes + 1 } : q))

  return (
    <div className="space-y-2">
      {questions.map(q => (
        <div
          key={q.id}
          className={cn(
            'p-2.5 rounded-lg border text-xs',
            q.answered
              ? 'border-white/[0.05] opacity-50'
              : 'border-purple-500/20 bg-purple-600/5',
          )}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-white/50 font-medium">{q.name}</span>
            <button
              onClick={() => upvote(q.id)}
              className="text-white/30 hover:text-white/60 text-[9px] transition-colors"
            >
              ▲ {q.votes}
            </button>
          </div>
          <p className="text-white/70 leading-relaxed">{q.question}</p>
          {!q.answered && (
            <button
              onClick={() => markAnswered(q.id)}
              className="mt-2 text-[10px] text-purple-400 hover:text-purple-300 transition-colors"
            >
              Mark Answered ✓
            </button>
          )}
        </div>
      ))}
      {questions.every(q => q.answered) && (
        <p className="text-[11px] text-white/25 text-center py-4">All questions answered</p>
      )}
    </div>
  )
}

// ─── PollingPanel ─────────────────────────────────────────────────────────────

function PollingPanel() {
  const [active, setActive] = useState(false)
  const [votes,  setVotes]  = useState([65, 20, 10, 5])

  const options = ['Great! Ready to worship', 'Need encouragement', 'Just visiting', 'Online for the first time']
  const total   = votes.reduce((a, b) => a + b, 0)

  const vote = (i: number) => {
    if (!active) return
    setVotes(prev => prev.map((v, idx) => idx === i ? v + 1 : v))
  }

  return (
    <div className="space-y-3">
      <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.07]">
        <div className="text-xs text-white/60 font-medium mb-2">How are you feeling today?</div>
        {options.map((opt, i) => {
          const pct = total > 0 ? Math.round((votes[i] / total) * 100) : 0
          return (
            <button
              key={i}
              onClick={() => vote(i)}
              className="w-full text-left py-1 group"
              disabled={!active}
            >
              <div className="flex justify-between text-[10px] text-white/40 mb-0.5">
                <span className={cn('transition-colors', active && 'group-hover:text-white/70')}>{opt}</span>
                <span>{pct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    active ? 'bg-purple-500' : 'bg-purple-500/50',
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </button>
          )
        })}
        <div className="text-[9px] text-white/25 mt-2 text-right">{total} responses</div>
      </div>
      <button
        onClick={() => setActive(v => !v)}
        className={cn(
          'w-full py-2 rounded-lg border text-xs font-semibold transition-colors',
          active
            ? 'border-red-500/30 text-red-400 hover:bg-red-600/10'
            : 'border-purple-500/30 text-purple-400 hover:bg-purple-600/10',
        )}
      >
        {active ? 'Close Poll' : 'Open Poll for Voting'}
      </button>
    </div>
  )
}
