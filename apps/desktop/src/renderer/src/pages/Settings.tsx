import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Cpu, Wifi, Key, Palette, Video, Globe, Shield,
  RefreshCw, Camera, Mic2, CheckCircle2, AlertCircle,
  Activity, Monitor
} from 'lucide-react'
import { cn } from '../lib/utils'
import { useMediaEngine } from '../hooks/useMediaEngine'
import type { AppearanceConfig } from '../hooks/useMediaEngine'

type SettingsSection = 'general' | 'audio-video' | 'streaming' | 'ai' | 'bible' | 'appearance' | 'security'

const SECTIONS = [
  { id: 'general'     as SettingsSection, icon: Cpu,     label: 'General'      },
  { id: 'audio-video' as SettingsSection, icon: Video,   label: 'Audio & Video' },
  { id: 'streaming'   as SettingsSection, icon: Wifi,    label: 'Streaming'    },
  { id: 'ai'          as SettingsSection, icon: Globe,   label: 'AI Services'  },
  { id: 'bible'       as SettingsSection, icon: Globe,   label: 'Bible Engine' },
  { id: 'appearance'  as SettingsSection, icon: Palette, label: 'Appearance'   },
  { id: 'security'    as SettingsSection, icon: Shield,  label: 'Security'     },
]

// ─── Shared UI primitives ─────────────────────────────────────────────────────

function SettingRow({ label, description, children }: {
  label: string; description?: string; children: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between py-4 border-b border-white/[0.05]">
      <div>
        <div className="text-sm text-white/80 font-medium">{label}</div>
        {description && <div className="text-xs text-white/35 mt-0.5">{description}</div>}
      </div>
      <div className="ml-8 shrink-0">{children}</div>
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)}
      className={cn('relative w-10 h-5 rounded-full transition-colors', value ? 'bg-purple-600' : 'bg-white/15')}>
      <span className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
        value ? 'translate-x-5' : 'translate-x-0.5')} />
    </button>
  )
}

function Input({ value, onChange, placeholder, type = 'text' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-64 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white/70 placeholder:text-white/25 outline-none focus:border-purple-500/50 transition-colors" />
  )
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-bold text-white/90 mb-1">{title}</h2>
      <p className="text-sm text-white/40">{description}</p>
    </div>
  )
}

// ─── Appearance settings ──────────────────────────────────────────────────────

const ACCENT_OPTIONS: { id: AppearanceConfig['accent']; label: string; hex: string }[] = [
  { id: 'purple', label: 'Purple', hex: '#7c3aed' },
  { id: 'blue',   label: 'Blue',   hex: '#2563eb' },
  { id: 'teal',   label: 'Teal',   hex: '#0d9488' },
  { id: 'orange', label: 'Orange', hex: '#ea580c' },
  { id: 'rose',   label: 'Rose',   hex: '#e11d48' },
]

const THEME_OPTIONS: { id: AppearanceConfig['theme']; label: string; desc: string }[] = [
  { id: 'dark', label: 'Dark',  desc: 'Deep black — best for dark rooms' },
  { id: 'dim',  label: 'Dim',   desc: 'Softer dark — easier on the eyes'  },
  { id: 'light',label: 'Light', desc: 'White — for bright environments'   },
]

