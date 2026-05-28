import { MonitorPlay, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const RECENT_SLIDES = [
  { title: 'Romans 8:28', type: 'scripture', time: '10:32 AM', active: true },
  { title: 'Amazing Grace — V1', type: 'song', time: '10:18 AM', active: false },
  { title: 'John 3:16', type: 'scripture', time: '10:12 AM', active: false },
  { title: 'Welcome Slide', type: 'announcement', time: '9:45 AM', active: false },
  { title: 'Offering', type: 'announcement', time: '9:30 AM', active: false },
]

const TYPE_COLORS: Record<string, string> = {
  scripture: 'bg-purple-500',
  song: 'bg-blue-500',
  announcement: 'bg-orange-500',
}

export function RecentSlidesWidget() {
  const navigate = useNavigate()

  return (
    <div className="card-premium p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white/80">Presentation</h3>
        <MonitorPlay size={14} className="text-white/30" />
      </div>

      <div className="flex-1 space-y-1">
        {RECENT_SLIDES.map((slide, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 p-2 rounded-lg ${slide.active ? 'bg-purple-600/15 border border-purple-500/25' : 'hover:bg-white/[0.03]'} transition-colors cursor-pointer`}
          >
            <div className={`w-1.5 h-6 rounded-full ${TYPE_COLORS[slide.type] ?? 'bg-white/20'}`} />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-white/75 truncate font-medium">{slide.title}</div>
              <div className="text-[10px] text-white/30 capitalize">{slide.type}</div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] text-white/25 font-mono">{slide.time}</span>
              {slide.active && (
                <span className="text-[9px] bg-purple-600 text-white px-1.5 py-0.5 rounded font-bold">LIVE</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => navigate('/presentation')}
        className="mt-3 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-colors"
      >
        Open Presentation
        <ChevronRight size={12} />
      </button>
    </div>
  )
}
