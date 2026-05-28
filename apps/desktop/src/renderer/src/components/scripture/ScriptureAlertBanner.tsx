import { motion } from 'framer-motion'
import { BookOpen, X, Send, Zap } from 'lucide-react'
import { useAppStore } from '../../stores/appStore'

export function ScriptureAlertBanner({ scripture }: { scripture: string }) {
  const { setCurrentDetectedScripture } = useAppStore()

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="flex items-center gap-3 p-3 rounded-xl bg-purple-600/15 border border-purple-500/30 glow-purple"
    >
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-purple-600/30 flex items-center justify-center">
          <Zap size={13} className="text-purple-400" />
        </div>
        <div>
          <div className="text-[10px] text-purple-400 font-semibold uppercase tracking-widest">
            AI Detected Scripture
          </div>
          <div className="text-sm font-bold text-white/90">{scripture}</div>
        </div>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-colors">
          <Send size={11} />
          Display Now
        </button>
        <button
          onClick={() => setCurrentDetectedScripture(null)}
          className="w-7 h-7 rounded-lg hover:bg-white/10 text-white/40 hover:text-white flex items-center justify-center transition-colors"
        >
          <X size={13} />
        </button>
      </div>
    </motion.div>
  )
}
