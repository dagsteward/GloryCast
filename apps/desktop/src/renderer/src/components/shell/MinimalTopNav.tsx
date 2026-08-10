import { NavLink } from 'react-router-dom'
import { Search, Crown } from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import { useWorkspace } from '../../stores/workspaceStore'
import { cn } from '../../lib/utils'

/**
 * Navigation for the Minimal AI Workspace.
 *
 * Deliberately quiet: one slim horizontal bar, no live vitals, no scene rail,
 * no status footer. A volunteer opening this on a Sunday morning should see the
 * slide and the AI panel, not an aircraft cockpit.
 */
export function MinimalTopNav() {
  const workspace       = useWorkspace()
  const userDisplayName = useAppStore(s => s.userDisplayName)

  return (
    <header className="drag-region flex items-center gap-6 h-[54px] px-5 bg-chrome border-b border-white/[0.06] shrink-0">

      <div className="flex items-center gap-2.5 shrink-0">
        <div className="w-[26px] h-[26px] rounded-lg bg-gradient-to-br from-[#a855f7] to-[#7c3aed] flex items-center justify-center">
          <Crown size={14} className="text-white" strokeWidth={2.5} />
        </div>
        <span className="text-[14.5px] font-bold tracking-tight text-white/90">GloryCast OS</span>
      </div>

      <nav className="no-drag flex items-center gap-1 flex-1 min-w-0 overflow-x-auto">
        {workspace.nav.map(({ label, path }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) => cn(
              'px-3 h-8 flex items-center rounded-lg text-[12.5px] font-medium whitespace-nowrap transition-colors',
              isActive
                ? 'text-white/95 bg-white/[0.07]'
                : 'text-white/45 hover:text-white/80 hover:bg-white/[0.04]',
            )}
          >
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="no-drag flex items-center gap-2 shrink-0">
        <button
          title="Search"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white/45 hover:text-white hover:bg-white/[0.06] transition-colors"
        >
          <Search size={16} />
        </button>
        <div className="w-[30px] h-[30px] rounded-full bg-gradient-to-br from-[#a855f7] to-[#f97316] flex items-center justify-center text-[11px] font-bold text-white">
          {userDisplayName.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  )
}
