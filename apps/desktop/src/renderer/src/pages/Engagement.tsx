import { useState } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Users, MessageSquare, Zap, Plus, Play, BarChart3 } from 'lucide-react'
import { cn } from '../lib/utils'

interface QuizQuestion {
  id: string
  question: string
  options: string[]
  correctIndex: number
  points: number
}

interface LeaderboardEntry {
  rank: number
  name: string
  score: number
  avatar: string
}

const DEMO_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, name: 'Sarah M.', score: 2850, avatar: 'S' },
  { rank: 2, name: 'John D.', score: 2640, avatar: 'J' },
  { rank: 3, name: 'Mary K.', score: 2100, avatar: 'M' },
  { rank: 4, name: 'Pastor James', score: 1980, avatar: 'P' },
  { rank: 5, name: 'Grace L.', score: 1750, avatar: 'G' },
]

const DEMO_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    question: 'What book did we study last Sunday?',
    options: ['Psalms', 'Romans', 'Philippians', 'Hebrews'],
    correctIndex: 1,
    points: 100,
  },
  {
    id: 'q2',
    question: 'Complete: "And we know that in all things God works for..."',
    options: ['our happiness', 'the good of those who love him', 'the church', 'His glory alone'],
    correctIndex: 1,
    points: 200,
  },
]

