import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Video, VideoOff, Mic2, MicOff, MonitorUp, Users, MessageSquare,
  Hand, PieChart, Globe, Settings, PhoneOff, Circle
} from 'lucide-react'
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
  { id: '1', name: 'Pastor James', role: 'host', videoOn: true, audioOn: true, handRaised: false },
  { id: '2', name: 'Worship Leader', role: 'speaker', videoOn: true, audioOn: false, handRaised: false },
  { id: '3', name: 'Sarah M.', role: 'attendee', videoOn: false, audioOn: false, handRaised: true },
  { id: '4', name: 'John D.', role: 'attendee', videoOn: true, audioOn: false, handRaised: false },
  { id: '5', name: 'Mary K.', role: 'attendee', videoOn: false, audioOn: false, handRaised: false },
]

export function WebinarPage() {
  const [participants, setParticipants] = useState<Participant[]>(DEMO_PARTICIPANTS)
  const [videoOn, setVideoOn] = useState(true)
  const [audioOn, setAudioOn] = useState(true)
  const [sharing, setSharing] = useState(false)
  const [activeTab, setActiveTab] = useState<'chat' | 'qa' | 'polling' | 'participants'>('participants')
  const [isRecording, setIsRecording] = useState(false)

  const lowerHand = (id: string) => {
    setParticipants(prev => prev.map(p => p.id === id ? { ...p, handRaised: false } : p))
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
        </div>

        <div className="flex items-center gap-2">
          <PlatformBadge name="Zoom" color="blue" />
          <PlatformBadge name="Teams" color="purple" />
          <PlatformBadge name="Google Meet" color="emerald" />
          <PlatformBadge name="LiveKit" color="orange" />
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main video grid */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Video area */}
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
              active={audioOn}
              onClick={() => setAudioOn(v => !v)}
              danger={!audioOn}
            />
            <ControlButton
              icon={videoOn ? Video : VideoOff}
              label={videoOn ? 'Stop Video' : 'Start Video'}
              active={videoOn}
              onClick={() => setVideoOn(v => !v)}
              danger={!videoOn}
            />
            <ControlButton
              icon={MonitorUp}
              label={sharing ? 'Stop Share' : 'Share Screen'}
              active={sharing}
              onClick={() => setSharing(v => !v)}
              accent={sharing}
            />
            <ControlButton
              icon={Circle}
              label={isRecording ? 'Stop Rec' : 'Record'}
              active={isRecording}
              onClick={() => setIsRecording(v => !v)}
              danger={isRecording}
            />
            <ControlButton icon={Globe} label="Translate" onClick={() => {}} />
            <ControlButton icon={Settings} label="Settings" onClick={() => {}} />

            <div className="w-px h-8 bg-white/10 mx-1" />

            <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition-colors">
              <PhoneOff size={13} />
              End Event
            </button>
          </div>
        </div>

        {/* Right panel */}
        <div className="w-72 shrink-0 border-l border-white/[0.05] flex flex-col">
          {/* Tabs */}
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

          {/* Panel content */}
          <div className="flex-1 overflow-y-auto p-3">
            {activeTab === 'participants' && (
              <ParticipantList participants={participants} onLowerHand={lowerHand} />
            )}
            {activeTab === 'chat' && <ChatPanel />}
            {activeTab === 'qa' && <QAPanel />}
            {activeTab === 'polling' && <PollingPanel />}
          </div>
        </div>
      </div>
    </div>
  )
}

function ParticipantTile({ participant, onLowerHand }: {
  participant: Participant; onLowerHand: () => void
}) {
  const roleColor = participant.role === 'host'
    ? 'border-purple-500/60'
    : participant.role === 'speaker'
    ? 'border-blue-500/50'
    : 'border-white/10'

  return (
    <div className={cn('relative rounded-xl overflow-hidden border-2 bg-gray-900', roleColor)}>
      {/* Video placeholder */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-950 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-purple-600/30 border border-purple-500/40 flex items-center justify-center">
          <span className="text-white/80 text-lg font-semibold">
            {participant.name[0]}
          </span>
        </div>
      </div>

      {/* Raised hand */}
      {participant.handRaised && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-2 right-2"
        >
          <button
            onClick={onLowerHand}
            className="w-7 h-7 rounded-full bg-yellow-500 flex items-center justify-center text-sm shadow-lg"
            title="Lower hand"
          >
            ✋
          </button>
        </motion.div>
      )}

      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between">
        <span className="text-xs text-white/90 font-medium">{participant.name}</span>
        <div className="flex items-center gap-1">
          {!participant.audioOn && <MicOff size={10} className="text-red-400" />}
          {!participant.videoOn && <VideoOff size={10} className="text-red-400" />}
        </div>
      </div>

      {/* Role badge */}
      {participant.role !== 'attendee' && (
        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/60 text-[9px] font-medium uppercase text-white/60">
          {participant.role}
        </div>
      )}
    </div>
  )
}

