import { motion } from 'framer-motion'
import { ChevronRight, type LucideIcon } from 'lucide-react'
import { cn } from '../../lib/utils'

interface QuickStartCardProps {
  icon: LucideIcon
  label: string
  description: string
  color: 'purple' | 'orange' | 'blue' | 'emerald'
  onClick: () => void
  badge?: string
}

const COLOR_MAP = {
  purple: {
    icon: 'text-purple-400',
    bg: 'bg-purple-600/10 border-purple-500/20 hover:border-purple-500/40 hover:bg-purple-600/15',
    badge: 'bg-purple-600 text-white',
  },
  orange: {
    icon: 'text-orange-400',
    bg: 'bg-orange-600/10 border-orange-500/20 hover:border-orange-500/40 hover:bg-orange-600/15',
    badge: 'bg-orange-600 text-white',
  },
  blue: {
    icon: 'text-blue-400',
    bg: 'bg-blue-600/10 border-blue-500/20 hover:border-blue-500/40 hover:bg-blue-600/15',
    badge: 'bg-blue-600 text-white',
  },
  emerald: {
    icon: 'text-emerald-400',
    bg: 'bg-emerald-600/10 border-emerald-500/20 hover:border-emerald-500/40 hover:bg-emerald-600/15',
    badge: 'bg-emerald-600 text-white',
  },
}

export function QuickStartCard({ icon: Icon, label, description, color, onClick, badge }: QuickStartCardProps) {
  const colors = COLOR_MAP[color]

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'relative flex items-center gap-3 p-4 rounded-xl border text-left transition-all',
        colors.bg,
      )}
    >
      <div className={cn('w-9 h-9 rounded-lg bg-current/10 flex items-center justify-center', colors.icon)}>
        <Icon size={18} className={colors.icon} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-white/85">{label}</div>
        <div className="text-[11px] text-white/40 mt-0.5">{description}</div>
      </div>

      <div className="flex flex-col items-end gap-1.5">
        {badge && (
          <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded uppercase', colors.badge)}>
            {badge}
          </span>
        )}
        <ChevronRight size={14} className="text-white/20" />
      </div>
    </motion.button>
  )
}
