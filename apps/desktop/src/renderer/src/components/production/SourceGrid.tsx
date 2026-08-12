import { useRef, useEffect, useState } from 'react'
import {
  Plus, Camera, Monitor, Play, Cpu, ChevronDown, X, RefreshCw,
  BookOpen, Music, Send, Network, Globe, ArrowLeft,
  Palette, Image as ImageIcon, Timer, Clock,
} from 'lucide-react'
import {
  useMediaEngine, getStream,
  type NetworkProtocol, type MediaSourceMeta,
} from '../../hooks/useMediaEngine'
import { useServiceStore } from '../../stores/serviceStore'
import { cn } from '../../lib/utils'

type Tab = 'video' | 'media' | 'graphics' | 'ndi' | 'capture' | 'virtual'

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

// ─── Network ingest connect form (NDI / RTMP / SRT / HLS / WebRTC) ─────────────

const PROTOCOL_META: Record<NetworkProtocol, { label: string; hint: string; placeholder: string }> = {
  ndi:  { label: 'NDI Source',          hint: 'Receive an NDI stream from a PTZ camera, encoder or another machine on the LAN.', placeholder: 'NDI source name  e.g. STUDIO-PC (Channel 1)' },
  rtmp: { label: 'Stream URL',          hint: 'Relay an RTMP / SRT / HLS feed. HLS (.m3u8) and progressive MP4/WebM play directly.', placeholder: 'https://… .m3u8  ·  rtmp://…  ·  srt://…' },
  srt:  { label: 'SRT Source',          hint: 'Low-latency SRT feed (requires the stream gateway).', placeholder: 'srt://HOST:port' },
  hls:  { label: 'HLS Source',          hint: 'HTTP Live Streaming playlist.', placeholder: 'https://… .m3u8' },
  whep: { label: 'WebRTC Source',       hint: 'Sub-second WebRTC (WHEP) ingest.', placeholder: 'https://HOST/whep' },
}

function ConnectForm({
  protocol, onCancel, onConnect,
}: {
  protocol: NetworkProtocol
  onCancel: () => void
  onConnect: (label: string, url: string) => void
}) {
  const meta = PROTOCOL_META[protocol]
  const [label, setLabel] = useState('')
  const [url, setUrl]     = useState('')

  return (
    <div className="p-3 space-y-2.5">
      <button onClick={onCancel}
        className="flex items-center gap-1 text-[9px] text-white/40 hover:text-white/70 transition-colors">
        <ArrowLeft size={9} /> Back
      </button>
      <div>
        <p className="text-[11px] font-semibold text-white/85">{meta.label}</p>
        <p className="text-[9px] text-white/35 leading-snug mt-0.5">{meta.hint}</p>
      </div>
      <div className="space-y-1.5">
        <input
          value={label} onChange={e => setLabel(e.target.value)}
          placeholder="Display name (optional)"
          className="w-full px-2 py-1.5 rounded-md bg-white/[0.05] border border-white/10 text-[10px] text-white/85 placeholder:text-white/25 focus:outline-none focus:border-purple-500/60"
        />
        <input
          value={url} onChange={e => setUrl(e.target.value)}
          placeholder={meta.placeholder}
          onKeyDown={e => { if (e.key === 'Enter' && url.trim()) onConnect(label, url) }}
          className="w-full px-2 py-1.5 rounded-md bg-white/[0.05] border border-white/10 text-[10px] font-mono text-white/85 placeholder:text-white/25 focus:outline-none focus:border-purple-500/60"
        />
      </div>
      <div className="flex gap-1.5">
        <button onClick={onCancel}
          className="flex-1 py-1.5 rounded-md bg-white/[0.05] hover:bg-white/[0.09] text-[10px] text-white/60 transition-colors">
          Cancel
        </button>
        <button
          onClick={() => onConnect(label, url)}
          className="flex-1 py-1.5 rounded-md bg-purple-600 hover:bg-purple-500 text-[10px] font-semibold text-white transition-colors">
          {url.trim() ? 'Connect' : 'Add Slot'}
        </button>
      </div>
    </div>
  )
}

// ─── Colour source form ────────────────────────────────────────────────────────

const COLOR_SWATCHES = ['#000000', '#ffffff', '#7c3aed', '#2563eb', '#059669', '#dc2626', '#f59e0b', '#0ea5e9']

