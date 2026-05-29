import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

// ─────────────────────────────────────────────────────────────────────────────
// GloryCast — Unified Service / AI Copilot store
//
// This is the SINGLE source of truth for the live production. Every page
// (Dashboard, Presentation, Production, Bible) reads and writes the same:
//   • Service lifecycle (is a service running, how long, what segment)
//   • AI Copilot engine (one transcript, one detection feed: scripture + song)
//   • One shared Preview → Program bus (what is queued vs what is live)
//
// Before this store, the app had three disconnected mock scripture panels and
// three separate program outputs. They all now funnel through here.
// ─────────────────────────────────────────────────────────────────────────────

export type LiveItemKind = 'scripture' | 'song' | 'announcement' | 'media' | 'blank'

/**
 * How a scripture / song graphic is composited over the program output.
 *  • lower-third — classic broadcast band pinned to the bottom
 *  • top         — band pinned to the top
 *  • center / left / right — a positioned card over the video
 *  • full        — full-screen slide with its chosen background
 */
export type OverlayLayout = 'lower-third' | 'top' | 'center' | 'left' | 'right' | 'full'

/** A thing that can sit on Preview or Program — the shared output unit. */
export interface LiveItem {
  id:          string
  kind:        LiveItemKind
  title:       string            // "John 3:16"  |  "Amazing Grace"
  body?:       string            // verse text   |  current lyric lines
  subtitle?:   string            // translation  |  verse/part label
  background?: string            // bg preset key (worship/grace/fire/…)
  source:      'ai' | 'manual' | 'bible' | 'presentation'
}

/** Something the AI heard and matched. Lives in the detection feed. */
export interface Detection {
  id:         string
  kind:       'scripture' | 'song'
  reference:  string             // "Romans 8:28"  |  "How Great Is Our God"
  text:       string             // matched verse / matched lyric line
  subtitle?:  string             // translation / part label
  confidence: number             // 0..1
  detectedAt: number             // epoch ms
  acted:      boolean            // already sent to preview/program?
}

export interface ServiceSegment {
  id:    string
  label: string
  done:  boolean
}

interface ServiceState {
  // ── Service lifecycle ──────────────────────────────────────────────
  serviceActive:    boolean
  serviceTitle:     string
  serviceStartedAt: number | null
  segments:         ServiceSegment[]
  activeSegmentId:  string | null

  // ── AI Copilot engine ──────────────────────────────────────────────
  aiListening:  boolean          // mic on, transcribing
  autoPilot:    boolean          // auto-send confident detections to preview
  proMode:      boolean          // unlock manual / advanced controls
  transcript:   string           // rolling live transcript window
  detections:   Detection[]      // newest first, capped

  // ── Shared Preview → Program bus ───────────────────────────────────
  preview:  LiveItem | null
  program:  LiveItem | null
  history:  LiveItem[]           // things that have gone live, newest first

  // How graphics are composited over the program / preview output.
  overlayLayout: OverlayLayout

  // ── Graphics deck ──────────────────────────────────────────────────
  // Prepared graphic sources (scripture verses, songs, announcements) that
  // can be switched like any other source. The Bible page queues into here;
  // the Production switch deck lists them under a "Graphics" tab.
  graphics: LiveItem[]

  // ── Actions: service ───────────────────────────────────────────────
  startService: (title?: string) => void
  stopService:  () => void
  setServiceTitle: (t: string) => void
  toggleSegment: (id: string) => void
  setActiveSegment: (id: string | null) => void

  // ── Actions: AI engine ─────────────────────────────────────────────
  setAiListening: (v: boolean) => void
  toggleAutoPilot: () => void
  setProMode: (v: boolean) => void
  setTranscript: (t: string) => void
  /** Add a detection; under auto-pilot a confident one is auto-previewed. */
  addDetection: (d: Omit<Detection, 'id' | 'detectedAt' | 'acted'>) => void
  clearDetections: () => void

  // ── Actions: shared bus ────────────────────────────────────────────
  sendToPreview: (item: Omit<LiveItem, 'id'>) => void
  /** Promote whatever is on Preview to Program (the "TAKE"). */
  take: () => void
  /** One-shot: skip preview, go straight live (cut). */
  cutToProgram: (item: Omit<LiveItem, 'id'>) => void
  clearProgram: () => void
  clearPreview: () => void
  setOverlayLayout: (layout: OverlayLayout) => void

  // ── Actions: graphics deck ─────────────────────────────────────────
  /** Add a graphic source to the switch deck (deduped by title). Returns its id. */
  addGraphic: (item: Omit<LiveItem, 'id'>) => string
  removeGraphic: (id: string) => void
  clearGraphics: () => void
  /** Reorder the graphics deck — drag a source onto another's slot. */
  reorderGraphics: (fromId: string, toId: string) => void
}

const AUTO_PILOT_THRESHOLD = 0.88

const DEFAULT_SEGMENTS: ServiceSegment[] = [
  { id: 'seg-welcome',  label: 'Welcome & Announcements', done: false },
  { id: 'seg-worship',  label: 'Worship Set',             done: false },
  { id: 'seg-prayer',   label: 'Prayer',                  done: false },
  { id: 'seg-sermon',   label: 'Sermon',                  done: false },
  { id: 'seg-response', label: 'Response & Altar Call',   done: false },
  { id: 'seg-close',    label: 'Closing',                 done: false },
]

