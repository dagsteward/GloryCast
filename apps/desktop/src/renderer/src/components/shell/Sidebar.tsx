import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, MonitorPlay, Video, Users, MessageSquare,
  Sparkles, BookOpen, BarChart3, Settings, Bot, Radio,
} from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import { cn } from '../../lib/utils'

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard',    path: '/',            group: 'main'   },
  { icon: MonitorPlay,     label: 'Presentation', path: '/presentation',group: 'main'   },
  { icon: Video,           label: 'Production',   path: '/production',  group: 'main'   },
  { icon: Radio,           label: 'Webinar',      path: '/webinar',     group: 'main'   },
  { icon: MessageSquare,   label: 'Engagement',   path: '/engagement',  group: 'engage' },
  { icon: BookOpen,        label: 'Bible',        path: '/bible',       group: 'engage' },
  { icon: Sparkles,        label: 'AI Studio',    path: '/ai-studio',   group: 'ai'     },
  { icon: BarChart3,       label: 'Analytics',    path: '/analytics',   group: 'ai'     },
  { icon: Settings,        label: 'Settings',     path: '/settings',    group: 'system' },
]

export function Sidebar() {
  const location   = useLocation()
  const { toggleAiPanel, aiPanelOpen, isStreaming, church } = useAppStore()

  const groups = ['main', 'engage', 'ai', 'system']

  return (
    <aside className="w-14 shrink-0 flex flex-col bg-chrome border-r border-white/[0.05] py-2">

      {/* Church logo */}
      <div className="px-2 mb-2 pb-2 border-b border-white/[0.05]">
        <div
          title={church.name}
          className="w-10 h-10 mx-auto rounded-xl bg-gradient-to-br from-purple-600 to-orange-500 flex items-center justify-center shadow-lg shadow-purple-900/30 cursor-default"
        >
          <span className="text-sm font-black text-white">
            {church.name.charAt(0)}
          </span>
        </div>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 flex flex-col gap-0.5 px-2 overflow-hidden">
        {groups.map((group, gi) => {
          const items = NAV_ITEMS.filter(n => n.group === group)
          return (
            <div key={group}>
              {gi > 0 && <div className="my-1.5 mx-1 h-px bg-white/[0.05]" />}
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
                      'relative flex items-center justify-center w-10 h-10 rounded-xl',
                      'transition-all duration-150 group',
                      active
                        ? 'text-purple-400'
                        : 'text-white/30 hover:text-white/65 hover:bg-white/[0.05]',
                    )}
                  >
                    {active && (
                      <motion.div
                        layoutId="nav-active"
                        className="absolute inset-0 rounded-xl bg-purple-600/20 border border-purple-500/30"
                        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                      />
                    )}
                    <Icon size={16} className="relative z-10" />

                    {/* Tooltip */}
                    <div className="pointer-events-none absolute left-full ml-2 px-2.5 py-1.5 rounded-lg bg-[#1a1a2e] border border-white/10 text-[11px] text-white/80 font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-xl">
                      {label}
                    </div>
                  </NavLink>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* Bottom controls */}
      <div className="px-2 flex flex-col gap-1">
        <div className="mx-1 h-px bg-white/[0.05] mb-1" />

        {/* AI assistant */}
        <button
          onClick={toggleAiPanel}
          title="AI Assistant"
          className={cn(
            'relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-150 group',
            aiPanelOpen
              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
              : 'text-white/30 hover:text-white/65 hover:bg-white/[0.05]',
          )}
        >
          <Bot size={16} />
          {aiPanelOpen && (
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-orange-400" />
          )}
          <div className="pointer-events-none absolute left-full ml-2 px-2.5 py-1.5 rounded-lg bg-[#1a1a2e] border border-white/10 text-[11px] text-white/80 font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-xl">
            AI Assistant
          </div>
        </button>

        {/* Live indicator dot */}
        <div className="flex items-center justify-center w-10 h-6">
          <div className={cn(
            'w-2 h-2 rounded-full transition-all',
            isStreaming ? 'bg-red-500 live-dot' : 'bg-white/10',
          )} />
        </div>
      </div>
    </aside>
  )
}
