import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Video, VideoOff, Mic2, MicOff, MonitorUp, Users, MessageSquare,
  PieChart, Globe, Settings, PhoneOff, Circle, Send, CheckCircle2,
  LayoutGrid, Maximize2, Minimize2, Wifi, WifiOff, Signal, Heart,
  Laugh, ThumbsUp, Flame, Hand, Radio, Eye, Clock, Award,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '../lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Participant {
  id: string
  name: string
  role: 'host' | 'speaker' | 'attendee'
  videoOn: boolean
  audioOn: boolean
  handRaised: boolean
  isSpeaking?: boolean
  avatarColor?: string
}

type LayoutMode = 'grid' | 'spotlight' | 'presentation'
type Reaction = { id: number; emoji: string; x: number }

const DEMO_PARTICIPANTS: Participant[] = [
  { id: '1', name: 'Pastor James',   role: 'host',     videoOn: true,  audioOn: true,  handRaised: false, isSpeaking: true,  avatarColor: 'from-purple-600 to-indigo-700' },
  { id: '2', name: 'Worship Leader', role: 'speaker',  videoOn: true,  audioOn: false, handRaised: false, isSpeaking: false, avatarColor: 'from-blue-600 to-cyan-700' },
  { id: '3', name: 'Online Guest 1', role: 'attendee', videoOn: false, audioOn: false, handRaised: true,  avatarColor: 'from-emerald-600 to-teal-700' },
  { id: '4', name: 'Online Guest 2', role: 'attendee', videoOn: true,  audioOn: false, handRaised: false, avatarColor: 'from-orange-600 to-red-700' },
  { id: '5', name: 'Online Guest 3', role: 'attendee', videoOn: false, audioOn: false, handRaised: false, avatarColor: 'from-pink-600 to-rose-700' },
  { id: '6', name: 'Online Guest 4', role: 'attendee', videoOn: false, audioOn: false, handRaised: false, avatarColor: 'from-yellow-600 to-amber-700' },
]

const REACTION_EMOJIS = ['🙏', '❤️', '🔥', '👏', '😭', '🙌', '✝️', '💫']

// ─── WebinarPage ──────────────────────────────────────────────────────────────

