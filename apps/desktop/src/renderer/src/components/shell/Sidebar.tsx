import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, MonitorPlay, Video, Users, MessageSquare,
  Sparkles, BookOpen, BarChart3, Settings, Bot, Radio,
  Mic2, Layers
} from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import { cn } from '../../lib/utils'

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/', group: 'main' },
  { icon: MonitorPlay, label: 'Presentation', path: '/presentation', group: 'main' },
  { icon: Video, label: 'Production', path: '/production', group: 'main' },
  { icon: Radio, label: 'Webinar', path: '/webinar', group: 'main' },
  { icon: MessageSquare, label: 'Engagement', path: '/engagement', group: 'engage' },
  { icon: BookOpen, label: 'Bible', path: '/bible', group: 'engage' },
  { icon: Sparkles, label: 'AI Studio', path: '/ai-studio', group: 'ai' },
  { icon: BarChart3, label: 'Analytics', path: '/analytics', group: 'ai' },
  { icon: Settings, label: 'Settings', path: '/settings', group: 'system' },
]

const GROUP_LABELS: Record<string, string> = {
  main: 'Production',
  engage: 'Audience',
  ai: 'Intelligence',
  system: 'System',
}

export function Sidebar() {
  const location = useLocation()
  const { toggleAiPanel, aiPanelOpen, isStreaming } = useAppStore()

  const groups = ['main', 'engage', 'ai', 'system']

  return (
    <aside className="w-14 shrink-0 flex flex-col bg-[#0a0a10] border-r border-white/[0.05] py-3">
      {/* Nav groups */}
      <nav className="flex-1 flex flex-col gap-1 px-2">
        {groups.map((group, gi) => {
          const items = NAV_ITEMS.filter(n => n.group === group)
          return (
            <div key={group}>
              {gi > 0 && (
                <div className="my-2 mx-1 h-px bg-white/[0.05]" />
              )}
              {items.map(({ icon: Icon, label, path }) => {
                const active = path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(path)

                return (
                  <NavLink
                    key={path}
                    to={path}
                    title={label}
                    className={cn(
                      'relative flex items-center justify-center w-10 h-10 rounded-lg',
                      'transition-all duration-150 group',
                      active
                        ? 'bg-purple-600/20 text-purple-400'
                        : 'text-white/35 hover:text-white/70 hover:bg-white/[0.05]',
                    )}
                  >
                    {active && (
                      <motion.div
                        layoutId="nav-active"
                        className="absolute inset-0 rounded-lg bg-purple-600/20 border border-purple-500/30 glow-purple"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                    <Icon size={16} className="relative z-10" />

                    {/* Tooltip */}
                    <div className="absolute left-full ml-2 px-2 py-1 rounded-md bg-[#1e1e30] border border-white/10 text-[11px] text-white/80 font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl">
                      {label}
                    </div>
                  </NavLink>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* Bottom: AI assistant toggle */}
      <div className="px-2 flex flex-col gap-1">
        <div className="mx-1 h-px bg-white/[0.05] mb-2" />
        <button
          onClick={toggleAiPanel}
          title="AI Assistant"
          className={cn(
            'relative flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-150 group',
            aiPanelOpen
              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
              : 'text-white/35 hover:text-white/70 hover:bg-white/[0.05]',
          )}
        >
          <Bot size={16} />
          {aiPanelOpen && (
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-orange-400" />
          )}
          <div className="absolute left-full ml-2 px-2 py-1 rounded-md bg-[#1e1e30] border border-white/10 text-[11px] text-white/80 font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl">
            AI Assistant
          </div>
        </button>

        {/* Stream status dot */}
        <div className="flex items-center justify-center w-10 h-6">
          <div className={cn(
            'w-2 h-2 rounded-full transition-colors',
            isStreaming ? 'bg-red-500 live-dot' : 'bg-white/15',
          )} />
        </div>
      </div>
    </aside>
  )
}
