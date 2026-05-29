import { create } from 'zustand'

// ─────────────────────────────────────────────────────────────────────────────
// GloryCast — Slide background registry
//
// Backgrounds that sit behind scripture / song slides. Built-ins are CSS
// gradients and animated "motion" gradients; producers can also upload their
// own image or video to use as a custom background or template.
//
// Uploaded files become object URLs held in module state (blobs can't be
// JSON-persisted), so custom backgrounds live for the session.
// ─────────────────────────────────────────────────────────────────────────────

export type SlideBgKind = 'gradient' | 'motion' | 'image' | 'video' | 'solid'

export interface SlideBackground {
  id:         string
  label:      string
  kind:       SlideBgKind
  className?: string   // gradient / motion → a CSS class from globals.css
  color?:     string   // solid → a CSS colour
  url?:       string   // image / video → object URL
  custom?:    boolean
}

export const BUILTIN_BACKGROUNDS: SlideBackground[] = [
  // Static gradients
  { id: 'worship', label: 'Worship', kind: 'gradient', className: 'slide-bg-worship' },
  { id: 'grace',   label: 'Grace',   kind: 'gradient', className: 'slide-bg-grace' },
  { id: 'fire',    label: 'Fire',    kind: 'gradient', className: 'slide-bg-fire' },
  { id: 'nature',  label: 'Nature',  kind: 'gradient', className: 'slide-bg-nature' },
  { id: 'gold',    label: 'Gold',    kind: 'gradient', className: 'slide-bg-gold' },
  // Animated motion graphics
  { id: 'aurora',  label: 'Aurora',  kind: 'motion',   className: 'slide-motion-aurora' },
  { id: 'ember',   label: 'Ember',   kind: 'motion',   className: 'slide-motion-ember' },
  { id: 'ocean',   label: 'Ocean',   kind: 'motion',   className: 'slide-motion-ocean' },
  { id: 'royal',   label: 'Royal',   kind: 'motion',   className: 'slide-motion-royal' },
  // Solid
  { id: 'black',   label: 'Black',   kind: 'solid',    color: '#000000' },
]

const uid = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

interface BackgroundState {
  custom:     SlideBackground[]
  selectedId: string

  /** All backgrounds — built-ins first, then custom uploads. */
  all: () => SlideBackground[]
  /** Resolve a background by id (null when not found / empty). */
  get: (id: string | undefined) => SlideBackground | null

  select:       (id: string) => void
  addImage:     (file: File) => string
  addVideo:     (file: File) => string
  removeCustom: (id: string) => void
}

export const useBackgroundStore = create<BackgroundState>((set, get) => ({
  custom:     [],
  selectedId: 'worship',

  all: () => [...BUILTIN_BACKGROUNDS, ...get().custom],

  get: (id) => {
    if (!id) return null
    return get().all().find(b => b.id === id) ?? null
  },

  select: (id) => set({ selectedId: id }),

  addImage: (file) => {
    const id = uid('img')
    const url = URL.createObjectURL(file)
    const bg: SlideBackground = { id, label: file.name.replace(/\.[^.]+$/, ''), kind: 'image', url, custom: true }
    set(s => ({ custom: [...s.custom, bg], selectedId: id }))
    return id
  },

  addVideo: (file) => {
    const id = uid('vid')
    const url = URL.createObjectURL(file)
    const bg: SlideBackground = { id, label: file.name.replace(/\.[^.]+$/, ''), kind: 'video', url, custom: true }
    set(s => ({ custom: [...s.custom, bg], selectedId: id }))
    return id
  },

  removeCustom: (id) => set(s => {
    const bg = s.custom.find(b => b.id === id)
    if (bg?.url) { try { URL.revokeObjectURL(bg.url) } catch { /* noop */ } }
    return {
      custom:     s.custom.filter(b => b.id !== id),
      selectedId: s.selectedId === id ? 'worship' : s.selectedId,
    }
  }),
}))
