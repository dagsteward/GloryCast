import { useEffect, useRef, useState } from 'react'
import { Plus, Camera, Monitor, Play, Cpu, Wifi, AlertCircle, ChevronDown, X, RefreshCw } from 'lucide-react'
import { useMediaEngine, getStream } from '../../hooks/useMediaEngine'
import { cn } from '../../lib/utils'

const TYPE_ICON = {
  camera:  Camera,
  screen:  Monitor,
  media:   Play,
  pattern: Cpu,
}

const TYPE_COLOR = {
  camera:  'text-blue-400',
  screen:  'text-emerald-400',
  media:   'text-orange-400',
  pattern: 'text-purple-400',
}

// ─── Live thumbnail video element ──────────────────────────────────────────────
function StreamThumb({ sourceId, className }: { sourceId: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const stream = getStream(sourceId)
    if (ref.current && stream) {
      ref.current.srcObject = stream
      ref.current.play().catch(() => {})
    }
    return () => {
      if (ref.current) { ref.current.srcObject = null }
    }
  }, [sourceId])

  return (
    <video
      ref={ref}
      autoPlay muted playsInline
      className={cn('w-full h-full object-cover', className)}
    />
  )
}

// ─── Add source dropdown ────────────────────────────────────────────────────────
function AddSourceMenu({ cameras, onAddCamera, onAddScreen, onAddFile, onAddPattern }: {
  cameras: MediaDeviceInfo[]
  onAddCamera: (id: string, label: string) => void
  onAddScreen: () => void
  onAddFile: () => void
  onAddPattern: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600/35 text-purple-300 text-[10px] font-semibold transition-colors"
      >
        <Plus size={10} /> Add
        <ChevronDown size={9} className={cn('transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 w-52 rounded-xl bg-[#13131f] border border-white/10 shadow-2xl overflow-hidden">
            <div className="text-[9px] text-white/30 uppercase tracking-widest px-3 pt-2.5 pb-1">Cameras</div>
            {cameras.length === 0 ? (
              <div className="px-3 py-2 text-[10px] text-white/30">No cameras found</div>
            ) : cameras.map(cam => (
              <button key={cam.deviceId}
                onClick={() => { onAddCamera(cam.deviceId, cam.label || `Camera ${cam.deviceId.slice(0,6)}`); setOpen(false) }}
                className="w-full text-left px-3 py-2 text-[11px] text-white/65 hover:bg-white/[0.05] hover:text-white flex items-center gap-2 transition-colors">
                <Camera size={10} className="text-blue-400 shrink-0" />
                <span className="truncate">{cam.label || `Camera ${cam.deviceId.slice(0,6)}`}</span>
              </button>
            ))}

            <div className="border-t border-white/[0.05] my-1" />
            <div className="text-[9px] text-white/30 uppercase tracking-widest px-3 pt-1.5 pb-1">Other Sources</div>

            <button onClick={() => { onAddScreen(); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-[11px] text-white/65 hover:bg-white/[0.05] hover:text-white flex items-center gap-2 transition-colors">
              <Monitor size={10} className="text-emerald-400 shrink-0" /> Screen / Window / Tab
            </button>
            <button onClick={() => { onAddFile(); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-[11px] text-white/65 hover:bg-white/[0.05] hover:text-white flex items-center gap-2 transition-colors">
              <Play size={10} className="text-orange-400 shrink-0" /> Media File (MP4, MOV…)
            </button>
            <button onClick={() => { onAddPattern(); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-[11px] text-white/65 hover:bg-white/[0.05] hover:text-white flex items-center gap-2 transition-colors mb-1">
              <Cpu size={10} className="text-purple-400 shrink-0" /> Test Pattern (SMPTE)
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────
export function SourceLibrary() {
  const {
    cameras, permissionState,
    sources, previewId, programId,
    enumerateDevices, requestPermission,
    addCamera, addScreenSource, addMediaFile, addTestPattern,
    assignToPreview, removeSource,
  } = useMediaEngine()

  const fileRef = useRef<HTMLInputElement>(null)

  // Enumerate on mount (labels only available after permission grant)
  useEffect(() => {
    enumerateDevices()
    navigator.mediaDevices.addEventListener('devicechange', enumerateDevices)
    return () => navigator.mediaDevices.removeEventListener('devicechange', enumerateDevices)
  }, [])

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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const id = addMediaFile(file)
    if (!previewId) assignToPreview(id)
    e.target.value = ''
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-2.5 py-2 border-b border-white/[0.05] shrink-0">
        <span className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">Sources</span>
        <div className="flex items-center gap-1.5">
          <button onClick={() => enumerateDevices()} title="Refresh devices"
            className="p-1 rounded text-white/25 hover:text-white/60 hover:bg-white/[0.05] transition-colors">
            <RefreshCw size={9} />
          </button>
          <AddSourceMenu
            cameras={cameras}
            onAddCamera={handleAddCamera}
            onAddScreen={handleAddScreen}
            onAddFile={() => fileRef.current?.click()}
            onAddPattern={handleAddPattern}
          />
        </div>
      </div>

      {/* Permission gate */}
      {permissionState !== 'granted' && cameras.length === 0 && (
        <div className="mx-2 mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25">
          <div className="flex items-start gap-2">
            <AlertCircle size={12} className="text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] text-amber-300 font-semibold mb-1">Camera access needed</p>
              <p className="text-[9px] text-white/40 leading-relaxed mb-2">
                Grant permission to detect cameras and microphones.
              </p>
              <button onClick={requestPermission}
                className="px-3 py-1 rounded-lg bg-amber-500/25 hover:bg-amber-500/40 text-amber-300 text-[10px] font-semibold transition-colors">
                Allow Access
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active sources */}
      <div className="flex-1 overflow-y-auto py-1.5 space-y-1 px-1.5">
        {sources.length === 0 && permissionState === 'granted' && (
          <p className="text-[10px] text-white/20 text-center py-6 px-3 leading-relaxed">
            No sources added yet.<br />Click + Add to start.
          </p>
        )}

        {sources.map(src => {
          const Icon = TYPE_ICON[src.type]
          const color = TYPE_COLOR[src.type]
          const isPreview = src.id === previewId
          const isProgram = src.id === programId
          const stream = getStream(src.id)

          return (
            <div key={src.id}
              onClick={() => assignToPreview(src.id)}
              className={cn(
                'group relative rounded-xl overflow-hidden cursor-pointer border transition-all',
                isProgram ? 'border-red-500/70 shadow-[0_0_8px_rgba(239,68,68,0.3)]' :
                isPreview  ? 'border-emerald-500/60 shadow-[0_0_8px_rgba(16,185,129,0.25)]' :
                             'border-white/[0.07] hover:border-white/20',
              )}
            >
              {/* Thumbnail */}
              <div className="aspect-video bg-black relative">
                {stream ? (
                  <StreamThumb sourceId={src.id} />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900/80 to-black">
                    <Icon size={18} className={cn(color, 'opacity-40')} />
                  </div>
                )}

                {/* Status badges */}
                {isProgram && (
                  <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-red-500 text-[8px] font-bold text-white">PGM</div>
                )}
                {isPreview && !isProgram && (
                  <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-emerald-500 text-[8px] font-bold text-white">PVW</div>
                )}

                {/* Remove button */}
                <button
                  onClick={e => { e.stopPropagation(); removeSource(src.id) }}
                  className="absolute top-1 right-1 w-5 h-5 rounded bg-black/70 text-white/50 hover:text-red-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                >
                  <X size={9} />
                </button>
              </div>

              {/* Label row */}
              <div className="flex items-center gap-1.5 px-2 py-1.5 bg-black/40">
                <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', src.active ? 'bg-emerald-400' : 'bg-white/20')} />
                <Icon size={9} className={cn(color, 'shrink-0')} />
                <span className="text-[10px] text-white/65 truncate flex-1">{src.label}</span>
                <span className="text-[8px] text-white/25 uppercase shrink-0">{src.type}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Hidden file input */}
      <input ref={fileRef} type="file" accept="video/*,audio/*" className="hidden" onChange={handleFileChange} />
    </div>
  )
}