function ColorForm({ onCancel, onAdd }: { onCancel: () => void; onAdd: (color: string, label: string) => void }) {
  const [color, setColor] = useState('#000000')
  const [label, setLabel] = useState('')
  return (
    <div className="p-3 space-y-2.5">
      <button onClick={onCancel}
        className="flex items-center gap-1 text-[9px] text-white/40 hover:text-white/70 transition-colors">
        <ArrowLeft size={9} /> Back
      </button>
      <div>
        <p className="text-[11px] font-semibold text-white/85">Colour Source</p>
        <p className="text-[9px] text-white/35 leading-snug mt-0.5">A solid-colour fill — useful as a backdrop, bumper or for keying.</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {COLOR_SWATCHES.map(c => (
          <button key={c} onClick={() => setColor(c)}
            className={cn('w-6 h-6 rounded-md border transition-all',
              color === c ? 'border-white ring-2 ring-purple-400/70' : 'border-white/15 hover:border-white/40')}
            style={{ backgroundColor: c }} />
        ))}
        <input type="color" value={color} onChange={e => setColor(e.target.value)}
          className="w-6 h-6 rounded-md bg-transparent border border-white/15 cursor-pointer p-0" />
      </div>
      <input
        value={label} onChange={e => setLabel(e.target.value)}
        placeholder="Display name (optional)"
        className="w-full px-2 py-1.5 rounded-md bg-white/[0.05] border border-white/10 text-[10px] text-white/85 placeholder:text-white/25 focus:outline-none focus:border-purple-500/60"
      />
      <div className="flex gap-1.5">
        <button onClick={onCancel}
          className="flex-1 py-1.5 rounded-md bg-white/[0.05] hover:bg-white/[0.09] text-[10px] text-white/60 transition-colors">Cancel</button>
        <button onClick={() => onAdd(color, label)}
          className="flex-1 py-1.5 rounded-md bg-purple-600 hover:bg-purple-500 text-[10px] font-semibold text-white transition-colors">Add Source</button>
      </div>
    </div>
  )
}

// ─── Countdown source form ──────────────────────────────────────────────────────

function CountdownForm({ onCancel, onAdd }: { onCancel: () => void; onAdd: (minutes: number, label: string) => void }) {
  const [minutes, setMinutes] = useState(5)
  const [label, setLabel]     = useState('')
  return (
    <div className="p-3 space-y-2.5">
      <button onClick={onCancel}
        className="flex items-center gap-1 text-[9px] text-white/40 hover:text-white/70 transition-colors">
        <ArrowLeft size={9} /> Back
      </button>
      <div>
        <p className="text-[11px] font-semibold text-white/85">Countdown Timer</p>
        <p className="text-[9px] text-white/35 leading-snug mt-0.5">A live MM:SS countdown — perfect for "service starts soon" pre-rolls.</p>
      </div>
      <div className="flex items-center gap-1.5">
        {[5, 10, 15, 30].map(m => (
          <button key={m} onClick={() => setMinutes(m)}
            className={cn('flex-1 py-1.5 rounded-md text-[10px] font-semibold transition-colors',
              minutes === m ? 'bg-purple-600 text-white' : 'bg-white/[0.05] text-white/55 hover:bg-white/[0.09]')}>
            {m}m
          </button>
        ))}
        <input type="number" min={1} value={minutes}
          onChange={e => setMinutes(Math.max(1, Number(e.target.value) || 1))}
          className="w-12 px-1.5 py-1.5 rounded-md bg-white/[0.05] border border-white/10 text-[10px] text-center text-white/85 focus:outline-none focus:border-purple-500/60" />
      </div>
      <input
        value={label} onChange={e => setLabel(e.target.value)}
        placeholder="Caption  e.g. Service starts in"
        className="w-full px-2 py-1.5 rounded-md bg-white/[0.05] border border-white/10 text-[10px] text-white/85 placeholder:text-white/25 focus:outline-none focus:border-purple-500/60"
      />
      <div className="flex gap-1.5">
        <button onClick={onCancel}
          className="flex-1 py-1.5 rounded-md bg-white/[0.05] hover:bg-white/[0.09] text-[10px] text-white/60 transition-colors">Cancel</button>
        <button onClick={() => onAdd(minutes, label)}
          className="flex-1 py-1.5 rounded-md bg-purple-600 hover:bg-purple-500 text-[10px] font-semibold text-white transition-colors">Add Timer</button>
      </div>
    </div>
  )
}

// ─── SourceGrid ───────────────────────────────────────────────────────────────

