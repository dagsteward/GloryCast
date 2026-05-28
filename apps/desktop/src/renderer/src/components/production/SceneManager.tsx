import { useState } from 'react'
import { Plus, GripVertical, Eye, Edit2 } from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import { cn } from '../../lib/utils'

const SCENES = [
  { id: 'pre-service', name: 'Pre-Service', sources: ['Media Loop', 'Lower Third', 'Music'] },
  { id: 'worship', name: 'Main Worship', sources: ['CAM 1', 'CAM 2', 'Audio Mix'] },
  { id: 'sermon', name: 'Sermon', sources: ['CAM 1 — Wide', 'Slides', 'Lower Third'] },
  { id: 'altar-call', name: 'Altar Call', sources: ['CAM 3', 'Music', 'Prayer Overlay'] },
  { id: 'offering', name: 'Offering', sources: ['Slides', 'Music'] },
  { id: 'announcements', name: 'Announcements', sources: ['Slides', 'CAM 1'] },
]

export function SceneManager() {
  const { currentScene, setCurrentScene } = useAppStore()
  const [scenes, setScenes] = useState(SCENES)

  return (
    <div className="h-full p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white/70">Scene Collection</h3>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-white/15 text-xs text-white/40 hover:text-white/70 hover:border-white/30 transition-colors">
          <Plus size={12} />
          New Scene
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {scenes.map(scene => (
          <div
            key={scene.id}
            onClick={() => setCurrentScene(scene.name)}
            className={cn(
              'relative rounded-xl border p-3 cursor-pointer transition-all group',
              currentScene === scene.name
                ? 'border-purple-500/50 bg-purple-600/15'
                : 'border-white/[0.07] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]',
            )}
          >
            {/* Scene preview thumbnail */}
            <div className="aspect-video rounded-lg bg-black mb-2 overflow-hidden flex items-center justify-center">
              <div className="text-center">
                <div className="text-xs text-white/20">{scene.name}</div>
              </div>
            </div>

            <div className="text-xs font-semibold text-white/80 mb-1">{scene.name}</div>
            <div className="flex flex-wrap gap-1">
              {scene.sources.map(s => (
                <span key={s} className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] text-white/40">{s}</span>
              ))}
            </div>

            {currentScene === scene.name && (
              <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-purple-600 rounded text-[8px] font-bold text-white">
                ACTIVE
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
