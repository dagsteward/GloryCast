import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Users, MessageSquare, Zap, Plus, Play, BarChart3, Check, X, Send } from 'lucide-react'
import { cn } from '../lib/utils'

interface PollData {
  id: string
  question: string
  options: string[]
  responses: number[]
  active: boolean
}

interface QuestionData {
  id: string
  author: string
  text: string
  upvotes: number
  answered: boolean
}

const DEMO_POLLS: PollData[] = [
  {
    id: 'p1',
    question: 'What topic should we study next month?',
    options: ['Prayer & Fasting', 'Spiritual Gifts', 'The Psalms', 'Book of Revelation'],
    responses: [0, 0, 0, 0],
    active: false,
  },
  {
    id: 'p2',
    question: 'How did you hear about today\'s service?',
    options: ['Church Website', 'Social Media', 'Friend/Family', 'YouTube/Facebook'],
    responses: [0, 0, 0, 0],
    active: false,
  },
]

const DEMO_QUESTIONS: QuestionData[] = [
  { id: 'qa1', author: 'Viewer',     text: 'Can you explain Romans 8:28 more?',               upvotes: 12, answered: false },
  { id: 'qa2', author: 'Anonymous',  text: 'Is there a prayer group for new members?',          upvotes: 8,  answered: false },
  { id: 'qa3', author: 'Viewer',     text: 'Where can I find the sermon notes?',                upvotes: 5,  answered: true  },
]

const QUIZ_QUESTIONS = [
  {
    id: 'q1',
    question: 'According to Romans 8:28, God works for the good of those who…',
    options: ['Obey the law', 'Love Him', 'Come to church', 'Give tithes'],
    correctIndex: 1,
    points: 100,
  },
  {
    id: 'q2',
    question: 'Complete: "I can do all things through Christ who…"',
    options: ['saves me', 'loves me', 'strengthens me', 'guides me'],
    correctIndex: 2,
    points: 150,
  },
  {
    id: 'q3',
    question: 'In John 3:16, what did God give as an expression of His love?',
    options: ['Eternal wisdom', 'His one and only Son', 'The Holy Spirit', 'The Scriptures'],
    correctIndex: 1,
    points: 100,
  },
]

// Leaderboard — anonymized participant names
const INITIAL_LEADERBOARD = [
  { rank: 1, name: 'Participant #1', score: 0, avatar: '#' },
  { rank: 2, name: 'Participant #2', score: 0, avatar: '#' },
  { rank: 3, name: 'Participant #3', score: 0, avatar: '#' },
]