export function EngagementPage() {
  const [activeTab, setActiveTab] = useState<'quiz' | 'polling' | 'chat' | 'attendance'>('quiz')
  const [quizActive, setQuizActive] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [responses, setResponses] = useState<number[]>([0, 0, 0, 0])

  const simulateResponse = (optionIndex: number) => {
    setResponses(prev => {
      const next = [...prev]
      next[optionIndex] += Math.floor(Math.random() * 15 + 5)
      return next
    })
  }

  const totalResponses = responses.reduce((a, b) => a + b, 0)

  return (
    <div className="h-full flex overflow-hidden">
      {/* Left: Controls */}
      <div className="w-72 shrink-0 flex flex-col border-r border-white/[0.05] bg-[#0a0a12]">
        {/* Tab selector */}
        <div className="flex border-b border-white/[0.05]">
          {(['quiz', 'polling', 'chat', 'attendance'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'flex-1 py-2.5 text-[10px] font-medium uppercase tracking-wider capitalize transition-colors',
                activeTab === tab
                  ? 'text-purple-400 border-b-2 border-purple-500'
                  : 'text-white/30 hover:text-white/60',
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex-1 p-3 overflow-y-auto">
          {activeTab === 'quiz' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-white/50 font-medium">Bible Quiz</span>
                <button
                  onClick={() => setQuizActive(v => !v)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-medium transition-colors',
                    quizActive
                      ? 'bg-red-600/20 text-red-400 border border-red-500/30'
                      : 'bg-purple-600/20 text-purple-400 border border-purple-500/30',
                  )}
                >
                  {quizActive ? 'End Quiz' : <><Play size={11} />Start Quiz</>}
                </button>
              </div>

              {DEMO_QUESTIONS.map((q, i) => (
                <div key={q.id} className={cn(
                  'p-3 rounded-xl border transition-all',
                  i === currentQuestion && quizActive
                    ? 'border-purple-500/40 bg-purple-600/10'
                    : 'border-white/[0.06] bg-white/[0.02]',
                )}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-white/40">Q{i + 1} · {q.points}pts</span>
                    {i === currentQuestion && quizActive && (
                      <span className="text-[10px] text-purple-400 font-medium">Active</span>
                    )}
                  </div>
                  <p className="text-xs text-white/70 leading-relaxed">{q.question}</p>
                  <div className="mt-2 space-y-1">
                    {q.options.map((opt, oi) => (
                      <button
                        key={oi}
                        onClick={() => simulateResponse(oi)}
                        className={cn(
                          'w-full text-left px-2 py-1.5 rounded-lg text-[11px] transition-colors',
                          oi === q.correctIndex
                            ? 'bg-emerald-600/15 text-emerald-400 border border-emerald-500/25'
                            : 'bg-white/[0.03] text-white/50 border border-white/[0.06] hover:bg-white/[0.06]',
                        )}
                      >
                        {String.fromCharCode(65 + oi)}. {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'polling' && (
            <div className="space-y-3">
              <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-white/15 text-xs text-white/40 hover:text-white/70 hover:border-white/30 transition-colors">
                <Plus size={13} />
                New Poll
              </button>
              <PollCard
                question="What topic should we study next month?"
                options={['Prayer & Fasting', 'Spiritual Gifts', 'The Psalms', 'Revelation']}
                responses={[42, 28, 18, 12]}
              />
            </div>
          )}
        </div>
      </div>

      {/* Center: Live results */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.05] bg-[#09090f]">
          <span className="text-xs font-semibold text-white/60">Live Results</span>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-white/40 font-mono">{totalResponses} responses</span>
          </div>
        </div>

        <div className="flex-1 p-6 flex items-center justify-center">
          {quizActive ? (
            <div className="w-full max-w-2xl">
              <h3 className="text-xl font-semibold text-white/90 mb-8 text-center">
                {DEMO_QUESTIONS[currentQuestion]?.question}
              </h3>
              <div className="space-y-3">
                {DEMO_QUESTIONS[currentQuestion]?.options.map((opt, i) => {
                  const pct = totalResponses > 0 ? Math.round((responses[i] / totalResponses) * 100) : 0
                  const isCorrect = i === DEMO_QUESTIONS[currentQuestion].correctIndex
                  return (
                    <div key={i} className="relative overflow-hidden rounded-xl bg-white/[0.04] border border-white/[0.08]">
                      <motion.div
                        className={cn('absolute inset-y-0 left-0', isCorrect ? 'bg-emerald-600/30' : 'bg-white/[0.05]')}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.5 }}
                      />
                      <div className="relative flex items-center justify-between px-4 py-3">
                        <span className="text-sm text-white/80">{String.fromCharCode(65 + i)}. {opt}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-mono text-white/50">{responses[i]}</span>
                          <span className={cn('text-sm font-bold', isCorrect ? 'text-emerald-400' : 'text-white/60')}>
                            {pct}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="text-center text-white/20">
              <Zap size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Start a quiz or poll to see live results</p>
            </div>
          )}
        </div>
      </div>

      {/* Right: Leaderboard */}
      <div className="w-64 shrink-0 border-l border-white/[0.05] flex flex-col">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.05]">
          <span className="text-[11px] font-semibold text-white/60 uppercase tracking-widest">Leaderboard</span>
          <Trophy size={13} className="text-yellow-400" />
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {DEMO_LEADERBOARD.map((entry, i) => (
            <motion.div
              key={entry.rank}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className={cn(
                'flex items-center gap-3 p-2.5 rounded-xl mb-1.5 transition-colors',
                entry.rank === 1 ? 'bg-yellow-500/10 border border-yellow-500/20' :
                entry.rank === 2 ? 'bg-gray-400/10 border border-gray-400/15' :
                entry.rank === 3 ? 'bg-orange-700/10 border border-orange-600/15' :
                'bg-white/[0.02] border border-white/[0.05]',
              )}
            >
              <span className={cn(
                'text-sm font-black w-5 text-center',
                entry.rank === 1 ? 'text-yellow-400' :
                entry.rank === 2 ? 'text-gray-300' :
                entry.rank === 3 ? 'text-orange-400' : 'text-white/30',
              )}>
                {entry.rank}
              </span>
              <div className="w-8 h-8 rounded-full bg-purple-600/25 flex items-center justify-center text-xs font-bold text-purple-300">
                {entry.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-white/80 truncate">{entry.name}</div>
                <div className="text-[10px] font-mono text-white/40">{entry.score.toLocaleString()} pts</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

function PollCard({ question, options, responses }: {
  question: string; options: string[]; responses: number[]
}) {
  const total = responses.reduce((a, b) => a + b, 0)
  return (
    <div className="p-3 rounded-xl border border-white/[0.08] bg-white/[0.02]">
      <p className="text-xs text-white/70 mb-2 font-medium">{question}</p>
      {options.map((opt, i) => {
        const pct = total > 0 ? Math.round((responses[i] / total) * 100) : 0
        return (
          <div key={i} className="mb-1.5">
            <div className="flex justify-between text-[10px] text-white/50 mb-0.5">
              <span>{opt}</span><span>{pct}%</span>
            </div>
            <div className="h-1 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-purple-500 rounded-full" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      })}
      <div className="text-[9px] text-white/25 mt-1.5 font-mono">{total} responses</div>
    </div>
  )
}
