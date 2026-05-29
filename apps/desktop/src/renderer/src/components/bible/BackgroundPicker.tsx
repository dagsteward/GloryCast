import { useRef } from 'react'
import { Image as ImageIcon, Film, Upload, X, Check, Sparkles } from 'lucide-react'
import { useBackgroundStore, type SlideBackground } from '../../stores/backgroundStore'
import { cn } from '../../lib/utils'

// Compact horizontal background chooser for the Bible producer panel.
// Lets the operator pick a built-in gradient / motion graphic, or upload a
// custom image or video to use as a background or template.

function Swatch({ bg }: { bg: SlideBackground }) {
  const selectedId   = useBackgroundStore(s => s.selectedId)
  const select       = useBackgroundStore(s => s.select)
  const removeCustom = useBackgroundStore(s => s.removeCustom)
  const active = selectedId === bg.id

  return (
    <button
      onClick={() => select(bg.id)}
      title={bg.label}
      className={cn(
        'group relative shrink-0 w-16 h-10 rounded-lg overflow-hidden border transition-all',
        active ? 'border-purple-500 ring-1 ring-purple-500/50' : 'border-white/[0.08] hover:border-white/25',
      )}
    >
      {/* Preview fill */}
      {(bg.kind === 'gradient' || bg.kind === 'motion') && (
        <div className={cn('absolute inset-0', bg.className)} />
      )}
      {bg.kind === 'solid' && <div className="absolute inset-0" style={{ background: bg.color }} />}
      {bg.kind === 'image' && bg.url && (
        <div className="absolute inset-0 bg-center bg-cover" style={{ backgroundImage: `url(${bg.url})` }} />
      )}
      {bg.kind === 'video' && bg.url && (
        <video src={bg.url} muted loop autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
      )}

      {/* Motion / kind badge */}
      {bg.kind === 'motion' && (
        <Sparkles size={9} className="absolute top-0.5 left-0.5 text-white/80 drop-shadow" />
      )}
      {bg.kind === 'image' && <ImageIcon size={9} className="absolute top-0.5 left-0.5 text-white/80 drop-shadow" />}
      {bg.kind === 'video' && <Film size={9} className="absolute top-0.5 left-0.5 text-white/80 drop-shadow" />}

      {/* Label */}
      <span className="absolute bottom-0 inset-x-0 text-[7px] text-white/90 font-medium bg-black/45 px-1 py-px truncate text-left">
        {bg.label}
      </span>

      {/* Selected tick */}
      {active && (
        <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-purple-600 flex items-center justify-center">
          <Check size={8} className="text-white" />
        </span>
      )}

      {/* Remove custom */}
      {bg.custom && (
        <span
          role="button"
          onClick={e => { e.stopPropagation(); removeCustom(bg.id) }}
          className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-black/70 text-white/60 hover:text-red-400 items-center justify-center hidden group-hover:flex"
        >
          <X size={8} />
        </span>
      )}
    </button>
  )
}

export function BackgroundPicker() {
  const backgrounds = useBackgroundStore(s => s.all())
  const addImage    = useBackgroundStore(s => s.addImage)
  const addVideo    = useBackgroundStore(s => s.addVideo)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type.startsWith('video/')) addVideo(file)
    else addImage(file)
    e.target.value = ''
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[9px] text-white/35 uppercase tracking-widest">Background</span>
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/[0.05] hover:bg-white/[0.09] text-white/50 hover:text-white/80 text-[9px] font-medium transition-colors"
        >
          <Upload size={9} /> Upload
        </button>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {backgrounds.map(bg => <Swatch key={bg.id} bg={bg} />)}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleUpload}
      />
    </div>
  )
}
