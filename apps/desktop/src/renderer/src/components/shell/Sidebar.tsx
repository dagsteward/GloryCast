import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronRight, Plus, Crown } from 'lucide-react'
import { useSceneStore } from '../../stores/sceneStore'
import { useWorkspace, useFeature } from '../../stores/workspaceStore'
import { cn } from '../../lib/utils'

export function Sidebar() {
  const location = useLocation()
  const workspace = useWorkspace()
  // Scenes are a switcher concept; a workspace without a switcher has no use
  // for a scene rail and shouldn't surface one.
  const showScenes = useFeature('advanced-switcher')

  const scenes        = useSceneStore(s => s.scenes)
  const activeSceneId = useSceneStore(s => s.activeSceneId)
  const setActiveScene= useSceneStore(s => s.setActiveScene)
  const addScene      = useSceneStore(s => s.addScene)

  return (
    <aside className="w-[212px] shrink-0 flex flex-col bg-chrome border-r border-white/[0.06]">

      {/* ── Brand ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 px-3.5 h-[58px] shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#a855f7] via-[#7c3aed] to-[#f97316] flex items-center justify-center shadow-lg shadow-purple-900/40">
          <Crown size={16} className="text-white" strokeWidth={2.5} />
        </div>
        <div className="min-w-0 leading-none">
          <div className="text-[15px] font-bold text-white tracking-tight">GloryCast OS</div>
          <div className="text-[8.5px] font-semibold text-purple-400/70 tracking-[0.16em] mt-1 truncate">
            {workspace.name.toUpperCase()}
          </div>
        </div>
      </div>

      {/* ── Primary navigation ────────────────────────────────────────────── */}
      <nav className="px-2.5 pb-2 flex flex-col gap-[3px] overflow-y-auto">
        {workspace.nav.map(({ icon: Icon, label, path }) => {
          const active = location.pathname.startsWith(path)
          return (
            <NavLink
              key={path}
              to={path}
              className={cn(
                'relative flex items-center gap-2.5 h-[30px] px-2.5 rounded-lg group',
                'transition-colors duration-150',
                active ? 'text-white' : 'text-white/45 hover:text-white/80 hover:bg-white/[0.04]',
              )}
            >
              {active && (
                <motion.div
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-lg bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] shadow-lg shadow-purple-900/40"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <Icon size={14} className="relative z-10 shrink-0" strokeWidth={2} />
              <span className="relative z-10 text-[12px] font-medium truncate">{label}</span>
              {active && <ChevronRight size={12} className="relative z-10 ml-auto shrink-0 opacity-80" />}
            </NavLink>
          )
        })}
      </nav>

      {!showScenes && <div className="flex-1" />}

      {/* ── Scene rail ────────────────────────────────────────────────────── */}
      {showScenes && <>
      <div className="mt-1 mx-2.5 border-t border-white/[0.06]" />

      <div className="flex items-center justify-between px-3.5 pt-3 pb-1.5 shrink-0">
        <span className="text-[9.5px] font-bold text-white/35 tracking-[0.14em]">SCENES</span>
        <button
          onClick={() => addScene()}
          title="Add scene"
          className="w-[18px] h-[18px] rounded-md flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors"
        >
          <Plus size={12} />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-2.5 pb-3 flex flex-col gap-[3px]">
        {scenes.map((scene, i) => {
          const active = scene.id === activeSceneId
          return (
            <button
              key={scene.id}
              onClick={() => setActiveScene(scene.id)}
              className={cn(
                'group flex items-center gap-2 h-[27px] px-2 rounded-lg text-left transition-colors',
                active
                  ? 'bg-[#7c3aed] text-white shadow-md shadow-purple-900/30'
                  : 'text-white/45 hover:text-white/85 hover:bg-white/[0.04]',
              )}
            >
              <span className={cn(
                'w-3.5 shrink-0 text-[10px] font-mono tabular-nums',
                active ? 'text-white/70' : 'text-white/25',
              )}>
                {i + 1}
              </span>
              <span className="flex-1 truncate text-[11.5px] font-medium">{scene.name}</span>
              <ChevronRight
                size={11}
                className={cn('shrink-0', active ? 'opacity-80' : 'opacity-0 group-hover:opacity-40')}
              />
            </button>
          )
        })}
      </div>
      </>}
    </aside>
  )
}