function ControlButton({ icon: Icon, label, active, onClick, danger, accent }: {
  icon: React.ElementType; label: string; active?: boolean; onClick: () => void
  danger?: boolean; accent?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all text-xs',
        danger ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30' :
        accent ? 'bg-blue-600/25 text-blue-400 border border-blue-500/30' :
        'text-white/50 hover:text-white hover:bg-white/[0.07]',
      )}
    >
      <Icon size={16} />
      <span className="text-[10px]">{label}</span>
    </button>
  )
}

function PlatformBadge({ name, color }: { name: string; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-600/15 border-blue-500/25 text-blue-400',
    purple: 'bg-purple-600/15 border-purple-500/25 text-purple-400',
    emerald: 'bg-emerald-600/15 border-emerald-500/25 text-emerald-400',
    orange: 'bg-orange-600/15 border-orange-500/25 text-orange-400',
  }
  return (
    <span className={cn('px-2 py-0.5 rounded-full border text-[10px] font-medium', colors[color])}>
      {name}
    </span>
  )
}

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
            {!p.audioOn && <MicOff size={10} className="text-red-400" />}
            {!p.videoOn && <VideoOff size={10} className="text-red-400" />}
          </div>
        </div>
      ))}
    </div>
  )
}

function ChatPanel() {
  const [message, setMessage] = useState('')
  const messages = [
    { id: 1, name: 'Sarah M.', text: 'Amen! So powerful!', time: '10:32' },
    { id: 2, name: 'John D.', text: 'This is exactly what I needed to hear today 🙏', time: '10:33' },
    { id: 3, name: 'Mary K.', text: 'Can someone share the scripture reference?', time: '10:34' },
  ]

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 space-y-2 mb-3">
        {messages.map(msg => (
          <div key={msg.id} className="text-xs">
            <span className="text-purple-400 font-medium">{msg.name}</span>
            <span className="text-white/30 ml-1 text-[9px]">{msg.time}</span>
            <p className="text-white/60 mt-0.5">{msg.text}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Message everyone..."
          className="flex-1 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white/70 placeholder:text-white/25 outline-none"
        />
      </div>
    </div>
  )
}

function QAPanel() {
  const questions = [
    { id: 1, name: 'Anonymous', question: 'How do I apply Romans 8:28 when everything seems lost?', votes: 12, answered: false },
    { id: 2, name: 'Sarah M.', question: 'Is there a study guide for this message?', votes: 8, answered: true },
  ]

  return (
    <div className="space-y-2">
      {questions.map(q => (
        <div key={q.id} className={cn('p-2.5 rounded-lg border text-xs', q.answered ? 'border-white/[0.05] opacity-50' : 'border-purple-500/20 bg-purple-600/5')}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-white/50 font-medium">{q.name}</span>
            <span className="text-white/30">{q.votes} votes</span>
          </div>
          <p className="text-white/70 leading-relaxed">{q.question}</p>
          {!q.answered && (
            <button className="mt-2 text-[10px] text-purple-400 hover:text-purple-300">Answer Live →</button>
          )}
        </div>
      ))}
    </div>
  )
}

function PollingPanel() {
  const [active, setActive] = useState(false)
  return (
    <div className="space-y-3">
      <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.07]">
        <div className="text-xs text-white/60 font-medium mb-2">How are you feeling today?</div>
        {['Great! Ready to worship', 'Need encouragement', 'Just visiting', 'Online for the first time'].map((opt, i) => (
          <div key={i} className="flex items-center gap-2 py-1">
            <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-purple-500 rounded-full" style={{ width: `${[65, 20, 10, 5][i]}%` }} />
            </div>
            <span className="text-[10px] text-white/40 w-6 text-right">{[65, 20, 10, 5][i]}%</span>
          </div>
        ))}
      </div>
      <button
        onClick={() => setActive(v => !v)}
        className="w-full py-2 rounded-lg border border-purple-500/30 text-xs text-purple-400 hover:bg-purple-600/10 transition-colors"
      >
        {active ? 'Stop Poll' : 'Launch New Poll'}
      </button>
    </div>
  )
}
