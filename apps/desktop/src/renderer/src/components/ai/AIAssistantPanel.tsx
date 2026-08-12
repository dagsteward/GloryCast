import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Bot, Sparkles, BookOpen, FileText, Mic2, Zap, RotateCcw } from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import { cn } from '../../lib/utils'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  type?: 'scripture' | 'sermon' | 'content' | 'help'
}

const QUICK_ACTIONS = [
  { icon: BookOpen, label: 'Find Scripture', prompt: 'Find scriptures about hope and faith', color: 'text-purple-400' },
  { icon: FileText, label: 'Sermon Summary', prompt: 'Summarize the sermon transcript', color: 'text-blue-400' },
  { icon: Sparkles, label: 'Social Post', prompt: 'Create a social media post from today\'s sermon', color: 'text-orange-400' },
  { icon: Zap, label: 'Prayer Points', prompt: 'Extract prayer points from the sermon', color: 'text-emerald-400' },
]

export function AIAssistantPanel() {
  const { toggleAiPanel } = useAppStore()
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES)
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (content: string) => {
    if (!content.trim()) return

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    // Simulate AI response
    await new Promise(r => setTimeout(r, 1200))

    const response = generateMockResponse(content)
    const assistantMsg: Message = {
      id: `msg-${Date.now() + 1}`,
      role: 'assistant',
      content: response,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, assistantMsg])
    setIsTyping(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <motion.div
      initial={{ x: 320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 320, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="w-80 shrink-0 flex flex-col border-l border-white/[0.06] bg-chrome"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center">
            <Bot size={14} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white/90">GloryCast AI</div>
            <div className="text-[10px] text-orange-400">Worship Intelligence</div>
          </div>
        </div>
        <button
          onClick={toggleAiPanel}
          className="w-6 h-6 rounded-md flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Quick actions */}
      <div className="p-3 border-b border-white/[0.05]">
        <div className="grid grid-cols-2 gap-1.5">
          {QUICK_ACTIONS.map(({ icon: Icon, label, prompt, color }) => (
            <button
              key={label}
              onClick={() => sendMessage(prompt)}
              className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/10 transition-all text-left"
            >
              <Icon size={12} className={color} />
              <span className="text-[11px] text-white/60">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <AnimatePresence>
          {messages.map(msg => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              {msg.role === 'assistant' && (
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center mr-2 mt-0.5 shrink-0">
                  <Bot size={11} className="text-white" />
                </div>
              )}
              <div className={cn(
                'max-w-[85%] rounded-xl p-3 text-xs leading-relaxed',
                msg.role === 'user'
                  ? 'bg-purple-600/25 border border-purple-500/30 text-white/85'
                  : 'bg-white/[0.04] border border-white/[0.07] text-white/75',
              )}>
                {msg.content}
                <div className="text-[9px] text-white/25 mt-1.5 font-mono">
                  {formatTime(msg.timestamp)}
                </div>
              </div>
            </motion.div>
          ))}

          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2"
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center shrink-0">
                <Bot size={11} className="text-white" />
              </div>
              <div className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.07]">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    animate={{ y: [-2, 2, -2] }}
                    transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
                    className="w-1.5 h-1.5 rounded-full bg-orange-400"
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/[0.06]">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask GloryCast AI..."
              rows={1}
              className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white/80 placeholder:text-white/25 outline-none focus:border-orange-500/40 resize-none transition-colors"
              style={{ minHeight: '36px', maxHeight: '120px' }}
              onInput={e => {
                const el = e.currentTarget
                el.style.height = 'auto'
                el.style.height = `${el.scrollHeight}px`
              }}
            />
          </div>
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isTyping}
            className="w-9 h-9 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors shrink-0"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function generateMockResponse(input: string): string {
  const lower = input.toLowerCase()
  if (lower.includes('scripture') || lower.includes('verse') || lower.includes('bible')) {
    return 'I found several relevant scriptures:\n\n**Romans 8:28** — "And we know that in all things God works for the good of those who love him..."\n\n**Jeremiah 29:11** — "For I know the plans I have for you, declares the Lord, plans to prosper you..."\n\nWould you like me to display any of these on the presentation?'
  }
  if (lower.includes('sermon') || lower.includes('summary')) {
    return "Here's a summary of today's sermon:\n\n**Theme:** God's Faithfulness in All Seasons\n\n**Key Points:**\n1. God's promises remain constant\n2. Faith is strengthened through trials\n3. Community supports individual growth\n\n**Memory Verse:** Romans 8:28"
  }
  if (lower.includes('social') || lower.includes('post')) {
    return '📖 Today\'s message reminded us that God works ALL things for good. Even in the difficult seasons, His faithfulness never fails. What a powerful reminder! 🙏\n\n#Faith #GodIsGood #SundayService #ChurchOnline'
  }
  if (lower.includes('prayer')) {
    return '**Prayer Points from Today\'s Message:**\n\n1. Pray for trust in God during uncertain times\n2. Intercede for those facing trials in our congregation\n3. Thank God for His faithfulness in the past year\n4. Pray for unity within the church family\n5. Ask for boldness to share the Gospel this week'
  }
  return "I'm your GloryCast AI assistant. I can help you find scriptures, summarize sermons, create content, manage your service, and much more. What would you like help with today?"
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: 'welcome',
    role: 'assistant',
    content: "Hello! I'm GloryCast AI. I'm ready to help with scripture detection, content creation, and production assistance. How can I serve you today?",
    timestamp: new Date(),
  },
]
