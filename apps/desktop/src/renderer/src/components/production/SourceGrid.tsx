import { useRef, useEffect, useState } from 'react'
import { Plus, Camera, Monitor, Play, Cpu, ChevronDown, X, RefreshCw } from 'lucide-react'
import { useMediaEngine, getStream } from '../../hooks/useMediaEngine'
import { cn } from '../../lib/utils'

type Tab = 'video' | 'media' | 'ndi' | 'capture' | 'virtual'

// ─── Live thumbnail ───────────────────────────────────────────────────────────

function MiniThumb({ sourceId }: { sourceId: string }) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const stream = getStream(sourceId)
    const el = ref.current
    if (!el) return
    if (stream) { el.srcObject = stream; el.play().catch(() => {}) }
    else el.srcObject = null
    return () => { if (el) el.srcObject = null }
  }, [sourceId])

  return (
    <video ref={ref} autoPlay muted playsInline
      className="absolute inset-0 w-full h-full object-cover" />
  )
}

// ─── SourceGrid ───────────────────────────────────────────────────────────────

export function SourceGrid() {
  const {
    sources, previewId, programId,
    cameras, assignToPreview, removeSource,
    addCamera, addScreenSource, addMediaFile, addTestPattern,
    enumerateDevices,
  } = useMediaEngine()

  const [tab, setTab] = useState<Tab>('video')
  const [menuOpen, setMenuOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const TABS: { id: Tab; label: string }[] = [
    { id: 'video',   label: 'Video Sources' },
    { id: 'media',   label: 'Media' },
    { id: 'ndi',     label: 'NDI' },
    { id: 'capture', label: 'Capture Cards' },
    { id: 'virtual', label: 'Virtual' },
  ]

  const tabSources = sources.filter(s => {
    if (tab === 'video')   return s.type === 'camera'
    if (tab === 'media')   return s.type === 'media' || s.type === 'screen'
    if (tab === 'virtual') return s.type === 'pattern'
    return false
  })

  async function handleAddCamera(deviceId: string, label: string) {
    const id = await addCamera(deviceId, label)
    if (id && !previewId) assignToPreview(id)
  }

  async function handleAddScreen() {
    const id = await addScreenSource()
    if (id && !previewId) assignToPreview(id)
  }

  function handleAddPattern() {
    const id = addTestPattern()
    if (!previewId) assignToPreview(id)
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const id = addMediaFile(file)
    if (!previewId) assignToPreview(id)
    e.target.value = ''
  }

  const CELL_W = 148
  const PAD_CELLS = Math.max(0, 8 - tabSources.length)

  return (
    <div className="flex flex-col bg-chrome border-t border-white/[0.05] shrink-0" style={{ height: '140px' }}>
      {/* Tab header */}
      <div className="flex items-stretch border-b border-white/[0.05] shrink-0" style={{ height: '26px' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn(
              'px-3 h-full text-[9px] font-semibold uppercase tracking-wider border-b-2 transition-colors shrink-0',
              tab === t.id
                ? 'text-white/80 border-purple-500 bg-purple-500/5'
                : 'text-white/25 border-transparent hover:text-white/50',
            )}>
            {t.label}
          </button>
        ))}

        <div className="flex-1" />

        <button onClick={() => enumerateDevices()}
          className="px-2 text-white/20 hover:text-white/50 transition-colors">
          <RefreshCw size={9} />
        </button>

        {/* Add menu */}
        <div className="relative flex items-center pr-2">
          <button onClick={() => setMenuOpen(v => !v)}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-purple-600/20 hover:bg-purple-600/35 text-purple-300 text-[9px] font-semibold transition-colors">
            <Plus size={9} /> Add
            <ChevronDown size={8} className={cn('transition-transform', menuOpen && 'rotate-180')} />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 bottom-7 z-20 w-52 rounded-xl bg-[#13131f] border border-white/10 shadow-2xl overflow-hidden">
                <div className="text-[9px] text-white/30 uppercase px-3 pt-2.5 pb-1">Cameras</div>
                {cameras.length === 0 ? (
                  <p className="px-3 py-1.5 text-[10px] text-white/25">No cameras detected</p>
                ) : cameras.map(cam => (
                  <button key={cam.deviceId}
                    onClick={() => { handleAddCamera(cam.deviceId, cam.label || `Cam ${cam.deviceId.slice(0, 4)}`); setMenuOpen(false) }}
                    className="w-full text-left px-3 py-1.5 text-[10px] text-white/65 hover:bg-white/[0.05] hover:text-white flex items-center gap-2 transition-colors">
                    <Camera size={9} className="text-blue-400 shrink-0" />
                    <span className="truncate">{cam.label || `Camera ${cam.deviceId.slice(0, 6)}`}</span>
                  </button>
                ))}
                <div className="border-t border-white/[0.05] my-1" />
                <button onClick={() => { handleAddScreen(); setMenuOpen(false) }}
                  className="w-full text-left px-3 py-1.5 text-[10px] text-white/65 hover:bg-white/[0.05] hover:text-white flex items-center gap-2 transition-colors">
                  <Monitor size={9} className="text-emerald-400 shrink-0" /> Screen / Window / Tab
                </button>
                <button onClick={() => { fileRef.current?.click(); setMenuOpen(false) }}
                  className="w-full text-left px-3 py-1.5 text-[10px] text-white/65 hover:bg-white/[0.05] hover:text-white flex items-center gap-2 transition-colors">
                  <Play size={9} className="text-orange-400 shrink-0" /> Media File (MP4, MOV…)
                </button>
                <button onClick={() => { handleAddPattern(); setMenuOpen(false) }}
                  className="w-full text-left px-3 py-1.5 text-[10px] text-white/65 hover:bg-white/[0.05] hover:text-white flex items-center gap-2 transition-colors pb-2">
                  <Cpu size={9} className="text-purple-400 shrink-0" /> Test Pattern (SMPTE)
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Thumbnail strip */}
      <div className="flex items-start gap-1.5 px-2 py-1.5 overflow-x-auto flex-1">
        {tabSources.map((src, idx) => {
          const stream = getStream(src.id)
          const isPgm = src.id === programId
          const isPvw = src.id === previewId
          return (
            <div key={src.id}
              onClick={() => assignToPreview(src.id)}
              className={cn(
                'group relative shrink-0 rounded-lg overflow-hidden cursor-pointer border transition-all bg-black flex flex-col',
                isPgm ? 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.45)]' :
                isPvw  ? 'border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' :
                         'border-white/[0.08] hover:border-white/25',
              )}
              style={{ width: `${CELL_W}px`, minWidth: `${CELL_W}px` }}
            >
              {/* Video area 16:9 */}
              <div className="relative" style={{ width: `${CELL_W}px`, height: `${Math.round(CELL_W * 9 / 16)}px` }}>
                {stream
                  ? <MiniThumb sourceId={src.id} />
                  : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
                      <span className="text-[9px] text-white/20 text-center px-1">{src.label}</span>
                    </div>
                  )}

                {/* Source number */}
                <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded bg-black/70 flex items-center justify-center">
                  <span className="text-[8px] font-bold text-white/50">{idx + 1}</span>
                </div>

                {/* PGM badge */}
                {isPgm && (
                  <div className="absolute top-0.5 right-0.5 px-1 py-0.5 rounded-sm bg-red-500 text-[7px] font-bold text-white flex items-center gap-0.5">
                    <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                    PGM
                  </div>
                )}
                {/* PVW badge */}
                {isPvw && !isPgm && (
                  <div className="absolute top-0.5 right-0.5 px-1 py-0.5 rounded-sm bg-emerald-500 text-[7px] font-bold text-white">PVW</div>
                )}

                {/* Live dot */}
                {stream && !isPgm && !isPvw && (
                  <div className="absolute bottom-0.5 left-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                )}

                {/* Remove button */}
                <button
                  onClick={e => { e.stopPropagation(); removeSource(src.id) }}
                  className="absolute top-0.5 right-0.5 w-5 h-5 rounded bg-black/70 text-white/30 hover:text-red-400 items-center justify-center hidden group-hover:flex transition-all z-10">
                  <X size={8} />
                </button>
              </div>

              {/* Label row */}
              <div className="px-1.5 py-0.5 bg-black/60 border-t border-white/[0.05]">
                <span className="text-[8px] text-white/50 truncate block">{src.label}</span>
              </div>
            </div>
          )
        })}

        {/* Empty placeholder cells */}
        {Array.from({ length: PAD_CELLS }).map((_, i) => (
          <div key={`empty-${i}`}
            className="shrink-0 rounded-lg border border-dashed border-white/[0.06] flex flex-col items-center justify-center bg-black/20"
            style={{ width: `${CELL_W}px`, minWidth: `${CELL_W}px`, height: `${Math.round(CELL_W * 9 / 16) + 22}px` }}>
            <span className="text-[9px] text-white/12">{tabSources.length + i + 1}</span>
          </div>
        ))}
      </div>

      <input ref={fileRef} type="file" accept="video/*,audio/*" className="hidden" onChange={handleFile} />
    </div>
  )
}
