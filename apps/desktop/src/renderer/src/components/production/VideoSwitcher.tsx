import { useState } from 'react'
import { motion } from 'framer-motion'
import { Scissors, Blend, Zap, ChevronDown } from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import { cn } from '../../lib/utils'

type Transition = 'cut' | 'fade' | 'stinger' | 'wipe' | 'zoom'

const SOURCES = [
  { id: 'cam1', label: 'CAM 1' },
  { id: 'cam2', label: 'CAM 2' },
  { id: 'cam3', label: 'CAM 3' },
  { id: 'capture1', label: 'HDMI 1' },
  { id: 'screen1', label: 'SCREEN' },
  { id: 'media1', label: 'MEDIA' },
  { id: 'ndi1', label: 'NDI' },
  { id: 'black', label: 'BLACK' },
]

export function VideoSwitcher() {
  const { programSource, previewSource, setProgramSource, setPreviewSource } = useAppStore()
  const [transition, setTransition] = useState<Transition>('cut')
  const [transitionDuration, setTransitionDuration] = useState(500)
  const [autoTransition, setAutoTransition] = useState(false)

  const handleCut = () => {
    if (previewSource) {
      setProgramSource(previewSource)
    }
  }

  const handleAutoTransition = () => {
    if (previewSource) {
      setProgramSource(previewSource)
    }
  }

  return (
    <div className="flex items-stretch gap-0 bg-[#080810] border-t border-white/[0.05]" style={{ height: '100px' }}>
      {/* Preview bus */}
      <div className="flex-1 p-2">
        <div className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest mb-1.5 px-1">
          Preview
        </div>
        <div className="flex gap-1">
          {SOURCES.map(src => (
            <SwitcherButton
              key={src.id}
              label={src.label}
              active={previewSource === src.id}
              variant="preview"
              onClick={() => setPreviewSource(src.id)}
            />
          ))}
        </div>
      </div>

      {/* Transition controls */}
      <div className="flex flex-col items-center justify-center gap-2 px-4 border-x border-white/[0.06] shrink-0 w-52">
        {/* Transition type selector */}
        <div className="flex gap-1">
          {(['cut', 'fade', 'wipe', 'stinger'] as Transition[]).map(t => (
            <button
              key={t}
              onClick={() => setTransition(t)}
              className={cn(
                'px-2 py-1 rounded text-[10px] font-medium uppercase tracking-wider transition-colors',
                transition === t
                  ? 'bg-white/15 text-white'
                  : 'text-white/30 hover:text-white/60',
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Duration slider */}
        {transition !== 'cut' && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/30">Duration</span>
            <input
              type="range"
              min={100}
              max={3000}
              step={100}
              value={transitionDuration}
              onChange={e => setTransitionDuration(Number(e.target.value))}
              className="w-20 accent-purple-500"
            />
            <span className="text-[10px] font-mono text-white/50 w-10">
              {transitionDuration}ms
            </span>
          </div>
        )}

        {/* Cut + Auto transition */}
        <div className="flex gap-2">
          <button
            onClick={handleCut}
            className="px-4 py-1.5 rounded bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <Scissors size={11} />
            CUT
          </button>
          <button
            onClick={handleAutoTransition}
            className="px-4 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 glow-purple"
          >
            <Blend size={11} />
            AUTO
          </button>
        </div>
      </div>

      {/* Program bus */}
      <div className="flex-1 p-2">
        <div className="text-[9px] text-red-400 font-bold uppercase tracking-widest mb-1.5 px-1">
          Program
        </div>
        <div className="flex gap-1">
          {SOURCES.map(src => (
            <SwitcherButton
              key={src.id}
              label={src.label}
              active={programSource === src.id}
              variant="program"
              onClick={() => setProgramSource(src.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function SwitcherButton({
  label,
  active,
  variant,
  onClick,
}: {
  label: string
  active: boolean
  variant: 'program' | 'preview'
  onClick: () => void
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      className={cn(
        'flex-1 min-w-0 h-10 rounded flex items-center justify-center text-[10px] font-bold uppercase tracking-wide transition-all',
        active && variant === 'program'
          ? 'bg-red-600 text-white shadow-[0_0_12px_rgba(239,68,68,0.5)]'
          : active && variant === 'preview'
          ? 'bg-emerald-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.5)]'
          : 'bg-white/[0.06] text-white/40 hover:bg-white/10 hover:text-white/70',
      )}
    >
      {label}
    </motion.button>
  )
}