export function WebinarPage() {
  const navigate = useNavigate()
  const [participants, setParticipants] = useState<Participant[]>(DEMO_PARTICIPANTS)
  const [videoOn,      setVideoOn]      = useState(true)
  const [audioOn,      setAudioOn]      = useState(true)
  const [sharing,      setSharing]      = useState(false)
  const [isRecording,  setIsRecording]  = useState(false)
  const [ended,        setEnded]        = useState(false)
  const [activeTab,    setActiveTab]    = useState<'chat' | 'qa' | 'polling' | 'participants'>('chat')
  const [layout,       setLayout]       = useState<LayoutMode>('spotlight')
  const [spotlight,    setSpotlight]    = useState('1')   // participant id in spotlight
  const [reactions,    setReactions]    = useState<Reaction[]>([])
  const [viewerCount,  setViewerCount]  = useState(247)
  const [duration,     setDuration]     = useState(0)     // seconds
  const [lowerThird,   setLowerThird]   = useState<string | null>('Pastor James')
  const [showLowerThird, setShowLowerThird] = useState(true)
  const [streamHealth, setStreamHealth] = useState<'excellent' | 'good' | 'poor'>('excellent')

  const hostVideoRef    = useRef<HTMLVideoElement>(null)
  const hostStreamRef   = useRef<MediaStream | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const reactionId      = useRef(0)

  // ── Timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setDuration(d => d + 1), 1000)
    return () => clearInterval(t)
  }, [])

  // ── Simulate live viewer fluctuation ──────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => {
      setViewerCount(v => Math.max(200, v + Math.floor((Math.random() - 0.4) * 8)))
    }, 4000)
    return () => clearInterval(t)
  }, [])

  // ── Simulate speaking indicator rotation ──────────────────────────────────
  useEffect(() => {
    const speakers = ['1', '2']
    let i = 0
    const t = setInterval(() => {
      const active = speakers[i % speakers.length]
      setParticipants(prev => prev.map(p => ({ ...p, isSpeaking: p.id === active })))
      setLowerThird(prev => {
        const p = DEMO_PARTICIPANTS.find(x => x.id === active)
        return p?.name ?? prev
      })
      i++
    }, 7000)
    return () => clearInterval(t)
  }, [])

  // ── Host camera ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!videoOn) {
      hostStreamRef.current?.getTracks().forEach(t => t.stop())
      hostStreamRef.current = null
      if (hostVideoRef.current) hostVideoRef.current.srcObject = null
      return
    }
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then(stream => {
        hostStreamRef.current = stream
        if (hostVideoRef.current) {
          hostVideoRef.current.srcObject = stream
          hostVideoRef.current.play().catch(() => {})
        }
      })
      .catch(() => {/* camera not available in demo */})
    return () => {
      hostStreamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [videoOn])

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
        setLayout('presentation')
      } catch { /* cancelled */ }
    }
  }

  const sendReaction = (emoji: string) => {
    const id = ++reactionId.current
    const x  = 10 + Math.random() * 80
    setReactions(prev => [...prev, { id, emoji, x }])
    setTimeout(() => setReactions(prev => prev.filter(r => r.id !== id)), 3500)
  }

  const endEvent = () => {
    hostStreamRef.current?.getTracks().forEach(t => t.stop())
    screenStreamRef.current?.getTracks().forEach(t => t.stop())
    setEnded(true)
  }

  const fmtDuration = (s: number) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
      : `${m}:${String(sec).padStart(2, '0')}`
  }

  // ── Ended screen ──────────────────────────────────────────────────────────
  if (ended) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="h-full flex flex-col items-center justify-center text-center gap-6 bg-[#08080f] relative overflow-hidden"
      >
        {/* Background orbs */}
        <div className="absolute top-1/4 left-1/3 w-64 h-64 rounded-full bg-purple-600/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/3 right-1/4 w-48 h-48 rounded-full bg-blue-600/5 blur-3xl pointer-events-none" />

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="w-20 h-20 rounded-2xl bg-emerald-500/12 border border-emerald-500/25 flex items-center justify-center"
        >
          <CheckCircle2 size={36} className="text-emerald-400" />
        </motion.div>
        <div>
          <h2 className="text-2xl font-bold text-white/90 mb-2">Event Ended</h2>
          <p className="text-sm text-white/40 max-w-xs">
            The hybrid event has ended. {viewerCount.toLocaleString()} people were connected.
          </p>
        </div>

        {/* Session stats */}
        <div className="grid grid-cols-3 gap-4 px-8">
          {[
            { label: 'Duration',  value: fmtDuration(duration), icon: Clock   },
            { label: 'Viewers',   value: viewerCount.toLocaleString(), icon: Eye  },
            { label: 'Engaged',   value: '78%',                  icon: Award   },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.07] text-center">
              <Icon size={18} className="text-purple-400 mx-auto mb-2" />
              <div className="text-xl font-bold text-white/90">{value}</div>
              <div className="text-[10px] text-white/35 mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => { setEnded(false); setParticipants(DEMO_PARTICIPANTS); setDuration(0) }}
            className="px-5 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-sm text-white/60 hover:text-white/80 transition-colors"
          >
            New Event
          </button>
          <button
            onClick={() => navigate('/analytics')}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-semibold hover:from-purple-500 hover:to-indigo-500 transition-all shadow-lg shadow-purple-600/20"
          >
            View Analytics
          </button>
        </div>
      </motion.div>
    )
  }

  const spotlightParticipant = participants.find(p => p.id === spotlight) ?? participants[0]
  const sideParticipants     = layout === 'spotlight'
    ? participants.filter(p => p.id !== spotlight).slice(0, 5)
    : []
  const gridParticipants     = layout === 'grid' ? participants.slice(0, 6) : []

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#08080f] relative">

      {/* ── Animated ambient background ──────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ x: [0, 20, 0], y: [0, -15, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-0 left-[15%] w-[400px] h-[400px] rounded-full bg-purple-700/[0.05] blur-[80px]"
        />
        <motion.div
          animate={{ x: [0, -25, 0], y: [0, 20, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
          className="absolute bottom-0 right-[10%] w-[350px] h-[350px] rounded-full bg-blue-600/[0.05] blur-[80px]"
        />
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.04, 0.07, 0.04] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute top-[30%] right-[30%] w-[200px] h-[200px] rounded-full bg-orange-600/[0.06] blur-[60px]"
        />
      </div>

      {/* ── Top status bar ────────────────────────────────────────────────── */}
      <div className="relative z-10 flex items-center justify-between px-4 py-2 border-b border-white/[0.06] bg-black/30 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          {/* Live badge */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600/20 border border-red-500/30">
            <span className="live-dot w-2 h-2 rounded-full bg-red-400" />
            <span className="text-[11px] text-red-400 font-bold tracking-wider">LIVE</span>
          </div>

          {/* Duration */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/[0.08]">
            <Clock size={10} className="text-white/40" />
            <span className="text-[11px] text-white/60 font-mono">{fmtDuration(duration)}</span>
          </div>

          {/* Viewer count */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <Eye size={10} className="text-emerald-400" />
            <motion.span
              key={viewerCount}
              initial={{ y: -6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-[11px] text-emerald-400 font-medium"
            >
              {viewerCount.toLocaleString()} watching
            </motion.span>
          </div>

          {isRecording && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/25">
              <span className="live-dot w-1.5 h-1.5 rounded-full bg-red-400" />
              <span className="text-[10px] text-red-400 font-medium">REC</span>
            </div>
          )}
          {sharing && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/25">
              <MonitorUp size={10} className="text-blue-400" />
              <span className="text-[10px] text-blue-400 font-medium">Sharing</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Stream health */}
          <div className="flex items-center gap-1.5 mr-2">
            <Signal size={12} className={
              streamHealth === 'excellent' ? 'text-emerald-400' :
              streamHealth === 'good'      ? 'text-yellow-400' : 'text-red-400'
            } />
            <span className="text-[10px] text-white/40 capitalize">{streamHealth}</span>
          </div>

          {/* Platform badges */}
          <PlatformBadge name="Zoom"        color="blue"    />
          <PlatformBadge name="Teams"       color="purple"  />
          <PlatformBadge name="YouTube"     color="red"     />
          <PlatformBadge name="Facebook"    color="indigo"  />
        </div>
      </div>

      {/* ── Main area ─────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex-1 flex overflow-hidden">

        {/* Video canvas */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Layout toggle */}
          <div className="flex items-center gap-2 px-3 pt-2 pb-1 shrink-0">
            {(['spotlight', 'grid', 'presentation'] as const).map(l => (
              <button
                key={l}
                onClick={() => setLayout(l)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all capitalize',
                  layout === l
                    ? 'bg-purple-600/25 text-purple-400 border border-purple-500/30'
                    : 'text-white/35 hover:text-white/55',
                )}
              >
                <LayoutGrid size={10} />
                {l}
              </button>
            ))}

            {/* Lower-third toggle */}
            <button
              onClick={() => setShowLowerThird(v => !v)}
              className={cn(
                'ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all',
                showLowerThird
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/25'
                  : 'text-white/30 hover:text-white/55',
              )}
            >
              <Radio size={10} />
              Lower Third
            </button>
          </div>

          {/* Video tiles */}
          <div className="flex-1 p-3 overflow-hidden relative">

            {/* SPOTLIGHT layout */}
            {layout === 'spotlight' && (
              <div className="h-full flex gap-2">
                {/* Main spotlight tile */}
                <div className="flex-1 relative">
                  <ParticipantTile
                    participant={spotlightParticipant}
                    large
                    videoRef={spotlightParticipant.id === '1' ? hostVideoRef : undefined}
                    showVideo={spotlightParticipant.id === '1' && videoOn}
                    onLowerHand={() => lowerHand(spotlightParticipant.id)}
                    onSpotlight={() => {}}
                  />
                  {/* Lower third */}
                  <AnimatePresence>
                    {showLowerThird && (
                      <motion.div
                        key="lower-third"
                        initial={{ y: 30, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 30, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="absolute bottom-4 left-4 right-4"
                      >
                        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-black/70 border border-white/10 backdrop-blur-sm">
                          <div className="w-[3px] h-8 rounded-full bg-gradient-to-b from-purple-400 to-indigo-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]" />
                          <div>
                            <div className="text-sm font-bold text-white">
                              {spotlightParticipant.name}
                            </div>
                            <div className="text-[11px] text-purple-300/80 capitalize">
                              {spotlightParticipant.role} — Sunday Service
                            </div>
                          </div>
                          {spotlightParticipant.isSpeaking && (
                            <div className="ml-auto flex items-center gap-1">
                              {[0,1,2].map(i => (
                                <motion.div
                                  key={i}
                                  animate={{ scaleY: [1, 1.8, 1] }}
                                  transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                                  className="w-[3px] h-3 bg-emerald-400 rounded-full origin-bottom"
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Side strip */}
                {sideParticipants.length > 0 && (
                  <div className="w-36 flex flex-col gap-2">
                    {sideParticipants.map(p => (
                      <div
                        key={p.id}
                        className="flex-1 cursor-pointer"
                        onClick={() => setSpotlight(p.id)}
                      >
                        <ParticipantTile
                          participant={p}
                          large={false}
                          onLowerHand={() => lowerHand(p.id)}
                          onSpotlight={() => setSpotlight(p.id)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* GRID layout */}
            {layout === 'grid' && (
              <div className="h-full grid grid-cols-3 grid-rows-2 gap-2">
                {gridParticipants.map(p => (
                  <div key={p.id} onClick={() => { setSpotlight(p.id); setLayout('spotlight') }} className="cursor-pointer">
                    <ParticipantTile
                      participant={p}
                      large={false}
                      videoRef={p.id === '1' ? hostVideoRef : undefined}
                      showVideo={p.id === '1' && videoOn}
                      onLowerHand={() => lowerHand(p.id)}
                      onSpotlight={() => { setSpotlight(p.id); setLayout('spotlight') }}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* PRESENTATION layout */}
            {layout === 'presentation' && (
              <div className="h-full flex gap-2">
                <div className="flex-1 rounded-xl overflow-hidden bg-black border border-white/10 flex items-center justify-center relative">
                  {sharing ? (
                    <>
                      <div className="text-white/20 text-sm">Screen Share Active</div>
                      <div className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-blue-600/80 text-[10px] text-white font-bold">SCREEN</div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-3 text-white/20">
                      <MonitorUp size={40} />
                      <span className="text-sm">Start screen share to present</span>
                    </div>
                  )}
                </div>
                <div className="w-28 flex flex-col gap-1.5">
                  {participants.slice(0, 4).map(p => (
                    <div key={p.id} className="flex-1">
                      <ParticipantTile participant={p} large={false} onLowerHand={() => lowerHand(p.id)} onSpotlight={() => {}} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Floating reactions */}
            <AnimatePresence>
              {reactions.map(r => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 1, y: 0, scale: 1 }}
                  animate={{ opacity: 0, y: -200, scale: 1.4 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 3, ease: 'easeOut' }}
                  className="absolute bottom-16 text-2xl pointer-events-none select-none"
                  style={{ left: `${r.x}%` }}
                >
                  {r.emoji}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Reactions bar */}
          <div className="shrink-0 px-3 pb-1">
            <div className="flex items-center gap-1 justify-center">
              {REACTION_EMOJIS.map(emoji => (
                <motion.button
                  key={emoji}
                  whileTap={{ scale: 1.4 }}
                  onClick={() => sendReaction(emoji)}
                  className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.09] text-base transition-colors flex items-center justify-center"
                >
                  {emoji}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Controls bar */}
          <div className="shrink-0 flex items-center justify-center gap-2 py-2.5 px-6 border-t border-white/[0.05] bg-black/30 backdrop-blur-sm">
            <ControlButton icon={audioOn ? Mic2 : MicOff}       label={audioOn ? 'Mute'       : 'Unmute'}   onClick={() => setAudioOn(v => !v)}    danger={!audioOn}    />
            <ControlButton icon={videoOn ? Video : VideoOff}    label={videoOn ? 'Stop Video' : 'Start Cam'} onClick={() => setVideoOn(v => !v)}    danger={!videoOn}    />
            <ControlButton icon={MonitorUp}                      label={sharing ? 'Stop Share' : 'Share'}     onClick={toggleShare}                  accent={sharing}     />
            <ControlButton icon={Circle}                         label={isRecording ? 'Stop Rec' : 'Record'}  onClick={() => setIsRecording(v => !v)} danger={isRecording} />
            <ControlButton icon={Hand}                           label="Raise Hand"                           onClick={() => sendReaction('✋')}                           />
            <ControlButton icon={Globe}                          label="Translate"                            onClick={() => setActiveTab('chat')}                        />
            <ControlButton icon={Settings}                       label="Settings"                             onClick={() => navigate('/settings')}                       />

            <div className="w-px h-8 bg-white/10 mx-1" />

            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={endEvent}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-lg shadow-red-600/25"
            >
              <PhoneOff size={13} />
              End Event
            </motion.button>
          </div>
        </div>

        {/* ── Right panel ─────────────────────────────────────────────────── */}
        <div className="w-[280px] shrink-0 border-l border-white/[0.05] flex flex-col bg-black/20 backdrop-blur-sm">

          {/* Tabs */}
          <div className="flex border-b border-white/[0.05] shrink-0">
            {(['chat', 'participants', 'qa', 'polling'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'flex-1 py-2 text-[10px] font-medium capitalize transition-colors relative',
                  activeTab === tab
                    ? 'text-purple-400'
                    : 'text-white/30 hover:text-white/55',
                )}
              >
                {tab === 'qa' ? 'Q&A' : tab}
                {activeTab === tab && (
                  <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-[2px] bg-purple-500" />
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3 flex flex-col">
            {activeTab === 'participants' && (
              <ParticipantList participants={participants} onLowerHand={lowerHand} onSpotlight={id => { setSpotlight(id); setLayout('spotlight') }} />
            )}
            {activeTab === 'chat'        && <ChatPanel onReaction={sendReaction} />}
            {activeTab === 'qa'          && <QAPanel />}
            {activeTab === 'polling'     && <PollingPanel />}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── ParticipantTile ──────────────────────────────────────────────────────────

function ParticipantTile({ participant, large, videoRef, showVideo, onLowerHand, onSpotlight }: {
  participant: Participant
  large?: boolean
  videoRef?: React.RefObject<HTMLVideoElement>
  showVideo?: boolean
  onLowerHand: () => void
  onSpotlight: () => void
}) {
  const borderColor =
    participant.isSpeaking   ? 'border-emerald-400/70 shadow-[0_0_16px_rgba(52,211,153,0.25)]' :
    participant.role === 'host'    ? 'border-purple-500/50' :
    participant.role === 'speaker' ? 'border-blue-500/40'   : 'border-white/[0.08]'

  return (
    <div className={cn(
      'relative w-full h-full rounded-xl overflow-hidden border-2 group transition-all duration-300',
      borderColor,
    )}>
      {/* Background / avatar */}
      <div className={cn('absolute inset-0 bg-gradient-to-br', participant.avatarColor ?? 'from-gray-700 to-gray-900')}>
        {/* Subtle animated pattern */}
        <motion.div
          animate={{ opacity: [0.03, 0.07, 0.03] }}
          transition={{ duration: 4, repeat: Infinity }}
          className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,_rgba(255,255,255,0.12)_0%,_transparent_60%)]"
        />
      </div>

      {/* Live camera video */}
      {showVideo && (
        <video
          ref={videoRef}
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Simulated other-camera tiles (non-host) */}
      {participant.videoOn && !showVideo && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800/80 to-gray-950/80 flex items-center justify-center">
          <div className={cn(
            'rounded-full bg-gradient-to-br flex items-center justify-center text-white/90 font-bold',
            large ? 'w-20 h-20 text-3xl' : 'w-10 h-10 text-xl',
            participant.avatarColor,
          )}>
            {participant.name[0]}
          </div>
        </div>
      )}

      {/* Video-off — avatar */}
      {!participant.videoOn && !showVideo && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={cn(
            'rounded-full bg-gradient-to-br border-2 border-white/20 flex items-center justify-center text-white font-bold shadow-xl',
            large ? 'w-24 h-24 text-4xl' : 'w-12 h-12 text-2xl',
            participant.avatarColor,
          )}>
            {participant.name[0]}
          </div>
        </div>
      )}

      {/* Speaking animation ring */}
      <AnimatePresence>
        {participant.isSpeaking && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 rounded-xl border-2 border-emerald-400/60"
          >
            <motion.div
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="absolute inset-0 rounded-xl border border-emerald-400/30"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Raised hand badge */}
      <AnimatePresence>
        {participant.handRaised && (
          <motion.button
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0 }}
            onClick={onLowerHand}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-base shadow-lg z-10"
            title="Lower hand"
          >
            ✋
          </motion.button>
        )}
      </AnimatePresence>

      {/* Role badge */}
      {participant.role !== 'attendee' && (
        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/50 backdrop-blur-sm text-[9px] font-semibold uppercase tracking-wide text-white/70">
          {participant.role}
        </div>
      )}

      {/* Spotlight button */}
      <button
        onClick={onSpotlight}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md bg-black/50 flex items-center justify-center transition-opacity"
      >
        <Maximize2 size={10} className="text-white/70" />
      </button>

      {/* Bottom nameplate */}
      <div className="absolute bottom-0 left-0 right-0 px-2.5 py-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-end justify-between">
        <div>
          <div className={cn('font-semibold text-white truncate', large ? 'text-sm' : 'text-[11px]')}>
            {participant.name}
          </div>
          {participant.isSpeaking && (
            <div className="flex items-center gap-0.5 mt-0.5">
              {[0,1,2,3].map(i => (
                <motion.div
                  key={i}
                  animate={{ scaleY: [1, 2, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                  className="w-[2px] h-2 bg-emerald-400 rounded-full origin-bottom"
                />
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!participant.audioOn && <MicOff  size={large ? 12 : 9} className="text-red-400" />}
          {!participant.videoOn && <VideoOff size={large ? 12 : 9} className="text-red-400" />}
        </div>
      </div>
    </div>
  )
}

// ─── ControlButton ────────────────────────────────────────────────────────────

function ControlButton({ icon: Icon, label, onClick, danger, accent, title }: {
  icon: React.ElementType; label: string; onClick: () => void
  danger?: boolean; accent?: boolean; title?: string
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      title={title}
      className={cn(
        'flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all text-xs',
        danger ? 'bg-red-600/25 text-red-400  hover:bg-red-600/40  border border-red-500/30' :
        accent ? 'bg-blue-600/25 text-blue-400 border border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.15)]' :
                 'text-white/45 hover:text-white hover:bg-white/[0.07]',
      )}
    >
      <Icon size={15} />
      <span className="text-[9px]">{label}</span>
    </motion.button>
  )
}

// ─── PlatformBadge ────────────────────────────────────────────────────────────

function PlatformBadge({ name, color }: { name: string; color: string }) {
  const colors: Record<string, string> = {
    blue:   'bg-blue-600/12    border-blue-500/20    text-blue-400',
    purple: 'bg-purple-600/12  border-purple-500/20  text-purple-400',
    red:    'bg-red-600/12     border-red-500/20     text-red-400',
    indigo: 'bg-indigo-600/12  border-indigo-500/20  text-indigo-400',
    emerald:'bg-emerald-600/12 border-emerald-500/20 text-emerald-400',
    orange: 'bg-orange-600/12  border-orange-500/20  text-orange-400',
  }
  return (
    <span className={cn('px-2 py-0.5 rounded-full border text-[10px] font-medium', colors[color] ?? colors.blue)}>
      {name}
    </span>
  )
}

// ─── ParticipantList ──────────────────────────────────────────────────────────

function ParticipantList({ participants, onLowerHand, onSpotlight }: {
  participants: Participant[]
  onLowerHand: (id: string) => void
  onSpotlight: (id: string) => void
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-white/35 uppercase tracking-widest">Connected</span>
        <span className="text-[10px] text-white/35">{participants.length} participants</span>
      </div>
      {participants.map(p => (
        <motion.div
          key={p.id}
          layout
          className="flex items-center justify-between p-2 rounded-lg hover:bg-white/[0.04] transition-colors group cursor-pointer"
          onClick={() => onSpotlight(p.id)}
        >
          <div className="flex items-center gap-2">
            <div className={cn(
              'w-7 h-7 rounded-full bg-gradient-to-br flex items-center justify-center text-xs font-bold text-white shrink-0',
              p.avatarColor ?? 'from-gray-600 to-gray-800',
            )}>
              {p.name[0]}
            </div>
            <div>
              <div className="text-xs text-white/70 flex items-center gap-1.5">
                {p.name}
                {p.isSpeaking && (
                  <span className="text-[8px] text-emerald-400 font-medium">speaking</span>
                )}
              </div>
              <div className="text-[9px] text-white/28 capitalize">{p.role}</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {p.handRaised && (
              <button
                onClick={e => { e.stopPropagation(); onLowerHand(p.id) }}
                className="text-yellow-400 text-sm leading-none"
                title="Lower hand"
              >
                ✋
              </button>
            )}
            {!p.audioOn && <MicOff  size={10} className="text-red-400/70" />}
            {!p.videoOn && <VideoOff size={10} className="text-red-400/70" />}
          </div>
        </motion.div>
      ))}
    </div>
  )
}

// ─── ChatPanel ────────────────────────────────────────────────────────────────

interface ChatMessage { id: number; name: string; text: string; time: string; reaction?: string }

function ChatPanel({ onReaction }: { onReaction: (emoji: string) => void }) {
  const [input,    setInput]    = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 1, name: 'Online Guest 1', text: 'Amen! So powerful 🙏',                             time: '10:32' },
    { id: 2, name: 'Online Guest 2', text: 'This is exactly what I needed today!',              time: '10:33' },
    { id: 3, name: 'Online Guest 3', text: 'Can someone share the scripture reference please?', time: '10:34' },
    { id: 4, name: 'Online Guest 4', text: '🔥🔥🔥 The spirit is moving!',                    time: '10:35' },
  ])
  const bottomRef = useRef<HTMLDivElement>(null)

  const send = () => {
    const text = input.trim()
    if (!text) return
    const now  = new Date()
    const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
    setMessages(prev => [...prev, { id: Date.now(), name: 'You (Host)', text, time }])
    setInput('')
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  return (
    <div className="flex flex-col h-full gap-2">
      <div className="flex-1 space-y-2.5 overflow-y-auto pr-0.5">
        <AnimatePresence initial={false}>
          {messages.map(msg => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs"
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className={cn(
                  'font-semibold',
                  msg.name === 'You (Host)' ? 'text-orange-400' : 'text-purple-400',
                )}>
                  {msg.name}
                </span>
                <span className="text-white/22 text-[9px]">{msg.time}</span>
              </div>
              <p className="text-white/60 leading-relaxed">{msg.text}</p>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-1.5 shrink-0">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Message everyone…"
          className="flex-1 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white/70 placeholder:text-white/22 outline-none focus:border-purple-500/40 transition-colors"
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
    { id: 2, name: 'Online Guest 1', question: 'Is there a study guide available for this message?',    votes: 8,  answered: false },
    { id: 3, name: 'Online Guest 3', question: 'What translation of the Bible are you using today?',    votes: 5,  answered: true  },
  ])

  const markAnswered = (id: number) =>
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, answered: true } : q))

  const upvote = (id: number) =>
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, votes: q.votes + 1 } : q))

  const sorted = [...questions].sort((a, b) => (a.answered ? 1 : -1) - (b.answered ? 1 : -1) || b.votes - a.votes)

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {sorted.map(q => (
          <motion.div
            key={q.id}
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: q.answered ? 0.45 : 1, y: 0 }}
            className={cn(
              'p-2.5 rounded-xl border text-xs',
              q.answered
                ? 'border-white/[0.05] bg-transparent'
                : 'border-purple-500/20 bg-purple-600/5',
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-white/50 font-medium">{q.name}</span>
              <button
                onClick={() => upvote(q.id)}
                disabled={q.answered}
                className="flex items-center gap-0.5 text-[9px] text-white/30 hover:text-purple-400 transition-colors disabled:opacity-50"
              >
                ▲ {q.votes}
              </button>
            </div>
            <p className="text-white/65 leading-relaxed mb-2">{q.question}</p>
            {!q.answered && (
              <button
                onClick={() => markAnswered(q.id)}
                className="flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-300 transition-colors"
              >
                <CheckCircle2 size={10} />
                Mark Answered
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

// ─── PollingPanel ─────────────────────────────────────────────────────────────

function PollingPanel() {
  const [active,   setActive]   = useState(false)
  const [hasVoted, setHasVoted] = useState(false)
  const [votes,    setVotes]    = useState([65, 20, 10, 5])

  const options = ['Great! Ready to worship', 'Need encouragement', 'Just visiting', 'First time online']
  const total   = votes.reduce((a, b) => a + b, 0)

  const vote = (i: number) => {
    if (!active || hasVoted) return
    setVotes(prev => prev.map((v, idx) => idx === i ? v + 1 : v))
    setHasVoted(true)
  }

  return (
    <div className="space-y-3">
      <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.07]">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs text-white/65 font-semibold">How are you feeling today?</div>
          <div className="text-[9px] text-white/28">{total} responses</div>
        </div>
        {options.map((opt, i) => {
          const pct = total > 0 ? Math.round((votes[i] / total) * 100) : 0
          return (
            <button
              key={i}
              onClick={() => vote(i)}
              disabled={!active || hasVoted}
              className="w-full text-left py-1.5 group disabled:cursor-default"
            >
              <div className="flex justify-between text-[10px] text-white/40 mb-1">
                <span className={cn('transition-colors', active && !hasVoted && 'group-hover:text-white/70')}>{opt}</span>
                <span className="font-mono">{pct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className={cn(
                    'h-full rounded-full',
                    active ? 'bg-gradient-to-r from-purple-500 to-indigo-500' : 'bg-purple-500/40',
                  )}
                />
              </div>
            </button>
          )
        })}
      </div>

      <button
        onClick={() => { setActive(v => !v); setHasVoted(false) }}
        className={cn(
          'w-full py-2 rounded-xl border text-xs font-semibold transition-all',
          active
            ? 'border-red-500/30 text-red-400 hover:bg-red-600/10'
            : 'border-purple-500/30 text-purple-400 hover:bg-purple-600/10',
        )}
      >
        {active ? 'Close Poll' : 'Open Poll for Voting'}
      </button>

      {hasVoted && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-[10px] text-emerald-400 flex items-center justify-center gap-1"
        >
          <CheckCircle2 size={10} />
          Your vote has been counted
        </motion.div>
      )}
    </div>
  )
}
