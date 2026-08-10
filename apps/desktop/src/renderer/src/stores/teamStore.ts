import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

// ─────────────────────────────────────────────────────────────────────────────
// teamStore — who is serving on this service.
//
// Local-first: the Minimal workspace advertises Team Collaboration, and a
// volunteer team needs the roster to work before anyone sets up cloud sync.
// When the backend Users module is wired in, this becomes its local cache.
//
// Seeded with the signed-in user only. Inventing colleagues would put names of
// people who do not exist in front of an operator.
// ─────────────────────────────────────────────────────────────────────────────

export type TeamRole =
  | 'Presenter'
  | 'Worship Leader'
  | 'Media Operator'
  | 'Sound Engineer'
  | 'Camera Operator'
  | 'Volunteer'

export const TEAM_ROLES: readonly TeamRole[] = [
  'Presenter', 'Worship Leader', 'Media Operator',
  'Sound Engineer', 'Camera Operator', 'Volunteer',
]

export interface TeamMember {
  id: string
  name: string
  role: TeamRole
  /** Marks the signed-in user, shown as "(You)". */
  isSelf: boolean
  /** Present once the member has connected in this session. */
  online: boolean
}

interface TeamState {
  members: TeamMember[]

  addMember: (name: string, role: TeamRole) => void
  removeMember: (id: string) => void
  setRole: (id: string, role: TeamRole) => void
  /** Keeps the self entry in step with the signed-in account. */
  syncSelf: (name: string) => void
}

const uid = () => `member-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`

export const useTeamStore = create<TeamState>()(
  devtools(
    persist(
      (set) => ({
        members: [],

        addMember: (name, role) => set((s) => {
          const trimmed = name.trim()
          if (!trimmed) return s
          return {
            members: [...s.members, {
              id: uid(), name: trimmed, role, isSelf: false, online: false,
            }],
          }
        }, false, 'addMember'),

        removeMember: (id) => set((s) => ({
          // The signed-in user cannot remove themselves from the roster.
          members: s.members.filter(m => m.id !== id || m.isSelf),
        }), false, 'removeMember'),

        setRole: (id, role) => set((s) => ({
          members: s.members.map(m => m.id === id ? { ...m, role } : m),
        }), false, 'setRole'),

        syncSelf: (name) => set((s) => {
          const existing = s.members.find(m => m.isSelf)
          if (existing) {
            if (existing.name === name) return s
            return {
              members: s.members.map(m => m.isSelf ? { ...m, name } : m),
            }
          }
          return {
            members: [
              { id: uid(), name, role: 'Presenter' as TeamRole, isSelf: true, online: true },
              ...s.members,
            ],
          }
        }, false, 'syncSelf'),
      }),
      { name: 'glorycast-team' },
    ),
  ),
)