export function EngagementPage() {
  const [activeTab, setActiveTab]         = useState<'quiz' | 'polls' | 'qa'>('quiz')
  const [quizActive, setQuizActive]       = useState(false)
  const [currentQ, setCurrentQ]           = useState(0)
  const [responses, setResponses]         = useState<number[]>([0, 0, 0, 0])
  const [polls, setPolls]                 = useState<PollData[]>(DEMO_POLLS)
  const [questions, setQuestions]         = useState<QuestionData[]>(DEMO_QUESTIONS)
  const [leaderboard, setLeaderboard]     = useState(INITIAL_LEADERBOARD)
  const [participantCount, setParticipantCount] = useState(0)

  // Simulate incoming responses when quiz is active
  useEffect(() => {
    if (!quizActive) return
    const t = setInterval(() => {
      setResponses(prev => {
        const next = [...prev]
        const idx = Math.floor(Math.random() * 4)
        next[idx] += Math.floor(Math.random() * 8 + 2)
        return next
      })
      setParticipantCount(p => p + Math.floor(Math.random() * 5 + 1))
    }, 1500)
    return () => clearInterval(t)
  }, [quizActive])

  const totalResponses = responses.reduce((a, b) => a + b, 0)
  const q              = QUIZ_QUESTIONS[currentQ]

  const handleStartQuiz = () => {
    setQuizActive(true)
    setResponses([0, 0, 0, 0])
    setParticipantCount(0)
    setCurrentQ(0)
  }

  const handleNextQuestion = () => {
    if (currentQ < QUIZ_QUESTIONS.length - 1) {
      setCurrentQ(c => c + 1)
      setResponses([0, 0, 0, 0])
    } else {
      setQuizActive(false)
    }
  }

  const togglePoll = (id: string) => {
    setPolls(prev => prev.map(p =>
      p.id === id
        ? { ...p, active: !p.active, responses: p.active ? p.responses : p.responses.map(() => 0) }
        : p,
    ))
  }

  // Simulate poll votes
  useEffect(() => {
    const activePoll = polls.find(p => p.active)
    if (!activePoll) return
    const t = setInterval(() => {
      setPolls(prev => prev.map(p => {
        if (!p.active) return p
        const next = [...p.responses]
        next[Math.floor(Math.random() * p.options.length)] += Math.floor(Math.random() * 6 + 1)
        return { ...p, responses: next }
      }))
    }, 1200)
    return () => clearInterval(t)
  }, [polls])

  return (
    <div className="h-full flex overflow-hidden">

      {/* ── Left panel ────────────────────────────────────────────────────── */}
      <div className="w-72 shrink-0 flex flex-col border-r border-white/[0.05] bg-chrome">

        {/* Tabs */}
        <div className="flex border-b border-white/[0.05]">
          {([
            { key: 'quiz',  label: 'Quiz'  },
            { key: 'polls', label: 'Polls' },
            { key: 'qa',    label: 'Q&A'   },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                'flex-1 py-2.5 text-[10px] font-semibold uppercase tracking-wider transition-colors',
                activeTab === key
                  ? 'text-purple-400 border-b-2 border-purple-500'
                  : 'text-white/25 hover:text-white/55',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 p-3 overflow-y-auto space-y-3">

          {/* ── Quiz tab ─────────────────────────────────────────────────── */}
          {activeTab === 'quiz' && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-white/50 font-semibold">Bible Quiz</span>
                <button
                  onClick={quizActive ? handleNextQuestion : handleStartQuiz}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all',
                    quizActive
                      ? 'bg-orange-600/20 text-orange-400 border border-orange-500/30'
                      : 'bg-purple-600 text-white hover:bg-purple-500',
                  )}
                >
                  {quizActive
                    ? currentQ < QUIZ_QUESTIONS.length - 1 ? 'Next Question' : 'End Quiz'
                    : <><Play size={11} /> Start Quiz</>}
                </button>
              </div>

              {QUIZ_QUESTIONS.map((qq, i) => (
                <div
                  key={qq.id}
                  className={cn(
                    'p-3 rounded-xl border transition-all',
                    i === currentQ && quizActive
                      ? 'border-purple-500/40 bg-purple-600/10'
                      : i < currentQ
                        ? 'border-emerald-500/20 bg-emerald-600/5 opacity-60'
                        : 'border-white/[0.06] bg-white/[0.02]',
                  )}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-white/35">Q{i + 1} · {qq.points} pts</span>
                    {i < currentQ && <Check size={11} className="text-emerald-400" />}
                    {i === currentQ && quizActive && (
                      <span className="text-[10px] text-purple-400 font-semibold animate-pulse">ACTIVE</span>
                    )}
                  </div>
                  <p className="text-xs text-white/65 leading-relaxed">{qq.question}</p>
                </div>
              ))}

              {quizActive && (
                <div className="flex items-center justify-between px-1 text-[10px] text-white/35">
                  <span className="flex items-center gap-1.5"><Users size={10} /> {participantCount} participants</span>
                  <span className="font-mono">{totalResponses} responses</span>
                </div>
              )}
            </>
          )}

          {/* ── Polls tab ─────────────────────────────────────────────────── */}
          {activeTab === 'polls' && (
            <>
              {polls.map(poll => (
                <div key={poll.id} className={cn(
                  'p-3 rounded-xl border transition-all',
                  poll.active ? 'border-purple-500/40 bg-purple-600/10' : 'border-white/[0.07] bg-white/[0.02]',
                )}>
                  <p className="text-xs text-white/70 font-medium mb-2">{poll.question}</p>
                  <div className="space-y-1 mb-2.5">
                    {poll.options.map((opt, i) => {
                      const total = poll.responses.reduce((a, b) => a + b, 0)
                      const pct   = total > 0 ? Math.round((poll.responses[i] / total) * 100) : 0
                      return (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-[10px] text-white/40 w-4 shrink-0">{String.fromCharCode(65 + i)}.</span>
                          <div className="flex-1">
                            <div className="flex justify-between text-[10px] text-white/40 mb-0.5">
                              <span>{opt}</span>
                              <span className="font-mono">{pct}%</span>
                            </div>
                            <div className="h-1 rounded-full bg-white/[0.07] overflow-hidden">
                              <motion.div
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.5 }}
                                className="h-full bg-purple-500 rounded-full"
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <button
                    onClick={() => togglePoll(poll.id)}
                    className={cn(
                      'w-full py-1.5 rounded-lg text-[11px] font-semibold transition-all',
                      poll.active
                        ? 'bg-red-600/15 text-red-400 border border-red-500/25 hover:bg-red-600/25'
                        : 'bg-purple-600/20 text-purple-400 border border-purple-500/25 hover:bg-purple-600/30',
                    )}
                  >
                    {poll.active ? 'Close Poll' : 'Launch Poll'}
                  </button>
                </div>
              ))}
            </>
          )}

          {/* ── Q&A tab ────────────────────────────────────────────────────── */}
          {activeTab === 'qa' && (
            <div className="space-y-2">
              {questions.map(q => (
                <div key={q.id} className={cn(
                  'p-3 rounded-xl border transition-all',
                  q.answered ? 'border-emerald-500/20 bg-emerald-600/5 opacity-60' : 'border-white/[0.07] bg-white/[0.02]',
                )}>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="text-xs text-white/70 leading-relaxed">{q.text}</p>
                    {!q.answered && (
                      <button
                        onClick={() => setQuestions(prev => prev.map(qi => qi.id === q.id ? { ...qi, answered: true } : qi))}
                        className="shrink-0 p-1 rounded-lg bg-emerald-600/15 text-emerald-400 hover:bg-emerald-600/25 transition-colors"
                        title="Mark answered"
                      >
                        <Check size={11} />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/25">{q.author}</span>
                    <span className="text-[10px] text-white/30 flex items-center gap-1">
                      ▲ {q.upvotes}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Center: Live results ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.05]">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-white/55">Live Results</span>
            {quizActive && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-purple-600/20 border border-purple-500/30">
                <span className="live-dot w-1.5 h-1.5 rounded-full bg-purple-400" />
                <span className="text-[10px] font-semibold text-purple-400">
                  Q{currentQ + 1} of {QUIZ_QUESTIONS.length}
                </span>
              </div>
            )}
          </div>
          <span className="text-[11px] text-white/30 font-mono">{totalResponses} responses</span>
        </div>

        <div className="flex-1 p-6 flex items-center justify-center overflow-y-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'quiz' && quizActive ? (
              <motion.div
                key={`q-${currentQ}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full max-w-2xl"
              >
                <div className="text-center mb-8">
                  <div className="text-[11px] text-white/30 mb-2 uppercase tracking-widest">Question {currentQ + 1}</div>
                  <h3 className="text-xl font-semibold text-white/90 leading-snug">{q.question}</h3>
                </div>
                <div className="space-y-2.5">
                  {q.options.map((opt, i) => {
                    const pct       = totalResponses > 0 ? Math.round((responses[i] / totalResponses) * 100) : 0
                    const isCorrect = i === q.correctIndex
                    return (
                      <div key={i} className="relative overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.03]">
                        <motion.div
                          className={cn('absolute inset-y-0 left-0', isCorrect ? 'bg-emerald-600/25' : 'bg-white/[0.04]')}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6 }}
                        />
                        <div className="relative flex items-center justify-between px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <span className={cn(
                              'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold',
                              isCorrect ? 'bg-emerald-600/30 text-emerald-400' : 'bg-white/[0.06] text-white/40',
                            )}>
                              {String.fromCharCode(65 + i)}
                            </span>
                            <span className="text-sm text-white/80">{opt}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-mono text-white/40">{responses[i]}</span>
                            <span className={cn(
                              'text-sm font-bold w-10 text-right',
                              isCorrect ? 'text-emerald-400' : 'text-white/50',
                            )}>
                              {pct}%
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            ) : activeTab === 'polls' ? (
              <motion.div
                key="polls-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full max-w-xl"
              >
                {polls.filter(p => p.active).length > 0 ? (
                  polls.filter(p => p.active).map(poll => {
                    const total = poll.responses.reduce((a, b) => a + b, 0)
                    return (
                      <div key={poll.id}>
                        <h3 className="text-xl font-semibold text-white/90 text-center mb-6">{poll.question}</h3>
                        <div className="space-y-3">
                          {poll.options.map((opt, i) => {
                            const pct = total > 0 ? Math.round((poll.responses[i] / total) * 100) : 0
                            return (
                              <div key={i} className="relative overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.03]">
                                <motion.div
                                  className="absolute inset-y-0 left-0 bg-purple-600/20"
                                  animate={{ width: `${pct}%` }}
                                  transition={{ duration: 0.5 }}
                                />
                                <div className="relative flex items-center justify-between px-4 py-3.5">
                                  <span className="text-sm text-white/80">{opt}</span>
                                  <div className="flex items-center gap-3">
                                    <span className="text-sm font-mono text-white/40">{poll.responses[i]}</span>
                                    <span className="text-sm font-bold text-purple-400 w-10 text-right">{pct}%</span>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                        <div className="text-center mt-4 text-[11px] text-white/25">{total} total responses</div>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center text-white/20">
                    <BarChart3 size={40} className="mx-auto mb-3 opacity-25" />
                    <p className="text-sm">Launch a poll to see live results</p>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-white/15"
              >
                <Zap size={44} className="mx-auto mb-3 opacity-25" />
                <p className="text-sm">Start a quiz or launch a poll to see live results here</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Right: Leaderboard ────────────────────────────────────────────── */}
      <div className="w-60 shrink-0 border-l border-white/[0.05] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05]">
          <span className="text-[11px] font-semibold text-white/50 uppercase tracking-widest">Leaderboard</span>
          <Trophy size={13} className="text-yellow-400" />
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {leaderboard.map((entry, i) => (
            <motion.div
              key={entry.rank}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className={cn(
                'flex items-center gap-2.5 p-2.5 rounded-xl border',
                entry.rank === 1 ? 'bg-yellow-500/10 border-yellow-500/20' :
                entry.rank === 2 ? 'bg-gray-400/8  border-gray-400/15'  :
                entry.rank === 3 ? 'bg-orange-700/8 border-orange-600/15':
                'bg-white/[0.02] border-white/[0.05]',
              )}
            >
              <span className={cn(
                'text-sm font-black w-4 text-center',
                entry.rank === 1 ? 'text-yellow-400' :
                entry.rank === 2 ? 'text-gray-300'   :
                entry.rank === 3 ? 'text-orange-400'  : 'text-white/25',
              )}>
                {entry.rank}
              </span>
              <div className="w-7 h-7 rounded-full bg-purple-600/20 flex items-center justify-center text-[10px] font-bold text-purple-300">
                {entry.rank}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-white/70 truncate">{entry.name}</div>
                <div className="text-[10px] font-mono text-white/35">{entry.score.toLocaleString()} pts</div>
              </div>
            </motion.div>
          ))}

          {leaderboard.every(e => e.score === 0) && (
            <div className="text-center text-white/20 py-6">
              <Trophy size={28} className="mx-auto mb-2 opacity-25" />
              <p className="text-[11px]">Start a quiz to see rankings</p>
            </div>
          )}
        </div>

        {/* Participant count */}
        <div className="px-4 py-3 border-t border-white/[0.05]">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-white/30 flex items-center gap-1.5">
              <Users size={11} />
              Participants
            </span>
            <span className="font-mono text-white/55">{participantCount}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
