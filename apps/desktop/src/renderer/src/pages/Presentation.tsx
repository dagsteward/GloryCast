import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, Play, ChevronLeft, ChevronRight, Mic2, Wand2, BookOpen, Image } from 'lucide-react'
import { SlideCanvas } from '../components/presentation/SlideCanvas'
import { SlideLibrary } from '../components/presentation/SlideLibrary'
import { ScriptureDetectionPanel } from '../components/scripture/ScriptureDetectionPanel'
import { SlideEditor } from '../components/presentation/SlideEditor'
import { useAppStore } from '../stores/appStore'
import { cn } from '../lib/utils'

export interface Slide {
  id: string
  type: 'scripture' | 'song' | 'announcement' | 'blank' | 'media' | 'countdown'
  title: string
  body?: string
  reference?: string
  background?: string
  textColor?: string
  font?: string
  fontSize?: number
  translation?: string
}

export function PresentationPage() {
  const [slides, setSlides] = useState<Slide[]>(DEMO_SLIDES)
  const [selectedSlide, setSelectedSlide] = useState<string>(DEMO_SLIDES[0].id)
  const [editingSlide, setEditingSlide] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const { isListeningForScripture, toggleScriptureListening } = useAppStore()

  const currentIndex = slides.findIndex(s => s.id === selectedSlide)
  const currentSlide = slides.find(s => s.id === selectedSlide)

  const goNext = () => {
    if (currentIndex < slides.length - 1) {
      setSelectedSlide(slides[currentIndex + 1].id)
    }
  }

  const goPrev = () => {
    if (currentIndex > 0) {
      setSelectedSlide(slides[currentIndex - 1].id)
    }
  }

  return (
    <div className="h-full flex overflow-hidden">
      {/* Left: Slide library */}
      <div className="w-56 shrink-0 flex flex-col border-r border-white/[0.05] bg-[#0a0a12]">
        <div className="p-2 border-b border-white/[0.05]">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/25" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search slides..."
              className="w-full pl-7 pr-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.07] text-xs text-white/70 placeholder:text-white/25 outline-none focus:border-purple-500/40"
            />
          </div>
        </div>

        <SlideLibrary
          slides={slides}
          selectedId={selectedSlide}
          onSelect={setSelectedSlide}
          onEdit={setEditingSlide}
        />

        <div className="p-2 border-t border-white/[0.05]">
          <button
            onClick={() => {/* add slide */}}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-white/15 text-xs text-white/40 hover:text-white/70 hover:border-white/30 transition-colors"
          >
            <Plus size={12} />
            Add Slide
          </button>
        </div>
      </div>

      {/* Center: Main canvas */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.05] bg-[#0a0a12] shrink-0">
          <div className="flex items-center gap-2">
            {/* Navigation */}
            <button onClick={goPrev} disabled={currentIndex === 0} className="icon-btn">
              <ChevronLeft size={14} />
            </button>
            <span className="text-[11px] text-white/40 font-mono w-16 text-center">
              {currentIndex + 1} / {slides.length}
            </span>
            <button onClick={goNext} disabled={currentIndex === slides.length - 1} className="icon-btn">
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* AI Scripture listening toggle */}
            <button
              onClick={toggleScriptureListening}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                isListeningForScripture
                  ? 'bg-purple-600/25 text-purple-400 border border-purple-500/30 glow-purple'
                  : 'bg-white/[0.04] text-white/50 border border-white/10 hover:text-white/80',
              )}
            >
              <Mic2 size={12} className={isListeningForScripture ? 'text-purple-400 live-dot' : ''} />
              {isListeningForScripture ? 'AI Listening...' : 'AI Scripture'}
            </button>

            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] text-white/50 border border-white/10 text-xs hover:text-white/80 transition-colors">
              <BookOpen size={12} />
              Bible Search
            </button>

            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] text-white/50 border border-white/10 text-xs hover:text-white/80 transition-colors">
              <Image size={12} />
              Backgrounds
            </button>

            {/* Send to output */}
            <button className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-colors glow-purple">
              <Play size={12} />
              Send to Output
            </button>
          </div>
        </div>

        {/* Main canvas area */}
        <div className="flex-1 flex gap-4 p-4 overflow-hidden">
          <div className="flex-1">
            <SlideCanvas slide={currentSlide} />
          </div>

          {/* Scripture detection panel (right sidebar) */}
          {isListeningForScripture && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="shrink-0 overflow-hidden"
            >
              <ScriptureDetectionPanel />
            </motion.div>
          )}
        </div>

        {/* Slide strip at bottom */}
        <div className="h-24 shrink-0 border-t border-white/[0.05] bg-[#0a0a12] flex items-center gap-2 px-4 overflow-x-auto">
          {slides.map((slide, i) => (
            <SlideThumb
              key={slide.id}
              slide={slide}
              index={i}
              selected={slide.id === selectedSlide}
              onClick={() => setSelectedSlide(slide.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function SlideThumb({ slide, index, selected, onClick }: {
  slide: Slide; index: number; selected: boolean; onClick: () => void
}) {
  const typeColors: Record<string, string> = {
    scripture: 'border-purple-500/60',
    song: 'border-blue-500/60',
    announcement: 'border-orange-500/60',
    blank: 'border-white/15',
    media: 'border-emerald-500/60',
    countdown: 'border-red-500/60',
  }

  return (
    <motion.div
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className={cn(
        'shrink-0 w-32 h-18 rounded-md border-2 overflow-hidden cursor-pointer transition-all relative',
        selected ? typeColors[slide.type] ?? 'border-purple-500' : 'border-white/10',
        selected && 'shadow-lg',
      )}
      style={{ aspectRatio: '16/9', height: '72px', width: 'auto' }}
    >
      <div className="absolute inset-0 bg-black flex items-center justify-center p-1">
        <p className="text-white/60 text-[7px] text-center leading-tight line-clamp-3">
          {slide.body ?? slide.title}
        </p>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-4 bg-black/60 flex items-center px-1">
        <span className="text-[7px] text-white/40 truncate">{slide.title}</span>
      </div>
      {selected && (
        <div className="absolute top-0.5 right-0.5">
          <span className="text-[7px] bg-purple-600 text-white px-1 rounded">LIVE</span>
        </div>
      )}
    </motion.div>
  )
}

const DEMO_SLIDES: Slide[] = [
  {
    id: 'title-1',
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
  },
  {
    id: 'song-1',
    type: 'song',
    title: 'Amazing Grace — Verse 1',
    body: 'Amazing grace, how sweet the sound\nThat saved a wretch like me\nI once was lost, but now am found\nWas blind, but now I see',
  },
  {
    id: 'scripture-2',
    type: 'scripture',
    title: 'John 3:16',
    body: 'For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.',
    reference: 'John 3:16',
    translation: 'NIV',
  },
  {
    id: 'blank-1',
    type: 'blank',
    title: 'Blank',
    background: '#000000',
  },
]
