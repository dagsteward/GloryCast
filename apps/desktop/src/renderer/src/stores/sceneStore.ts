import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

// ─────────────────────────────────────────────────────────────────────────────
// sceneStore — the ordered run-of-service the operator works through.
//
// A "scene" here is the service-plan sense of the word (Worship Intro, Sermon,
// Closing) and it is what the sidebar lists. Each one will eventually own a
// compositor layer stack; for now it carries identity and ordering so the shell
// and the switcher agree on what is on air.
// ─────────────────────────────────────────────────────────────────────────────

export interface ServiceScene {
  id: string
  name: string
  /** Populated once the scene is bound to a compositor layer stack. */
  layerCount: number
  /** Marks the scene the operator has flagged as next in the run sheet. */
  isNext: boolean
}

interface SceneState {
  scenes: ServiceScene[]
  /** Scene currently on program output. */
  activeSceneId: string | null

  setActiveScene: (id: string) => void
  addScene: (name?: string) => void
  renameScene: (id: string, name: string) => void
  removeScene: (id: string) => void
  reorderScene: (id: string, toIndex: number) => void
  /** Advance to the next scene in the run sheet — bound to a hotkey. */
  advance: () => void
}

const uid = () => `scene-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`

/**
 * A fresh install opens on a conventional Sunday run sheet rather than an empty
 * list — a new operator should see the shape of the tool immediately. These are
 * ordinary editable scenes, not demo data.
 */
const DEFAULT_SCENES: ServiceScene[] = [
  'Worship Intro',
  'Praise & Worship',
  'Scripture Reading',
  'Sermon',
  'Prayer',
  'Offering',
  'Announcements',
  'Closing',
].map((name, i) => ({
  id: `scene-default-${i + 1}`,
  name,
  layerCount: 0,
  isNext: false,
}))

export const useSceneStore = create<SceneState>()(
  devtools(
    persist(
      (set, get) => ({
        scenes: DEFAULT_SCENES,
        activeSceneId: DEFAULT_SCENES[0].id,

        setActiveScene: (id) => set({ activeSceneId: id }, false, 'setActiveScene'),

        addScene: (name) => set((s) => {
          const scene: ServiceScene = {
            id: uid(),
            name: name?.trim() || `Scene ${s.scenes.length + 1}`,
            layerCount: 0,
            isNext: false,
          }
          return { scenes: [...s.scenes, scene] }
        }, false, 'addScene'),

        renameScene: (id, name) => set((s) => ({
          scenes: s.scenes.map(sc => sc.id === id ? { ...sc, name } : sc),
        }), false, 'renameScene'),

        removeScene: (id) => set((s) => {
          const scenes = s.scenes.filter(sc => sc.id !== id)
          // Never leave the switcher pointing at a scene that no longer exists.
          const activeSceneId = s.activeSceneId === id
            ? (scenes[0]?.id ?? null)
            : s.activeSceneId
          return { scenes, activeSceneId }
        }, false, 'removeScene'),

        reorderScene: (id, toIndex) => set((s) => {
          const from = s.scenes.findIndex(sc => sc.id === id)
          if (from === -1) return s
          const scenes = [...s.scenes]
          const [moved] = scenes.splice(from, 1)
          scenes.splice(Math.max(0, Math.min(scenes.length, toIndex)), 0, moved)
          return { scenes }
        }, false, 'reorderScene'),

        advance: () => {
          const { scenes, activeSceneId } = get()
          const i = scenes.findIndex(sc => sc.id === activeSceneId)
          const next = scenes[i + 1]
          if (next) set({ activeSceneId: next.id }, false, 'advance')
        },
      }),
      { name: 'glorycast-scenes' },
    ),
  ),
)