export function SourceGrid() {
  const {
    sources, previewId, programId,
    cameras, assignToPreview, removeSource,
    addCamera, addScreenSource, addMediaFile, addTestPattern,
    addNetworkSource, reorderSources, enumerateDevices,
    addColorSource, addImageSource, addCountdownSource, addClockSource,
  } = useMediaEngine()

  // Shared graphics bus (scripture / song lower-thirds) — switchable sources.
  const graphics        = useServiceStore(s => s.graphics)
  const gfxPreview      = useServiceStore(s => s.preview)
  const gfxProgram      = useServiceStore(s => s.program)
  const sendToPreview   = useServiceStore(s => s.sendToPreview)
  const removeGraphic   = useServiceStore(s => s.removeGraphic)
  const reorderGraphics = useServiceStore(s => s.reorderGraphics)

  const [tab, setTab] = useState<Tab>('video')
  const [menuOpen, setMenuOpen] = useState(false)
  const [connectProto, setConnectProto] = useState<NetworkProtocol | null>(null)
  // Which generated-source param form is open inside the Add menu (null = none).
  const [genForm, setGenForm] = useState<'color' | 'countdown' | null>(null)
  const fileRef    = useRef<HTMLInputElement>(null)  // media files (video/audio)
  const imgFileRef = useRef<HTMLInputElement>(null)  // still image source

  // Drag-and-drop reorder state (ManyCam-style). The id being dragged lives in a
  // ref (no re-render); the hover target is state so we can highlight the slot.
  const dragId = useRef<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  const ndiCount = sources.filter(s => s.type === 'ndi' || s.type === 'network').length
  const genCount = sources.filter(s =>
    s.type === 'pattern' || s.type === 'color' || s.type === 'image' ||
    s.type === 'timer'   || s.type === 'clock').length

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: 'video',    label: 'Video Sources', count: sources.filter(s => s.type === 'camera').length },
    { id: 'media',    label: 'Media',         count: sources.filter(s => s.type === 'media' || s.type === 'screen').length },
    { id: 'graphics', label: 'Graphics',      count: graphics.length },
    { id: 'ndi',      label: 'NDI / Network', count: ndiCount },
    { id: 'capture',  label: 'Capture Cards' },
    { id: 'virtual',  label: 'Generated',     count: genCount },
  ]

  const tabSources = sources.filter(s => {
    if (tab === 'video')   return s.type === 'camera'
    if (tab === 'media')   return s.type === 'media' || s.type === 'screen'
    if (tab === 'ndi')     return s.type === 'ndi' || s.type === 'network'
    if (tab === 'virtual') return s.type === 'pattern' || s.type === 'color' ||
                                  s.type === 'image'   || s.type === 'timer' || s.type === 'clock'
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

  function handleConnect(label: string, url: string) {
    if (!connectProto) return
    const id = addNetworkSource({ protocol: connectProto, url: url.trim() || undefined, label })
    if (id && !previewId) assignToPreview(id)
    setConnectProto(null)
    setMenuOpen(false)
    setTab('ndi')
  }

  function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const id = addImageSource(file)
    if (!previewId) assignToPreview(id)
    e.target.value = ''
    setTab('virtual')
  }

  function handleAddColor(color: string, label: string) {
    const id = addColorSource(color, label.trim() || undefined)
    if (id && !previewId) assignToPreview(id)
    setGenForm(null); closeMenu(); setTab('virtual')
  }

  function handleAddCountdown(minutes: number, label: string) {
    const id = addCountdownSource(minutes, label.trim() || undefined)
    if (id && !previewId) assignToPreview(id)
    setGenForm(null); closeMenu(); setTab('virtual')
  }

  function handleAddClock() {
    const id = addClockSource()
    if (id && !previewId) assignToPreview(id)
    closeMenu(); setTab('virtual')
  }

  function closeMenu() { setMenuOpen(false); setConnectProto(null); setGenForm(null) }

  // ── Drag-and-drop handlers (shared shape for sources + graphics) ──
  function makeDragProps(id: string, onReorder: (from: string, to: string) => void) {
    return {
      draggable: true,
      onDragStart: (e: React.DragEvent) => { dragId.current = id; e.dataTransfer.effectAllowed = 'move' },
      onDragOver:  (e: React.DragEvent) => { e.preventDefault(); if (dragOverId !== id) setDragOverId(id) },
      onDragLeave: () => setDragOverId(cur => (cur === id ? null : cur)),
      onDrop:      (e: React.DragEvent) => {
        e.preventDefault()
        if (dragId.current && dragId.current !== id) onReorder(dragId.current, id)
        dragId.current = null; setDragOverId(null)
      },
      onDragEnd:   () => { dragId.current = null; setDragOverId(null) },
    }
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
            {!!t.count && (
              <span className="ml-1.5 px-1 py-px rounded bg-purple-500/25 text-purple-300 text-[8px] font-bold align-middle">
                {t.count}
              </span>
            )}
          </button>
        ))}

        <div className="flex-1" />

        <button onClick={() => enumerateDevices()}
          className="px-2 text-white/20 hover:text-white/50 transition-colors">
          <RefreshCw size={9} />
        </button>

        {/* Add menu */}
        <div className="relative flex items-center pr-2">
          <button onClick={() => { setMenuOpen(v => !v); setConnectProto(null) }}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-purple-600/20 hover:bg-purple-600/35 text-purple-300 text-[9px] font-semibold transition-colors">
            <Plus size={9} /> Add
            <ChevronDown size={8} className={cn('transition-transform', menuOpen && 'rotate-180')} />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={closeMenu} />
              <div className="absolute right-0 bottom-7 z-20 w-60 rounded-xl bg-chrome border border-white/10 shadow-2xl overflow-hidden">
                {connectProto ? (
                  <ConnectForm
                    protocol={connectProto}
                    onCancel={() => setConnectProto(null)}
                    onConnect={handleConnect}
                  />
                ) : genForm === 'color' ? (
                  <ColorForm onCancel={() => setGenForm(null)} onAdd={handleAddColor} />
                ) : genForm === 'countdown' ? (
                  <CountdownForm onCancel={() => setGenForm(null)} onAdd={handleAddCountdown} />
                ) : (
                  <div className="max-h-72 overflow-y-auto">
                    <div className="text-[9px] text-white/30 uppercase px-3 pt-2.5 pb-1">Cameras</div>
                    {cameras.length === 0 ? (
                      <p className="px-3 py-1.5 text-[10px] text-white/25">No cameras detected</p>
                    ) : cameras.map(cam => (
                      <button key={cam.deviceId}
                        onClick={() => { handleAddCamera(cam.deviceId, cam.label || `Cam ${cam.deviceId.slice(0, 4)}`); closeMenu() }}
                        className="w-full text-left px-3 py-1.5 text-[10px] text-white/65 hover:bg-white/[0.05] hover:text-white flex items-center gap-2 transition-colors">
                        <Camera size={9} className="text-blue-400 shrink-0" />
                        <span className="truncate">{cam.label || `Camera ${cam.deviceId.slice(0, 6)}`}</span>
                      </button>
                    ))}

                    <div className="border-t border-white/[0.05] my-1" />
                    <button onClick={() => { handleAddScreen(); closeMenu() }}
                      className="w-full text-left px-3 py-1.5 text-[10px] text-white/65 hover:bg-white/[0.05] hover:text-white flex items-center gap-2 transition-colors">
                      <Monitor size={9} className="text-emerald-400 shrink-0" /> Screen / Window / Tab
                    </button>
                    <button onClick={() => { fileRef.current?.click(); closeMenu() }}
                      className="w-full text-left px-3 py-1.5 text-[10px] text-white/65 hover:bg-white/[0.05] hover:text-white flex items-center gap-2 transition-colors">
                      <Play size={9} className="text-orange-400 shrink-0" /> Media File (MP4, MOV…)
                    </button>

                    <div className="text-[9px] text-white/30 uppercase px-3 pt-2 pb-1">Generated Sources</div>
                    <button onClick={() => setGenForm('color')}
                      className="w-full text-left px-3 py-1.5 text-[10px] text-white/65 hover:bg-white/[0.05] hover:text-white flex items-center gap-2 transition-colors">
                      <Palette size={9} className="text-pink-400 shrink-0" /> Colour Source
                    </button>
                    <button onClick={() => { imgFileRef.current?.click(); closeMenu() }}
                      className="w-full text-left px-3 py-1.5 text-[10px] text-white/65 hover:bg-white/[0.05] hover:text-white flex items-center gap-2 transition-colors">
                      <ImageIcon size={9} className="text-amber-400 shrink-0" /> Image (PNG, JPG…)
                    </button>
                    <button onClick={() => setGenForm('countdown')}
                      className="w-full text-left px-3 py-1.5 text-[10px] text-white/65 hover:bg-white/[0.05] hover:text-white flex items-center gap-2 transition-colors">
                      <Timer size={9} className="text-rose-400 shrink-0" /> Countdown Timer
                    </button>
                    <button onClick={handleAddClock}
                      className="w-full text-left px-3 py-1.5 text-[10px] text-white/65 hover:bg-white/[0.05] hover:text-white flex items-center gap-2 transition-colors">
                      <Clock size={9} className="text-sky-400 shrink-0" /> Clock / Date
                    </button>
                    <button onClick={() => { handleAddPattern(); closeMenu() }}
                      className="w-full text-left px-3 py-1.5 text-[10px] text-white/65 hover:bg-white/[0.05] hover:text-white flex items-center gap-2 transition-colors">
                      <Cpu size={9} className="text-purple-400 shrink-0" /> Test Pattern (SMPTE)
                    </button>

                    <div className="text-[9px] text-white/30 uppercase px-3 pt-2 pb-1">Network Ingest</div>
                    <button onClick={() => setConnectProto('ndi')}
                      className="w-full text-left px-3 py-1.5 text-[10px] text-white/65 hover:bg-white/[0.05] hover:text-white flex items-center gap-2 transition-colors">
                      <Network size={9} className="text-teal-400 shrink-0" /> NDI Source
                    </button>
                    <button onClick={() => setConnectProto('rtmp')}
                      className="w-full text-left px-3 py-1.5 text-[10px] text-white/65 hover:bg-white/[0.05] hover:text-white flex items-center gap-2 transition-colors pb-2">
                      <Globe size={9} className="text-indigo-400 shrink-0" /> Stream URL (RTMP / SRT / HLS)
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Graphics strip (scripture / song lower-thirds) — drag to reorder */}
      {tab === 'graphics' && (
        <div className="flex items-start gap-1.5 px-2 py-1.5 overflow-x-auto flex-1">
          {graphics.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-1 py-3">
              <BookOpen size={16} className="text-white/15" />
              <p className="text-[10px] text-white/25">No graphics queued</p>
              <p className="text-[9px] text-white/15">Queue verses from the Bible page or let the AI Copilot detect them</p>
            </div>
          )}
          {graphics.map((g, idx) => {
            const isPgm = gfxProgram?.kind === g.kind && gfxProgram?.title === g.title && gfxProgram?.subtitle === g.subtitle
            const isPvw = gfxPreview?.kind === g.kind && gfxPreview?.title === g.title && gfxPreview?.subtitle === g.subtitle
            return (
              <div key={g.id}
                {...makeDragProps(g.id, reorderGraphics)}
                onClick={() => sendToPreview({ kind: g.kind, title: g.title, body: g.body, subtitle: g.subtitle, background: g.background, source: g.source })}
                className={cn(
                  'group relative shrink-0 rounded-lg overflow-hidden cursor-grab active:cursor-grabbing border transition-all flex flex-col',
                  isPgm ? 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.45)]' :
                  isPvw  ? 'border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' :
                           'border-white/[0.08] hover:border-white/25',
                  dragOverId === g.id && 'ring-2 ring-purple-400/70',
                  g.kind === 'song' ? 'bg-blue-600/10' : 'bg-purple-600/10',
                )}
                style={{ width: `${CELL_W}px`, minWidth: `${CELL_W}px`, height: `${Math.round(CELL_W * 9 / 16) + 22}px` }}
              >
                {/* Header */}
                <div className="flex items-center gap-1 px-1.5 pt-1.5">
                  {g.kind === 'song'
                    ? <Music size={9} className="text-blue-300 shrink-0" />
                    : <BookOpen size={9} className="text-purple-300 shrink-0" />}
                  <span className="text-[9px] font-bold text-white/80 truncate">{g.title}</span>
                </div>
                {/* Body */}
                <p className="px-1.5 pt-0.5 text-[8px] text-white/45 leading-tight line-clamp-2 flex-1">{g.body}</p>
                {/* Footer */}
                <div className="px-1.5 pb-1 flex items-center gap-1">
                  <span className="text-[7px] text-white/30 truncate">{g.subtitle}</span>
                  <div className="flex-1" />
                  <Send size={8} className="text-white/25 group-hover:text-purple-300 transition-colors" />
                </div>

                {/* Source number */}
                <div className="absolute top-1 right-1 w-4 h-4 rounded bg-black/40 flex items-center justify-center">
                  <span className="text-[8px] font-bold text-white/40">{idx + 1}</span>
                </div>

                {/* PGM / PVW badge */}
                {isPgm && (
                  <div className="absolute bottom-1 right-1 px-1 py-0.5 rounded-sm bg-red-500 text-[7px] font-bold text-white flex items-center gap-0.5">
                    <span className="w-1 h-1 rounded-full bg-white animate-pulse" /> PGM
                  </div>
                )}
                {isPvw && !isPgm && (
                  <div className="absolute bottom-1 right-1 px-1 py-0.5 rounded-sm bg-emerald-500 text-[7px] font-bold text-white">PVW</div>
                )}

                {/* Remove */}
                <button
                  onClick={e => { e.stopPropagation(); removeGraphic(g.id) }}
                  className="absolute top-1 left-1 w-5 h-5 rounded bg-black/60 text-white/30 hover:text-red-400 items-center justify-center hidden group-hover:flex transition-all z-10">
                  <X size={8} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Thumbnail strip — drag to reorder */}
      {tab !== 'graphics' && (
      <div className="flex items-start gap-1.5 px-2 py-1.5 overflow-x-auto flex-1">
        {tabSources.map((src, idx) => {
          const stream = getStream(src.id)
          const isPgm = src.id === programId
          const isPvw = src.id === previewId
          return (
            <div key={src.id}
              {...makeDragProps(src.id, reorderSources)}
              onClick={() => assignToPreview(src.id)}
              className={cn(
                'group relative shrink-0 rounded-lg overflow-hidden cursor-grab active:cursor-grabbing border transition-all bg-black flex flex-col',
                isPgm ? 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.45)]' :
                isPvw  ? 'border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' :
                         'border-white/[0.08] hover:border-white/25',
                dragOverId === src.id && 'ring-2 ring-purple-400/70',
              )}
              style={{ width: `${CELL_W}px`, minWidth: `${CELL_W}px` }}
            >
              {/* Video area 16:9 */}
              <div className="relative" style={{ width: `${CELL_W}px`, height: `${Math.round(CELL_W * 9 / 16)}px` }}>
                {stream
                  ? <MiniThumb sourceId={src.id} />
                  : <SourcePlaceholder src={src} />}

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
              {/* Label strip sits BELOW the thumbnail, so it is chrome rather
                  than an on-video overlay — it has to follow the theme or it
                  stays a black bar carrying near-black text under Light. */}
              <div className="px-1.5 py-0.5 bg-chrome border-t border-white/[0.05]">
                <span className="text-[8px] text-white/50 truncate block">{src.label}</span>
              </div>
            </div>
          )
        })}

        {/* Empty placeholder cells */}
        {Array.from({ length: PAD_CELLS }).map((_, i) => (
          <div key={`empty-${i}`}
            className="shrink-0 rounded-lg border border-dashed border-white/[0.06] flex flex-col items-center justify-center bg-well"
            style={{ width: `${CELL_W}px`, minWidth: `${CELL_W}px`, height: `${Math.round(CELL_W * 9 / 16) + 22}px` }}>
            <span className="text-[9px] text-white/12">{tabSources.length + i + 1}</span>
          </div>
        ))}
      </div>
      )}

      <input ref={fileRef} type="file" accept="video/*,audio/*" className="hidden" onChange={handleFile} />
      <input ref={imgFileRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
    </div>
  )
}

// ─── Placeholder for sources without a live stream ─────────────────────────────
// Network sources (NDI / relays) may be waiting on a feed; show the protocol, the
// connection target and a status chip instead of a black tile.

function SourcePlaceholder({ src }: { src: MediaSourceMeta }) {
  const Icon =
    src.type === 'ndi'     ? Network :
    src.type === 'network' ? Globe :
    src.type === 'image'   ? ImageIcon :
    src.type === 'color'   ? Palette :
    src.type === 'timer'   ? Timer :
    src.type === 'clock'   ? Clock :
    src.type === 'pattern' ? Cpu : Monitor

  const statusColor =
    src.status === 'live'       ? 'text-emerald-400' :
    src.status === 'connecting' ? 'text-amber-400 animate-pulse' :
                                  'text-white/30'

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-gray-900 to-black px-1 text-center">
      <Icon size={16} className="text-white/25" />
      <span className="text-[8px] text-white/35 truncate max-w-full">{src.label}</span>
      {src.url && <span className="text-[7px] font-mono text-white/20 truncate max-w-full">{src.url}</span>}
      {src.status && (
        <span className={cn('text-[7px] font-semibold uppercase tracking-wide', statusColor)}>
          {src.status}
        </span>
      )}
    </div>
  )
}