const uid = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

export const useServiceStore = create<ServiceState>()(
  devtools(
    (set, get) => ({
      // ── Service lifecycle ──
      serviceActive:    false,
      serviceTitle:     'Sunday Morning Service',
      serviceStartedAt: null,
      segments:         DEFAULT_SEGMENTS,
      activeSegmentId:  null,

      // ── AI engine ──
      aiListening: false,
      autoPilot:   true,
      proMode:     false,
      transcript:  '',
      detections:  [],

      // ── Shared bus ──
      preview: null,
      program: null,
      history: [],
      overlayLayout: 'lower-third',

      // ── Graphics deck ──
      graphics: [],

      // ── Service actions ──
      startService: (title) => set((s) => ({
        serviceActive:    true,
        serviceStartedAt: Date.now(),
        serviceTitle:     title ?? s.serviceTitle,
        aiListening:      true,
        segments:         DEFAULT_SEGMENTS.map(seg => ({ ...seg, done: false })),
        activeSegmentId:  DEFAULT_SEGMENTS[0].id,
      }), false, 'startService'),

      stopService: () => set({
        serviceActive:    false,
        serviceStartedAt: null,
        aiListening:      false,
        activeSegmentId:  null,
        preview:          null,
        program:          null,
        transcript:       '',
      }, false, 'stopService'),

      setServiceTitle: (t) => set({ serviceTitle: t }, false, 'setServiceTitle'),

      toggleSegment: (id) => set((s) => ({
        segments: s.segments.map(seg => seg.id === id ? { ...seg, done: !seg.done } : seg),
      }), false, 'toggleSegment'),

      setActiveSegment: (id) => set({ activeSegmentId: id }, false, 'setActiveSegment'),

      // ── AI engine actions ──
      setAiListening: (v) => set({ aiListening: v }, false, 'setAiListening'),

      toggleAutoPilot: () => set((s) => ({ autoPilot: !s.autoPilot }), false, 'toggleAutoPilot'),

      setProMode: (v) => set({ proMode: v }, false, 'setProMode'),

      setTranscript: (t) => set({ transcript: t }, false, 'setTranscript'),

      addDetection: (d) => {
        const detection: Detection = {
          ...d,
          id:         uid('det'),
          detectedAt: Date.now(),
          acted:      false,
        }
        set((s) => ({ detections: [detection, ...s.detections].slice(0, 24) }), false, 'addDetection')

        // Every detection also lands in the shared graphics deck, so it becomes
        // a switchable source in the Production deck (re-usable, not just live once).
        get().addGraphic({
          kind:     detection.kind,
          title:    detection.reference,
          body:     detection.text,
          subtitle: detection.subtitle,
          source:   'ai',
        })

        // Auto-pilot: a confident hit goes straight to Preview, hands-free.
        const { autoPilot } = get()
        if (autoPilot && detection.confidence >= AUTO_PILOT_THRESHOLD) {
          get().sendToPreview({
            kind:     detection.kind,
            title:    detection.reference,
            body:     detection.text,
            subtitle: detection.subtitle,
            source:   'ai',
          })
          set((s) => ({
            detections: s.detections.map(x => x.id === detection.id ? { ...x, acted: true } : x),
          }), false, 'autoPilotPreview')
        }
      },

      clearDetections: () => set({ detections: [] }, false, 'clearDetections'),

      // ── Shared bus actions ──
      sendToPreview: (item) => set({
        preview: { ...item, id: uid('live') },
      }, false, 'sendToPreview'),

      take: () => set((s) => {
        if (!s.preview) return {}
        const live = s.preview
        return {
          program: live,
          preview: null,
          history: [live, ...s.history].slice(0, 30),
        }
      }, false, 'take'),

      cutToProgram: (item) => set((s) => {
        const live: LiveItem = { ...item, id: uid('live') }
        return {
          program: live,
          history: [live, ...s.history].slice(0, 30),
        }
      }, false, 'cutToProgram'),

      clearProgram: () => set({ program: null }, false, 'clearProgram'),
      clearPreview: () => set({ preview: null }, false, 'clearPreview'),
      setOverlayLayout: (layout) => set({ overlayLayout: layout }, false, 'setOverlayLayout'),

      // ── Graphics deck actions ──
      addGraphic: (item) => {
        const existing = get().graphics.find(
          g => g.kind === item.kind && g.title === item.title && g.subtitle === item.subtitle,
        )
        if (existing) return existing.id
        const id = uid('gfx')
        set((s) => ({ graphics: [{ ...item, id }, ...s.graphics].slice(0, 48) }), false, 'addGraphic')
        return id
      },

      removeGraphic: (id) => set((s) => ({
        graphics: s.graphics.filter(g => g.id !== id),
      }), false, 'removeGraphic'),

      clearGraphics: () => set({ graphics: [] }, false, 'clearGraphics'),

      reorderGraphics: (fromId, toId) => set((s) => {
        if (fromId === toId) return {}
        const list = [...s.graphics]
        const from = list.findIndex(g => g.id === fromId)
        const to   = list.findIndex(g => g.id === toId)
        if (from === -1 || to === -1) return {}
        const [moved] = list.splice(from, 1)
        list.splice(to, 0, moved)
        return { graphics: list }
      }, false, 'reorderGraphics'),
    }),
    { name: 'GloryCast/Service' },
  ),
)