function AppearanceSettings() {
  const { appearance, setAppearance } = useMediaEngine()

  return (
    <div>
      <SectionHeader title="Appearance" description="Customise the look and feel of GloryCast AI" />

      {/* Theme */}
      <div className="border-b border-white/[0.05] pb-5 mb-5">
        <div className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-3">Theme</div>
        <div className="grid grid-cols-3 gap-3">
          {THEME_OPTIONS.map(t => (
            <button key={t.id} onClick={() => setAppearance({ theme: t.id })}
              className={cn(
                'p-4 rounded-xl border-2 text-left transition-all',
                appearance.theme === t.id
                  ? 'border-purple-500 bg-purple-600/10'
                  : 'border-white/[0.07] bg-white/[0.02] hover:border-white/20',
              )}>
              {/* Mini preview */}
              <div className={cn(
                'w-full h-10 rounded-lg mb-3 border',
                t.id === 'dark'  ? 'bg-[#07070a] border-white/10' :
                t.id === 'dim'   ? 'bg-[#111118] border-white/10' :
                                   'bg-white border-gray-200',
              )}>
                <div className={cn('m-2 h-2 w-3/4 rounded',
                  t.id === 'light' ? 'bg-gray-300' : 'bg-white/10')} />
                <div className={cn('mx-2 mt-1 h-1.5 w-1/2 rounded',
                  t.id === 'light' ? 'bg-gray-200' : 'bg-white/[0.06]')} />
              </div>
              <div className="text-sm font-semibold text-white/80">{t.label}</div>
              <div className="text-[11px] text-white/35 mt-0.5">{t.desc}</div>
              {appearance.theme === t.id && (
                <CheckCircle2 size={14} className="text-purple-400 mt-2" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Accent colour */}
      <div className="border-b border-white/[0.05] pb-5 mb-5">
        <div className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-3">Accent Colour</div>
        <div className="flex gap-3">
          {ACCENT_OPTIONS.map(a => (
            <button key={a.id} onClick={() => setAppearance({ accent: a.id })}
              title={a.label}
              className={cn(
                'w-10 h-10 rounded-full border-4 transition-all',
                appearance.accent === a.id ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:border-white/40',
              )}
              style={{ background: a.hex }}
            />
          ))}
        </div>
        <p className="text-xs text-white/30 mt-3">
          Selected: <span className="text-white/60 font-medium capitalize">{appearance.accent}</span>
          {' — '}applies immediately and persists across restarts.
        </p>
      </div>

      {/* Font size */}
      <div className="border-b border-white/[0.05] pb-5 mb-5">
        <div className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-3">Font Size</div>
        <div className="flex gap-2">
          {(['sm','md','lg'] as const).map(f => (
            <button key={f} onClick={() => setAppearance({ fontSize: f })}
              className={cn(
                'px-4 py-2 rounded-lg border text-sm font-medium transition-all',
                appearance.fontSize === f
                  ? 'border-purple-500 bg-purple-600/15 text-purple-300'
                  : 'border-white/[0.08] text-white/45 hover:border-white/20 hover:text-white/70',
              )}>
              {{ sm:'Small', md:'Medium', lg:'Large' }[f]}
            </button>
          ))}
        </div>
      </div>

      {/* UI density */}
      <div className="border-b border-white/[0.05] pb-5 mb-5">
        <div className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-3">UI Density</div>
        <div className="flex gap-2">
          {(['compact','normal','comfortable'] as const).map(d => (
            <button key={d} onClick={() => setAppearance({ density: d })}
              className={cn(
                'px-4 py-2 rounded-lg border text-sm font-medium transition-all capitalize',
                appearance.density === d
                  ? 'border-purple-500 bg-purple-600/15 text-purple-300'
                  : 'border-white/[0.08] text-white/45 hover:border-white/20 hover:text-white/70',
              )}>
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Monitor labels */}
      <SettingRow label="Show Monitor Labels" description="Display PGM / PVW badges on production monitors">
        <Toggle value={appearance.showMonitorLabels} onChange={v => setAppearance({ showMonitorLabels: v })} />
      </SettingRow>
    </div>
  )
}

// ─── Audio & Video settings (real device enumeration) ─────────────────────────

function MicLevelBar({ analyser }: { analyser: AnalyserNode | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number>(0)

  useEffect(() => {
    if (!analyser || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')!

    const tick = () => {
      const buf = new Uint8Array(analyser.frequencyBinCount)
      analyser.getByteTimeDomainData(buf)
      let sum = 0
      for (const v of buf) sum += ((v - 128) / 128) ** 2
      const rms = Math.sqrt(sum / buf.length)

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const w = canvas.width * Math.min(1, rms * 4)
      const g = ctx.createLinearGradient(0, 0, canvas.width, 0)
      g.addColorStop(0, '#10b981')
      g.addColorStop(0.7, '#f59e0b')
      g.addColorStop(1, '#ef4444')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.roundRect(0, 0, w, canvas.height, 3)
      ctx.fill()
      rafRef.current = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(rafRef.current)
  }, [analyser])

  return (
    <canvas ref={canvasRef} width={256} height={10}
      className="rounded-full bg-white/[0.06]" />
  )
}

function AVSettings() {
  const { cameras, microphones, enumerateDevices, requestPermission, permissionState } = useMediaEngine()

  const [selectedCamera, setSelectedCamera]    = useState('')
  const [selectedMic,    setSelectedMic]       = useState('')
  const [noiseSuppression, setNoiseSuppression]= useState(true)
  const [echoCancellation, setEchoCancellation]= useState(true)
  const [testStream,  setTestStream]  = useState<MediaStream | null>(null)
  const [analyser,    setAnalyser]    = useState<AnalyserNode | null>(null)
  const cameraPreviewRef = useRef<HTMLVideoElement>(null)
  const audioCtxRef      = useRef<AudioContext | null>(null)

  useEffect(() => {
    enumerateDevices()
  }, [])

  useEffect(() => {
    if (cameras.length && !selectedCamera) setSelectedCamera(cameras[0]?.deviceId ?? '')
    if (microphones.length && !selectedMic)  setSelectedMic(microphones[0]?.deviceId ?? '')
  }, [cameras, microphones])

  async function startCameraPreview() {
    stopCameraPreview()
    try {
      const constraints: MediaStreamConstraints = {
        video: selectedCamera ? { deviceId: { exact: selectedCamera }, width: 640, height: 360 } : { width: 640, height: 360 },
        audio: selectedMic   ? { deviceId: { exact: selectedMic }, noiseSuppression, echoCancellation } : { noiseSuppression, echoCancellation },
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      setTestStream(stream)

      if (cameraPreviewRef.current) {
        cameraPreviewRef.current.srcObject = stream
        cameraPreviewRef.current.play().catch(() => {})
      }

      // Mic analyser
      const ctx     = new AudioContext()
      const source  = ctx.createMediaStreamSource(stream)
      const an      = ctx.createAnalyser()
      an.fftSize    = 512
      source.connect(an)
      audioCtxRef.current = ctx
      setAnalyser(an)
    } catch (e) {
      console.warn('Camera/mic test failed:', e)
    }
  }

  function stopCameraPreview() {
    testStream?.getTracks().forEach(t => t.stop())
    setTestStream(null)
    if (cameraPreviewRef.current) cameraPreviewRef.current.srcObject = null
    audioCtxRef.current?.close()
    audioCtxRef.current = null
    setAnalyser(null)
  }

  useEffect(() => () => stopCameraPreview(), [])

  return (
    <div>
      <SectionHeader title="Audio & Video" description="Configure capture devices and test them live" />

      {/* Permission check */}
      {permissionState !== 'granted' && (
        <div className="mb-5 p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3">
          <AlertCircle size={16} className="text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm text-amber-300 font-semibold mb-1">Permission required</p>
            <p className="text-xs text-white/45 mb-3">Grant camera and microphone access so GloryCast can detect your devices.</p>
            <button onClick={requestPermission}
              className="px-4 py-1.5 rounded-lg bg-amber-500/25 hover:bg-amber-500/40 text-amber-300 text-sm font-semibold transition-colors">
              Grant Access
            </button>
          </div>
        </div>
      )}

      {/* Camera device */}
      <SettingRow label="Camera" description={`${cameras.length} device${cameras.length !== 1 ? 's' : ''} detected`}>
        <div className="flex items-center gap-2">
          <select value={selectedCamera} onChange={e => setSelectedCamera(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white/70 outline-none w-52">
            {cameras.length === 0 ? (
              <option value="">No cameras found</option>
            ) : cameras.map(c => (
              <option key={c.deviceId} value={c.deviceId}>{c.label || `Camera ${c.deviceId.slice(0,8)}`}</option>
            ))}
          </select>
          <button onClick={() => enumerateDevices()} title="Refresh"
            className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors">
            <RefreshCw size={13} />
          </button>
        </div>
      </SettingRow>

      {/* Mic device */}
      <SettingRow label="Microphone" description={`${microphones.length} device${microphones.length !== 1 ? 's' : ''} detected`}>
        <select value={selectedMic} onChange={e => setSelectedMic(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white/70 outline-none w-64">
          {microphones.length === 0 ? (
            <option value="">No microphones found</option>
          ) : microphones.map(m => (
            <option key={m.deviceId} value={m.deviceId}>{m.label || `Microphone ${m.deviceId.slice(0,8)}`}</option>
          ))}
        </select>
      </SettingRow>

      <SettingRow label="Noise Suppression" description="AI-powered background noise removal">
        <Toggle value={noiseSuppression} onChange={setNoiseSuppression} />
      </SettingRow>
      <SettingRow label="Echo Cancellation" description="Remove acoustic echo from room">
        <Toggle value={echoCancellation} onChange={setEchoCancellation} />
      </SettingRow>

      {/* Live test area */}
      <div className="mt-6 p-4 rounded-xl bg-white/[0.02] border border-white/[0.07] space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-white/70">Device Test</span>
          <div className="flex gap-2">
            {testStream ? (
              <button onClick={stopCameraPreview}
                className="px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/35 text-red-300 text-xs font-semibold transition-colors">
                Stop Test
              </button>
            ) : (
              <button onClick={startCameraPreview}
                className="px-3 py-1.5 rounded-lg bg-purple-600/25 hover:bg-purple-600/40 text-purple-300 text-xs font-semibold transition-colors">
                Start Test
              </button>
            )}
          </div>
        </div>

        {/* Camera preview */}
        <div className="relative aspect-video rounded-xl bg-black overflow-hidden max-w-sm">
          <video ref={cameraPreviewRef} autoPlay muted playsInline
            className="w-full h-full object-contain" />
          {!testStream && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Camera size={28} className="text-white/15 mb-2" />
              <p className="text-[11px] text-white/20">Click "Start Test" to preview</p>
            </div>
          )}
          {testStream && (
            <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 text-[9px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE PREVIEW
            </div>
          )}
        </div>

        {/* Microphone level */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Mic2 size={12} className={cn(analyser ? 'text-emerald-400' : 'text-white/25')} />
            <span className="text-xs text-white/50">
              {analyser ? 'Microphone signal (real-time)' : 'Microphone — start test to see level'}
            </span>
          </div>
          <MicLevelBar analyser={analyser} />
        </div>
      </div>
    </div>
  )
}

// ─── AI Settings ──────────────────────────────────────────────────────────────

function AISettings() {
  const [openaiKey,          setOpenaiKey]          = useState('')
  const [ollamaUrl,          setOllamaUrl]          = useState('http://localhost:11434')
  const [scriptureDetection, setScriptureDetection] = useState(true)
  const [autoDisplay,        setAutoDisplay]        = useState(false)
  const [whisperModel,       setWhisperModel]       = useState('base.en')

  return (
    <div>
      <SectionHeader title="AI Services" description="Configure AI providers for scripture detection, transcription, and content generation" />
      <div className="space-y-0">
        <SettingRow label="OpenAI API Key" description="Used for GPT-4o content generation">
          <Input value={openaiKey} onChange={setOpenaiKey} placeholder="sk-..." type="password" />
        </SettingRow>
        <SettingRow label="Ollama Server URL" description="Local LLM server for offline AI processing">
          <Input value={ollamaUrl} onChange={setOllamaUrl} placeholder="http://localhost:11434" />
        </SettingRow>
        <SettingRow label="Whisper Model" description="Speech recognition model for scripture detection">
          <select value={whisperModel} onChange={e => setWhisperModel(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white/70 outline-none">
            {['tiny.en','base.en','small.en','medium.en','large-v3'].map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </SettingRow>
        <SettingRow label="Scripture Detection" description="Automatically detect Bible references from live audio">
          <Toggle value={scriptureDetection} onChange={setScriptureDetection} />
        </SettingRow>
        <SettingRow label="Auto-Display Detected Scripture" description="Automatically send detected scriptures to output">
          <Toggle value={autoDisplay} onChange={setAutoDisplay} />
        </SettingRow>
      </div>
    </div>
  )
}

// ─── Streaming settings ───────────────────────────────────────────────────────

function StreamingSettings() {
  const [rtmpUrl,    setRtmpUrl]    = useState('rtmp://a.rtmp.youtube.com/live2')
  const [streamKey,  setStreamKey]  = useState('')
  const [bitrate,    setBitrate]    = useState('6000')
  const [resolution, setResolution] = useState('1920x1080')

  return (
    <div>
      <SectionHeader title="Streaming" description="Configure RTMP destinations and encoder settings" />
      <div className="space-y-0">
        <SettingRow label="Primary RTMP URL" description="Main streaming destination">
          <Input value={rtmpUrl} onChange={setRtmpUrl} />
        </SettingRow>
        <SettingRow label="Stream Key" description="Keep this secret">
          <Input value={streamKey} onChange={setStreamKey} type="password" placeholder="Stream key…" />
        </SettingRow>
        <SettingRow label="Video Bitrate (kbps)" description="Higher = better quality, more bandwidth">
          <Input value={bitrate} onChange={setBitrate} />
        </SettingRow>
        <SettingRow label="Output Resolution" description="Streaming output resolution">
          <select value={resolution} onChange={e => setResolution(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white/70 outline-none">
            {['1920x1080','1280x720','854x480','640x360'].map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </SettingRow>
      </div>
    </div>
  )
}

// ─── Bible settings ───────────────────────────────────────────────────────────

function BibleSettings() {
  const [defaultTranslation,   setDefaultTranslation]   = useState('NIV')
  const [secondaryTranslation, setSecondaryTranslation] = useState('KJV')

  return (
    <div>
      <SectionHeader title="Bible Engine" description="Configure Bible translations and display preferences" />
      <div className="space-y-0">
        <SettingRow label="Default Translation" description="Primary Bible translation for display">
          <select value={defaultTranslation} onChange={e => setDefaultTranslation(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white/70 outline-none">
            {['NIV','ESV','KJV','NKJV','NLT','NASB'].map(t => <option key={t}>{t}</option>)}
          </select>
        </SettingRow>
        <SettingRow label="Secondary Translation" description="Shown alongside primary translation">
          <select value={secondaryTranslation} onChange={e => setSecondaryTranslation(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white/70 outline-none">
            {['None','NIV','ESV','KJV','NKJV','NLT','NASB'].map(t => <option key={t}>{t}</option>)}
          </select>
        </SettingRow>
      </div>
    </div>
  )
}

// ─── General settings ─────────────────────────────────────────────────────────

function GeneralSettings() {
  const [eventName,    setEventName]    = useState('Sunday Morning Service')
  const [venueName,    setVenueName]    = useState('Main Sanctuary')
  const [autoSave,     setAutoSave]     = useState(true)
  const [startOnBoot,  setStartOnBoot]  = useState(false)

  return (
    <div>
      <SectionHeader title="General" description="Event info and application behaviour" />
      <div className="space-y-0">
        <SettingRow label="Event Name" description="Shown on stage display and in reports">
          <Input value={eventName} onChange={setEventName} placeholder="Sunday Morning Service" />
        </SettingRow>
        <SettingRow label="Venue Name" description="Location shown on lower thirds">
          <Input value={venueName} onChange={setVenueName} placeholder="Main Sanctuary" />
        </SettingRow>
        <SettingRow label="Auto-save" description="Save project every 5 minutes">
          <Toggle value={autoSave} onChange={setAutoSave} />
        </SettingRow>
        <SettingRow label="Start on boot" description="Launch GloryCast when Windows starts">
          <Toggle value={startOnBoot} onChange={setStartOnBoot} />
        </SettingRow>
      </div>
    </div>
  )
}

// ─── SettingsPage ─────────────────────────────────────────────────────────────

export function SettingsPage() {
  const [section, setSection] = useState<SettingsSection>('appearance')

  return (
    <div className="h-full flex overflow-hidden">
      {/* Sidebar */}
      <div className="w-48 shrink-0 border-r border-white/[0.05] bg-[#09090f] py-3">
        {SECTIONS.map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setSection(id)}
            className={cn(
              'w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors',
              section === id ? 'text-purple-400 bg-purple-600/10' : 'text-white/40 hover:text-white/70 hover:bg-white/[0.03]',
            )}>
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {section === 'appearance'  && <AppearanceSettings />}
        {section === 'audio-video' && <AVSettings />}
        {section === 'ai'          && <AISettings />}
        {section === 'streaming'   && <StreamingSettings />}
        {section === 'bible'       && <BibleSettings />}
        {section === 'general'     && <GeneralSettings />}
        {section === 'security'    && (
          <div>
            <SectionHeader title="Security" description="Access control and encryption settings" />
            <p className="text-sm text-white/30">Security settings coming in Sprint 3 (multi-user / LAN roles).</p>
          </div>
        )}
      </div>
    </div>
  )
}
