import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Search, ChevronLeft, ChevronRight, Mic2,
  BookOpen, Music, X, Monitor, ArrowRight, Trash2,
  FileText, Image as ImageIcon, Hash, Library,
} from 'lucide-react'
import { SlideCanvas } from '../components/presentation/SlideCanvas'
import { CopilotFeed } from '../components/live/CopilotFeed'
import { useAppStore } from '../stores/appStore'
import { useServiceStore, type LiveItem } from '../stores/serviceStore'
import { cn } from '../lib/utils'

// Map a presentation Slide onto the shared LiveItem bus.
function slideToLiveItem(slide: Slide): Omit<LiveItem, 'id'> {
  const kind: LiveItem['kind'] =
    slide.type === 'song' ? 'song'
    : slide.type === 'scripture' ? 'scripture'
    : slide.type === 'announcement' ? 'announcement'
    : 'blank'
  return {
    kind,
    title:      slide.reference ?? slide.songTitle ?? slide.title,
    body:       slide.body,
    subtitle:   slide.type === 'scripture' ? slide.translation : slide.partLabel,
    background: slide.background,
    source:     'presentation',
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Slide {
  id: string
  type: 'scripture' | 'song' | 'announcement' | 'blank' | 'media' | 'countdown'
  title: string
  body?: string
  reference?: string      // scripture ref or announcement subtitle
  background?: string
  textColor?: string
  font?: string
  fontSize?: number
  translation?: string
  songTitle?: string
  partLabel?: string
}

// ─── Background presets ───────────────────────────────────────────────────────

const BG_PRESETS = [
  { id: 'gradient-purple', label: 'Worship',  class: 'bg-gradient-to-br from-purple-900 via-indigo-900 to-black' },
  { id: 'slide-bg-grace',  label: 'Grace',    class: 'bg-gradient-to-br from-blue-900 via-indigo-900 to-black'   },
  { id: 'slide-bg-fire',   label: 'Fire',     class: 'bg-gradient-to-br from-orange-900 via-red-900 to-black'    },
  { id: 'slide-bg-nature', label: 'Nature',   class: 'bg-gradient-to-br from-emerald-900 to-black'                },
  { id: 'slide-bg-gold',   label: 'Gold',     class: 'bg-gradient-to-br from-amber-900 via-yellow-900 to-black'  },
  { id: '#000000',          label: 'Black',    class: 'bg-black'                                                  },
]

// ─── Song file parser ─────────────────────────────────────────────────────────

function parseSongLyrics(filename: string, text: string): Slide[] {
  const base = filename.replace(/\.[^.]+$/, '').trim()
  const slides: Slide[] = []
  let label = ''
  let lines: string[] = []
  let idx = 0

  const flush = () => {
    const body = lines.filter(l => l.trim()).join('\n').trim()
    if (!body) return
    slides.push({
      id:        `song-${Date.now()}-${idx++}`,
      type:      'song',
      title:     label ? `${base} — ${label}` : `${base} — Part ${slides.length + 1}`,
      body,
      songTitle: base,
      partLabel: label || `Part ${slides.length + 1}`,
      background:'gradient-blue',
    })
    lines = []
  }

  for (const raw of text.split('\n')) {
    const t = raw.trim()
    if (/^[\[#]?(verse|chorus|bridge|pre-?chorus|outro|intro|tag|refrain)[\s\d]*[\]:]?$/i.test(t)) {
      flush()
      label = t.replace(/[\[\]:]/g, '').trim()
    } else {
      lines.push(raw)
    }
  }
  flush()

  // No sections found → split by blank lines
  if (slides.length === 0) {
    const paras = text.split(/\n\n+/).map(p => p.trim()).filter(Boolean)
    paras.forEach((body, i) => {
      slides.push({
        id:        `song-${Date.now()}-${i}`,
        type:      'song',
        title:     `${base} — Part ${i + 1}`,
        body,
        songTitle: base,
        partLabel: `Part ${i + 1}`,
        background:'gradient-blue',
      })
    })
  }

  return slides
}

// ─── Demo slides ──────────────────────────────────────────────────────────────

const DEMO_SLIDES: Slide[] = [
  {
    id: 'announce-1',
    type: 'announcement',
    title: 'Welcome',
    body: 'Welcome to Sunday Service',
    background: 'gradient-purple',
  },
  {
    id: 'scripture-1',
    type: 'scripture',
    title: 'Romans 8:28',
    body: 'And we know that in all things God works for the good of those who love him, who have been called according to his purpose.',
    reference: 'Romans 8:28',
    translation: 'NIV',
    background: 'slide-bg-grace',
  },
  {
    id: 'song-1-v1',
    type: 'song',
    title: 'Amazing Grace — Verse 1',
    body: 'Amazing grace, how sweet the sound\nThat saved a wretch like me\nI once was lost, but now am found\nWas blind, but now I see',
    songTitle: 'Amazing Grace',
    partLabel: 'Verse 1',
    background: 'gradient-purple',
  },
  {
    id: 'song-1-ch',
    type: 'song',
    title: 'Amazing Grace — Chorus',
    body: 'My chains are gone, I\'ve been set free\nMy God, my Savior has ransomed me\nAnd like a flood, His mercy reigns\nUnending love, amazing grace',
    songTitle: 'Amazing Grace',
    partLabel: 'Chorus',
    background: 'gradient-purple',
  },
  {
    id: 'scripture-2',
    type: 'scripture',
    title: 'John 3:16',
    body: 'For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.',
    reference: 'John 3:16',
    translation: 'NIV',
    background: 'slide-bg-fire',
  },
  {
    id: 'blank-1',
    type: 'blank',
    title: 'Blank',
    background: '#000000',
  },
]

// ─── PresentationPage ─────────────────────────────────────────────────────────

export function PresentationPage() {
  const [slides, setSlides]     = useState<Slide[]>(DEMO_SLIDES)
  const [previewId, setPreviewId] = useState<string>(DEMO_SLIDES[0].id)
  const [programId, setProgramId] = useState<string | null>(null)
  const [search, setSearch]     = useState('')
  const [bgPicker, setBgPicker] = useState<string | null>(null)

  const { saveSong, deleteSong, songLibrary } = useAppStore()

  // Unified AI engine + shared Preview/Program bus.
  const aiListening    = useServiceStore(s => s.aiListening)
  const setAiListening = useServiceStore(s => s.setAiListening)
  const svcPreview     = useServiceStore(s => s.preview)
  const svcCut         = useServiceStore(s => s.cutToProgram)
  const svcClearProgram = useServiceStore(s => s.clearProgram)

  const fileRef = useRef<HTMLInputElement>(null)

  // Load persisted songs into the slide library on first mount
  useEffect(() => {
    if (!songLibrary.length) return
    setSlides(prev => {
      const existingIds = new Set(prev.map(s => s.songTitle))
      const newSlides = songLibrary
        .filter(entry => !existingIds.has(entry.title))
        .flatMap(entry => parseSongLyrics(entry.title + '.txt', entry.rawText))
      return newSlides.length ? [...prev, ...newSlides] : prev
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const previewSlide = slides.find(s => s.id === previewId)
  const programSlide = programId ? slides.find(s => s.id === programId) : null

  const currentIdx = slides.findIndex(s => s.id === previewId)

  const goNext = () => {
    if (currentIdx < slides.length - 1) setPreviewId(slides[currentIdx + 1].id)
  }
  const goPrev = () => {
    if (currentIdx > 0) setPreviewId(slides[currentIdx - 1].id)
  }
  const take = () => {
    if (!previewId) return
    setProgramId(previewId)
    const slide = slides.find(s => s.id === previewId)
    if (slide) svcCut(slideToLiveItem(slide))   // mirror to shared Program bus
  }
  const clearPgm = () => { setProgramId(null); svcClearProgram() }

  // Add a scripture slide to Preview (creates one if it doesn't exist yet).
  const addScriptureToPreview = useCallback((reference: string, text: string) => {
    const existing = slides.find(s => s.reference === reference)
    if (existing) { setPreviewId(existing.id); return }

    const slide: Slide = {
      id:          `det-${Date.now()}`,
      type:        'scripture',
      title:       reference,
      body:        text,
      reference,
      translation: 'NIV',
      background:  'slide-bg-grace',
    }
    setSlides(prev => [...prev, slide])
    setPreviewId(slide.id)
  }, [slides])

  // Add a detected song line to Preview (matches the library by title + part).
  const addSongToPreview = useCallback((songTitle: string, partLabel: string, line: string) => {
    const existing = slides.find(s => s.songTitle === songTitle && s.partLabel === partLabel)
    if (existing) { setPreviewId(existing.id); return }

    const slide: Slide = {
      id:        `det-song-${Date.now()}`,
      type:      'song',
      title:     `${songTitle} — ${partLabel}`,
      body:      line,
      songTitle,
      partLabel,
      background: 'gradient-purple',
    }
    setSlides(prev => [...prev, slide])
    setPreviewId(slide.id)
  }, [slides])

  // Consume the shared Preview bus: when the AI Copilot (or any page) sends an
  // item to Preview, surface it here as a slide.
  const lastSvcPreviewRef = useRef<string | null>(null)
  useEffect(() => {
    if (!svcPreview || svcPreview.source === 'presentation') return
    if (lastSvcPreviewRef.current === svcPreview.id) return
    lastSvcPreviewRef.current = svcPreview.id
    if (svcPreview.kind === 'scripture') {
      addScriptureToPreview(svcPreview.title, svcPreview.body ?? '')
    } else if (svcPreview.kind === 'song') {
      addSongToPreview(svcPreview.title, svcPreview.subtitle ?? 'Verse', svcPreview.body ?? '')
    }
  }, [svcPreview, addScriptureToPreview, addSongToPreview])

  // Song file import — parse + add to slide library + persist
  const importSong = (file: File) => {
    const reader = new FileReader()
    reader.onload = ev => {
      const raw    = (ev.target?.result as string) ?? ''
      const parsed = parseSongLyrics(file.name, raw)
      if (!parsed.length) return
      setSlides(prev => [...prev, ...parsed])
      setPreviewId(parsed[0].id)
      saveSong({ title: parsed[0].songTitle ?? file.name, rawText: raw })
    }
    reader.readAsText(file)
  }

  // Add blank slide
  const addBlank = () => {
    const s: Slide = { id: `blank-${Date.now()}`, type: 'blank', title: 'Blank Slide', background: '#000000' }
    setSlides(prev => [...prev, s])
    setPreviewId(s.id)
  }

  // Delete slide
  const deleteSlide = (id: string) => {
    setSlides(prev => {
      const next = prev.filter(s => s.id !== id)
      if (previewId === id && next.length) setPreviewId(next[0].id)
      if (programId === id) setProgramId(null)
      return next
    })
  }

  // Change background of selected slide
  const changeBg = (bg: string) => {
    setSlides(prev => prev.map(s => s.id === previewId ? { ...s, background: bg } : s))
    setBgPicker(null)
  }

  const filtered = search
    ? slides.filter(s =>
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        s.body?.toLowerCase().includes(search.toLowerCase()),
      )
    : slides

  return (
    <div className="h-full flex overflow-hidden bg-app">

      {/* ── Left: Slide library ──────────────────────────────────────────── */}
      <div className="w-52 shrink-0 flex flex-col border-r border-white/[0.05]">
        {/* Search */}
        <div className="p-2 border-b border-white/[0.05]">
          <div className="relative">
            <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/25" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search slides…"
              className="w-full pl-7 pr-2 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-white/70 placeholder:text-white/22 outline-none focus:border-purple-500/40 transition-colors"
            />
          </div>
        </div>

        {/* Slide list */}
        <div className="flex-1 overflow-y-auto py-1 px-1.5 space-y-0.5">
          <AnimatePresence>
            {filtered.map((slide, i) => (
              <LibraryItem
                key={slide.id}
                slide={slide}
                index={slides.indexOf(slide)}
                isPreview={slide.id === previewId}
                isProgram={slide.id === programId}
                onSelect={() => setPreviewId(slide.id)}
                onDoubleClick={() => { setPreviewId(slide.id); setProgramId(slide.id) }}
                onDelete={() => deleteSlide(slide.id)}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Song library (persisted) */}
        {songLibrary.length > 0 && (
          <div className="border-t border-white/[0.05] px-2 pt-2 pb-1">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Library size={9} className="text-white/28" />
              <span className="text-[9px] text-white/28 uppercase tracking-widest">Song Library</span>
            </div>
            <div className="space-y-0.5 max-h-28 overflow-y-auto">
              {songLibrary.map(entry => (
                <button
                  key={entry.id}
                  onClick={() => {
                    const parsed = parseSongLyrics(entry.title + '.txt', entry.rawText)
                    if (!parsed.length) return
                    setSlides(prev => {
                      const ids = new Set(prev.map(s => s.songTitle))
                      return ids.has(parsed[0].songTitle) ? prev : [...prev, ...parsed]
                    })
                    setPreviewId(parsed[0].id)
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1 rounded-md hover:bg-blue-600/10 text-left group"
                >
                  <Music size={9} className="text-blue-400 shrink-0" />
                  <span className="text-[10px] text-white/55 truncate group-hover:text-white/80">{entry.title}</span>
                  <button
                    onClick={e => { e.stopPropagation(); deleteSong(entry.id) }}
                    className="ml-auto opacity-0 group-hover:opacity-100 text-white/25 hover:text-red-400 transition-all"
                  >
                    <X size={9} />
                  </button>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Add actions */}
        <div className="p-2 border-t border-white/[0.05] space-y-1">
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-purple-600/12 border border-purple-500/22 text-xs text-purple-400 hover:bg-purple-600/22 transition-colors"
          >
            <Music size={11} />
            Import Song File
          </button>
          <button
            onClick={addBlank}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-dashed border-white/12 text-xs text-white/38 hover:text-white/65 hover:border-white/25 transition-colors"
          >
            <Plus size={11} />
            Add Blank Slide
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.md,.lyr"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) importSong(f); e.target.value = '' }}
          />
        </div>
      </div>

      {/* ── Center: Dual canvas ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Toolbar */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/[0.05] bg-chrome shrink-0">
          <div className="flex items-center gap-1">
            <button onClick={goPrev} disabled={currentIdx === 0} className="icon-btn">
              <ChevronLeft size={14} />
            </button>
            <span className="text-[10px] text-white/32 font-mono w-14 text-center">
              {currentIdx + 1} / {slides.length}
            </span>
            <button onClick={goNext} disabled={currentIdx === slides.length - 1} className="icon-btn">
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Background picker */}
            <div className="relative">
              <button
                onClick={() => setBgPicker(bgPicker ? null : previewId)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.07] text-[10px] text-white/45 hover:text-white/70 transition-colors"
              >
                <ImageIcon size={10} />
                Background
              </button>
              {bgPicker && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="absolute top-full mt-1 left-0 z-50 p-2 rounded-xl bg-[#1a1a2e] border border-white/10 shadow-2xl grid grid-cols-3 gap-1.5 w-52"
                >
                  {BG_PRESETS.map(bg => (
                    <button
                      key={bg.id}
                      onClick={() => changeBg(bg.id)}
                      className={cn('h-10 rounded-lg text-[10px] font-medium text-white/80 transition-all', bg.class, 'hover:scale-105 hover:shadow-lg')}
                    >
                      {bg.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>

            {/* AI Copilot (unified engine) */}
            <button
              onClick={() => setAiListening(!aiListening)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all',
                aiListening
                  ? 'bg-purple-600/25 text-purple-400 border border-purple-500/30'
                  : 'bg-white/[0.04] text-white/42 border border-white/[0.07] hover:text-white/70',
              )}
            >
              <Mic2 size={11} className={aiListening ? 'live-dot text-purple-400' : ''} />
              {aiListening ? 'AI Active' : 'AI Copilot'}
            </button>

            {/* TAKE button */}
            <button
              onClick={take}
              disabled={!previewId}
              className="flex items-center gap-1.5 px-4 py-1 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-xs font-bold tracking-wide transition-all active:scale-95"
            >
              <ArrowRight size={12} />
              TAKE
            </button>

            {programId && (
              <button
                onClick={clearPgm}
                title="Clear program output (black)"
                className="icon-btn text-white/35 hover:text-red-400"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Preview + Program */}
        <div className="flex-1 flex gap-3 p-3 overflow-hidden min-h-0">

          {/* PREVIEW */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-1.5 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Preview</span>
              </div>
              <button
                onClick={take}
                className="text-[9px] px-2 py-0.5 rounded-md bg-emerald-600/18 text-emerald-400 hover:bg-emerald-600/30 transition-colors font-medium"
              >
                Take →
              </button>
            </div>
            <div className="flex-1 min-h-0 rounded-xl overflow-hidden border-2 border-emerald-500/50 shadow-[0_0_18px_rgba(16,185,129,0.18)]">
              <SlideCanvas slide={previewSlide} variant="preview" label="PREVIEW" />
            </div>
          </div>

          {/* PROGRAM */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-1.5 shrink-0">
              <div className="flex items-center gap-2">
                <div className={cn('w-2 h-2 rounded-full transition-all', programId ? 'bg-red-400 live-dot' : 'bg-white/15')} />
                <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Program</span>
              </div>
              {programId && (
                <button
                  onClick={clearPgm}
                  className="text-[9px] px-2 py-0.5 rounded-md bg-red-600/15 text-red-400 hover:bg-red-600/30 transition-colors font-medium"
                >
                  Clear
                </button>
              )}
            </div>
            <div className={cn(
              'flex-1 min-h-0 rounded-xl overflow-hidden border-2 transition-all',
              programId
                ? 'border-red-500/70 shadow-[0_0_24px_rgba(239,68,68,0.22)]'
                : 'border-white/[0.07]',
            )}>
              {programSlide ? (
                <SlideCanvas slide={programSlide} variant="program" label="LIVE" />
              ) : (
                <div className="w-full h-full bg-black flex flex-col items-center justify-center gap-2">
                  <Monitor size={30} className="text-white/10" />
                  <p className="text-[11px] text-white/15">No output</p>
                  <p className="text-[9px] text-white/10">Select slide in Preview, then click TAKE</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Slide strip */}
        <div className="h-[78px] shrink-0 border-t border-white/[0.05] bg-chrome flex items-center gap-1.5 px-3 overflow-x-auto">
          {slides.map((slide, i) => (
            <SlideThumb
              key={slide.id}
              slide={slide}
              index={i}
              isPreview={slide.id === previewId}
              isProgram={slide.id === programId}
              onClick={() => setPreviewId(slide.id)}
              onDoubleClick={() => { setPreviewId(slide.id); setProgramId(slide.id) }}
            />
          ))}
        </div>
      </div>

      {/* ── Right: shared AI Copilot panel ──────────────────────────────── */}
      <AnimatePresence>
        {aiListening && (
          <motion.div
            key="detection-panel"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="shrink-0 border-l border-white/[0.05] overflow-hidden bg-chrome"
          >
            <div className="w-[280px] h-full">
              <CopilotFeed />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── LibraryItem ──────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  scripture:    'bg-purple-500',
  song:         'bg-blue-500',
  announcement: 'bg-orange-500',
  blank:        'bg-white/20',
  media:        'bg-emerald-500',
  countdown:    'bg-red-500',
}

function LibraryItem({ slide, index, isPreview, isProgram, onSelect, onDoubleClick, onDelete }: {
  slide: Slide; index: number; isPreview: boolean; isProgram: boolean
  onSelect: () => void; onDoubleClick: () => void; onDelete: () => void
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8, height: 0 }}
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
      className={cn(
        'group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-all relative',
        isPreview ? 'bg-emerald-600/15 border border-emerald-500/30' :
        isProgram ? 'bg-red-600/15 border border-red-500/30' :
                   'hover:bg-white/[0.03] border border-transparent',
      )}
    >
      <span className="text-[9px] text-white/18 font-mono w-4 shrink-0 text-right">{index + 1}</span>
      <div className={cn('w-[3px] h-8 rounded-full shrink-0', TYPE_COLORS[slide.type] ?? 'bg-white/20')} />
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-white/72 font-medium truncate">{slide.title}</div>
        <div className="text-[9px] text-white/28 capitalize flex items-center gap-1">
          {slide.type}
          {isProgram && <span className="text-red-400 font-bold">• LIVE</span>}
          {isPreview && !isProgram && <span className="text-emerald-400 font-bold">• PRV</span>}
        </div>
      </div>
      <button
        onClick={e => { e.stopPropagation(); onDelete() }}
        className="opacity-0 group-hover:opacity-100 icon-btn w-5 h-5 hover:text-red-400 transition-all"
      >
        <Trash2 size={10} />
      </button>
    </motion.div>
  )
}

// ─── SlideThumb ───────────────────────────────────────────────────────────────

const TYPE_BORDER: Record<string, string> = {
  scripture: 'border-purple-500/60',
  song:      'border-blue-500/60',
  announcement: 'border-orange-500/60',
  blank:     'border-white/15',
  media:     'border-emerald-500/60',
  countdown: 'border-red-500/60',
}

function SlideThumb({ slide, index, isPreview, isProgram, onClick, onDoubleClick }: {
  slide: Slide; index: number; isPreview: boolean; isProgram: boolean
  onClick: () => void; onDoubleClick: () => void
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      title={`${index + 1}. ${slide.title} — double-click to Take`}
      className={cn(
        'shrink-0 relative rounded-md overflow-hidden cursor-pointer border-2 transition-all',
        isProgram ? 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]' :
        isPreview ? 'border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.35)]' :
                   (TYPE_BORDER[slide.type] ?? 'border-white/10'),
      )}
      style={{ width: '100px', height: '56px', flexShrink: 0 }}
    >
      <ThumbSlideContent slide={slide} />

      {isProgram && (
        <div className="absolute top-0.5 right-0.5 px-1 py-0.5 rounded bg-red-600/90 text-[7px] font-bold text-white leading-none">
          LIVE
        </div>
      )}
      {isPreview && !isProgram && (
        <div className="absolute top-0.5 right-0.5 px-1 py-0.5 rounded bg-emerald-600/80 text-[7px] font-bold text-white leading-none">
          PRV
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-1 py-0.5">
        <span className="text-[7px] text-white/55 truncate block">{slide.title}</span>
      </div>
    </motion.div>
  )
}

const BG_THUMB: Record<string, string> = {
  'gradient-purple': 'from-purple-900 via-indigo-900 to-black',
  'slide-bg-grace':  'from-blue-900 via-indigo-900 to-black',
  'slide-bg-fire':   'from-orange-900 via-red-900 to-black',
  'slide-bg-nature': 'from-emerald-900 to-black',
  'slide-bg-gold':   'from-amber-900 to-black',
  'gradient-blue':   'from-blue-900 via-cyan-900 to-black',
}

function ThumbSlideContent({ slide }: { slide: Slide }) {
  const gradClass = slide.background && BG_THUMB[slide.background]
    ? `bg-gradient-to-br ${BG_THUMB[slide.background]}`
    : ''
  const bgStyle = slide.background && !BG_THUMB[slide.background]
    ? { backgroundColor: slide.background }
    : {}

  return (
    <div className={cn('absolute inset-0 flex items-center justify-center p-1', gradClass)} style={bgStyle}>
      <p className="text-white/65 text-[7px] leading-tight text-center line-clamp-3">
        {slide.body ?? slide.title}
      </p>
    </div>
  )
}
