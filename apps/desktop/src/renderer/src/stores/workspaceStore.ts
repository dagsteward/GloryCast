import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import {
  getWorkspace,
  workspaceHas,
  type Feature,
  type WorkspaceDef,
  type WorkspaceId,
} from '../config/workspaces'

// ─────────────────────────────────────────────────────────────────────────────
// workspaceStore — which of the three GloryCast products the user is running.
//
// Persisted, because switching workspace changes the entire shape of the app
// and must survive a restart. Cinematic is the default: it is the most complete
// workspace and the one a broadcast-minded evaluator expects to land in.
// ─────────────────────────────────────────────────────────────────────────────

interface WorkspaceState {
  workspaceId: WorkspaceId
  /** False until the user has explicitly chosen, so onboarding can be shown. */
  hasChosen: boolean

  setWorkspace: (id: WorkspaceId) => void
  /** Accept the default without opening the chooser again. */
  confirmDefault: () => void
}

export const useWorkspaceStore = create<WorkspaceState>()(
  devtools(
    persist(
      (set) => ({
        workspaceId: 'cinematic',
        hasChosen: false,

        setWorkspace: (workspaceId) =>
          set({ workspaceId, hasChosen: true }, false, 'setWorkspace'),

        confirmDefault: () => set({ hasChosen: true }, false, 'confirmDefault'),
      }),
      { name: 'glorycast-workspace' },
    ),
  ),
)

/** The active workspace definition. */
export function useWorkspace(): WorkspaceDef {
  return getWorkspace(useWorkspaceStore(s => s.workspaceId))
}

/**
 * Gate a capability by workspace.
 *
 * Prefer this over comparing workspace ids at the call site — it keeps the
 * question "should this exist here?" answerable from config/workspaces.ts
 * alone.
 */
export function useFeature(feature: Feature): boolean {
  return useWorkspaceStore(s => workspaceHas(s.workspaceId, feature))
}
