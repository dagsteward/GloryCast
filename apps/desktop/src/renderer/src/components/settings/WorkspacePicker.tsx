import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, Clapperboard, Sparkles, LayoutDashboard } from 'lucide-react'
import { WORKSPACE_ORDER, WORKSPACES, type WorkspaceId } from '../../config/workspaces'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import { cn } from '../../lib/utils'

const ICONS: Record<WorkspaceId, typeof Clapperboard> = {
  cinematic: Clapperboard,
  minimal:   Sparkles,
  command:   LayoutDashboard,
}

/** Swatches previewing each workspace's palette on the chooser cards. */
const SWATCHES: Record<WorkspaceId, string[]> = {
  cinematic: ['#0a0a12', '#7c3aed', '#f97316'],
  minimal:   ['#ffffff', '#7c3aed', '#e5e7eb'],
  command:   ['#0d1117', '#14b8a6', '#06b6d4'],
}

/**
 * Workspace chooser.
 *
 * Switching is immediate and consequential — it changes the layout, the palette
 * and which features exist — so the card states plainly what each one is for
 * and navigates to that workspace's home on selection, rather than leaving the
 * user on a route the new workspace doesn't have.
 */
export function WorkspacePicker() {
  const navigate = useNavigate()
  const workspaceId  = useWorkspaceStore(s => s.workspaceId)
  const setWorkspace = useWorkspaceStore(s => s.setWorkspace)

  const choose = (id: WorkspaceId) => {
    if (id === workspaceId) return
    setWorkspace(id)
    navigate(WORKSPACES[id].homePath)
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {WORKSPACE_ORDER.map((id) => {
        const ws = WORKSPACES[id]
        const Icon = ICONS[id]
        const active = id === workspaceId

        return (
          <motion.button
            key={id}
            onClick={() => choose(id)}
            whileHover={{ y: -2 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={cn(
              'relative text-left rounded-xl p-4 border transition-colors',
              active
                ? 'border-purple-500/50 bg-purple-500/[0.07]'
                : 'border-white/[0.07] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]',
            )}
          >
            {active && (
              <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center">
                <Check size={12} className="text-white" strokeWidth={3} />
              </span>
            )}

            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center">
                <Icon size={16} className="text-purple-400" />
              </div>
              <div className="flex gap-1">
                {SWATCHES[id].map((c) => (
                  <span
                    key={c}
                    className="w-3.5 h-3.5 rounded-full border border-white/15"
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>

            <h4 className="text-[13.5px] font-semibold text-white/90">{ws.name}</h4>
            <p className="mt-1 text-[11.5px] leading-relaxed text-white/45">
              {ws.description}
            </p>

            <ul className="mt-3 space-y-1">
              {ws.highlights.map((h) => (
                <li key={h} className="flex items-center gap-1.5 text-[11px] text-white/55">
                  <Check size={11} className="text-purple-400/70 shrink-0" />
                  {h}
                </li>
              ))}
            </ul>
          </motion.button>
        )
      })}
    </div>
  )
}
