import { cn } from '../../lib/utils'
import type { Slide } from '../../pages/Presentation'

const TYPE_COLORS: Record<string, string> = {
  scripture: 'bg-purple-500',
  song: 'bg-blue-500',
  announcement: 'bg-orange-500',
  blank: 'bg-white/20',
  media: 'bg-emerald-500',
  countdown: 'bg-red-500',
}

export function SlideLibrary({ slides, selectedId, onSelect, onEdit }: {
  slides: Slide[]; selectedId: string; onSelect: (id: string) => void; onEdit: (id: string) => void
}) {
  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
      {slides.map((slide, i) => (
        <div
          key={slide.id}
          onClick={() => onSelect(slide.id)}
          onDoubleClick={() => onEdit(slide.id)}
          className={cn(
            'flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-all',
            selectedId === slide.id
              ? 'bg-purple-600/20 border border-purple-500/30'
              : 'hover:bg-white/[0.03]',
          )}
        >
          <span className="text-[10px] text-white/20 font-mono w-4 shrink-0">{i + 1}</span>
          <div className={cn('w-1 h-8 rounded-full shrink-0', TYPE_COLORS[slide.type] ?? 'bg-white/20')} />
          <div className="flex-1 min-w-0">
            <div className="text-[11px] text-white/70 font-medium truncate">{slide.title}</div>
            <div className="text-[9px] text-white/30 capitalize">{slide.type}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
