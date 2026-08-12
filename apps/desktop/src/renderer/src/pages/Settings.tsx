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
import { WorkspacePicker } from '../components/settings/WorkspacePicker'
import { useAppStore } from '../stores/appStore'
import { useServiceStore } from '../stores/serviceStore'
import { WHISPER_MODELS } from '@glorycast/ai-core'
import { Attributions } from '../components/settings/Attributions'

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

      {/* Workspace — the biggest appearance decision, so it leads. */}
      <div className="border-b border-white/[0.05] pb-5 mb-5">
        <div className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-1">Workspace</div>
        <p className="text-[11.5px] text-white/40 mb-3">
          Changes the layout, palette and which features are available. Switching takes effect immediately.
        </p>
        <WorkspacePicker />
      </div>

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
                t.id === 'dark'  ? 'bg-app border-white/10' :
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
  const [openaiKey, setOpenaiKey] = useState('')
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434')

  const asrDeviceId  = useAppStore(s => s.asrDeviceId)
  const setAsrDevice = useAppStore(s => s.setAsrDevice)
  const asrModel     = useAppStore(s => s.asrModel)
  const setAsrModel  = useAppStore(s => s.setAsrModel)

  const autoPilot       = useServiceStore(s => s.autoPilot)
  const toggleAutoPilot = useServiceStore(s => s.toggleAutoPilot)

  const [inputs, setInputs] = useState<MediaDeviceInfo[]>([])
  const [whisper, setWhisper] = useState<{
    ready: boolean; installedModels: string[]; detail: string
  } | null>(null)
  const [modelsDir, setModelsDir] = useState('')

  useEffect(() => {
    // Labels are only populated once the user has granted mic permission.
    void navigator.mediaDevices?.enumerateDevices()
      .then(all => setInputs(all.filter(d => d.kind === 'audioinput')))
      .catch(() => setInputs([]))

    void window.glorycast?.whisper?.availability().then(setWhisper).catch(() => setWhisper(null))
    void window.glorycast?.whisper?.modelsDir().then(setModelsDir).catch(() => {})
  }, [])

  return (
    <div>
      <SectionHeader
        title="AI Services"
        description="Scripture detection listens to a chosen audio input and transcribes it on this machine."
      />

      {/* Engine status — the operator must know which engine is running,
          because the fallback has real privacy and reliability consequences. */}
      <div className={cn(
        'rounded-xl border p-3.5 mb-5',
        whisper?.ready
          ? 'border-emerald-500/25 bg-emerald-500/[0.06]'
          : 'border-amber-500/25 bg-amber-500/[0.06]',
      )}>
        <div className="flex items-center gap-2 mb-1">
          {whisper?.ready
            ? <CheckCircle2 size={14} className="text-emerald-400" />
            : <AlertCircle size={14} className="text-amber-400" />}
          <span className="text-[13px] font-semibold text-white/85">
            {whisper?.ready ? 'Local transcription active' : 'Local transcription unavailable'}
          </span>
        </div>
        <p className="text-[11.5px] leading-relaxed text-white/50">
          {whisper?.detail ?? 'Checking…'}
        </p>
        {!whisper?.ready && (
          <p className="text-[11.5px] leading-relaxed text-amber-300/80 mt-1.5">
            GloryCast will fall back to online recognition: audio leaves this machine,
            it needs an internet connection, and it can only hear the default microphone.
          </p>
        )}
        {modelsDir && (
          <p className="text-[10.5px] text-white/30 mt-2 font-mono break-all">
            Models: {modelsDir}
          </p>
        )}
      </div>

      <div className="space-y-0">
        <SettingRow
          label="Listening Input"
          description="Choose the soundboard or mic feed the AI transcribes — not necessarily the system default."
        >
          <select
            value={asrDeviceId}
            onChange={e => setAsrDevice(e.target.value)}
            className="w-64 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white/70 outline-none"
          >
            <option value="">System default</option>
            {inputs.map(d => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `Input ${d.deviceId.slice(0, 6)}`}
              </option>
            ))}
          </select>
        </SettingRow>

        <SettingRow label="Whisper Model" description="Larger models are more accurate but slower.">
          <select
            value={asrModel}
            onChange={e => setAsrModel(e.target.value)}
            className="w-64 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white/70 outline-none"
          >
            {WHISPER_MODELS.map(m => (
              <option key={m.id} value={m.id}>
                {m.label} · {m.sizeMb} MB
                {whisper?.installedModels.includes(m.id) ? ' (installed)' : ''}
              </option>
            ))}
          </select>
        </SettingRow>

        <div className="py-2 text-[11.5px] text-white/40 border-b border-white/[0.05]">
          {WHISPER_MODELS.find(m => m.id === asrModel)?.note}
        </div>

        <SettingRow
          label="Auto-project confident detections"
          description="Send a detected verse to Preview automatically when the match is strong."
        >
          <Toggle value={autoPilot} onChange={toggleAutoPilot} />
        </SettingRow>

        <SettingRow label="OpenAI API Key" description="Used for sermon content generation">
          <Input value={openaiKey} onChange={setOpenaiKey} placeholder="sk-..." type="password" />
        </SettingRow>
        <SettingRow label="Ollama Server URL" description="Local LLM server for offline AI processing">
          <Input value={ollamaUrl} onChange={setOllamaUrl} placeholder="http://localhost:11434" />
        </SettingRow>
      </div>
    </div>
  )
}

// ─── Streaming settings ───────────────────────────────────────────────────────

/**
 * Per-destination streaming setup.
 *
 * Every platform issues its own stream key, so there is no such thing as one
 * app-wide key once you multi-stream. Each destination owns its URL and key,
 * and both persist through appStore.
 */
function StreamingSettings() {
  const destinations    = useAppStore(s => s.destinations)
  const setDestinations = useAppStore(s => s.setDestinations)

  const patch = (id: string, changes: Partial<(typeof destinations)[number]>) =>
    setDestinations(destinations.map(d => (d.id === id ? { ...d, ...changes } : d)))

  return (
    <div>
      <SectionHeader
        title="Streaming"
        description="Each platform issues its own stream key. A destination without one cannot go live."
      />

      <div className="space-y-3">
        {destinations.map((d) => {
          const configured = Boolean(d.rtmpUrl?.trim() && d.streamKey?.trim())
          return (
            <div
              key={d.id}
              className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5"
            >
              <div className="flex items-center gap-2.5 mb-3">
                <span className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center text-[10px] font-bold text-white/80">
                  {d.name.charAt(0)}
                </span>
                <span className="text-[13px] font-semibold text-white/85 flex-1">{d.name}</span>

                <span className={cn(
                  'text-[9.5px] font-bold tracking-wider px-1.5 py-0.5 rounded',
                  configured
                    ? 'text-emerald-400 bg-emerald-500/12'
                    : 'text-amber-400 bg-amber-500/12',
                )}>
                  {configured ? 'READY' : 'NO KEY'}
                </span>

                <button
                  onClick={() => patch(d.id, { enabled: !d.enabled })}
                  disabled={!configured}
                  title={configured ? 'Enable for streaming' : 'Add a stream key first'}
                  className={cn(
                    'w-9 h-5 rounded-full relative transition-colors shrink-0',
                    !configured ? 'bg-white/10 cursor-not-allowed'
                      : d.enabled ? 'bg-emerald-500/80' : 'bg-white/15',
                  )}
                >
                  <span className={cn(
                    'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all',
                    d.enabled && configured ? 'left-[18px]' : 'left-0.5',
                  )} />
                </button>
              </div>

              <div className="space-y-2">
                <label className="block">
                  <span className="text-[10.5px] text-white/40">Ingest URL</span>
                  <input
                    value={d.rtmpUrl}
                    onChange={e => patch(d.id, { rtmpUrl: e.target.value })}
                    placeholder="rtmp://…"
                    spellCheck={false}
                    className="mt-1 w-full h-8 px-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[12px] font-mono text-white/80 outline-none focus:border-purple-500/50"
                  />
                </label>

                <label className="block">
                  <span className="text-[10.5px] text-white/40">
                    Stream key <span className="text-white/25">· kept on this machine</span>
                  </span>
                  <input
                    type="password"
                    value={d.streamKey}
                    onChange={e => patch(d.id, { streamKey: e.target.value })}
                    placeholder="Paste the key from the platform…"
                    spellCheck={false}
                    autoComplete="off"
                    className="mt-1 w-full h-8 px-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[12px] font-mono text-white/80 outline-none focus:border-purple-500/50"
                  />
                </label>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Bible settings ───────────────────────────────────────────────────────────

/** A translation available to project from — bundled or user-added. */
interface LibraryEntry {
  id: string
  name: string
  copyright: string
  bundled: boolean
  removable: boolean
}

/** Public-domain text that ships inside GloryCast and always works offline. */
const BUNDLED_ENTRIES: LibraryEntry[] = [
  { id: 'WEB', name: 'World English Bible', copyright: 'Public domain', bundled: true, removable: false },
  { id: 'KJV', name: 'King James Version (1769)', copyright: 'Public domain', bundled: true, removable: false },
]

function BibleSettings() {
  const bibleTranslation = useAppStore(s => s.bibleTranslation)
  const setBibleTranslation = useAppStore(s => s.setBibleTranslation)

  const [library, setLibrary] = useState<LibraryEntry[]>(BUNDLED_ENTRIES)
  const [libraryDir, setLibraryDir] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  const [apiKey, setApiKey] = useState('')
  const [apiConfigured, setApiConfigured] = useState(false)
  const [apiCount, setApiCount] = useState(0)

  const refreshApi = async () => {
    const status = await window.glorycast?.bibleApi?.keyStatus().catch(() => null)
    setApiConfigured(Boolean(status?.configured))
    if (status?.configured) {
      const list = await window.glorycast?.bibleApi?.list().catch(() => [])
      setApiCount(list?.length ?? 0)
      setCatalogue(list ?? [])
    }
  }

  const onSaveKey = async () => {
    await window.glorycast?.bibleApi?.setKey(apiKey.trim())
    setApiKey('')
    await refreshApi()
  }

  const [catalogue, setCatalogue] = useState<Array<{
    id: string; abbreviation: string; name: string; language: string; isPublicDomain: boolean
  }>>([])
  const [search, setSearch] = useState('')
  const [downloading, setDownloading] = useState<string | null>(null)
  const [progress, setProgress] = useState<Record<string, { done: number; total: number }>>({})

  useEffect(() => {
    const onProgress = (p: unknown) => {
      const { bibleId, done, total } = p as { bibleId: string; done: number; total: number }
      setProgress(prev => ({ ...prev, [bibleId]: { done, total } }))
    }
    window.glorycast?.on('bibleapi:progress', onProgress)
    return () => window.glorycast?.off('bibleapi:progress', onProgress)
  }, [])

  const matches = (() => {
    const q = search.trim().toLowerCase()
    if (q.length < 2) return []
    return catalogue
      .filter(b => b.abbreviation.toLowerCase().includes(q) || b.name.toLowerCase().includes(q))
      .slice(0, 25)
  })()

  const onInstall = async (b: { id: string; abbreviation: string; name: string }) => {
    setDownloading(b.abbreviation); setNote(null)
    try {
      const res = await window.glorycast?.bibleApi?.download({
        bibleId: b.id, abbreviation: b.abbreviation, name: b.name,
      })
      setNote(res?.ok
        ? `Installed ${b.abbreviation} — ${res.verses?.toLocaleString()} verses, available offline.`
        : res?.error ?? `Could not install ${b.abbreviation}.`)
      await refresh()
    } finally {
      setDownloading(null)
      setProgress(prev => { const n = { ...prev }; delete n[b.id]; return n })
    }
  }

  const refresh = async () => {
    const added = await window.glorycast?.bible?.list().catch(() => []) ?? []
    setLibrary([
      ...BUNDLED_ENTRIES,
      ...added.map(t => ({ ...t, bundled: false })),
    ])
  }

  useEffect(() => {
    void refresh()
    void refreshApi()
    void window.glorycast?.bible?.libraryDir().then(setLibraryDir).catch(() => {})
  }, [])

  const onImport = async () => {
    setBusy(true); setNote(null)
    try {
      const res = await window.glorycast?.bible?.import()
      if (res?.added.length) setNote(`Added ${res.added.join(', ')}.`)
      else if (res?.failed?.length) setNote(`Could not read: ${res.failed.join(', ')}.`)
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  const onRemove = async (id: string) => {
    await window.glorycast?.bible?.remove(id)
    if (bibleTranslation === id) setBibleTranslation('WEB')
    await refresh()
  }

  const desktopOnly = !window.glorycast?.bible

  return (
    <div>
      <SectionHeader title="Bible Engine" description="Translations available for projection and voice detection" />

      {/* The product ships public-domain text only. Anything else is text the
          church already licenses, added here by the operator — so the app never
          redistributes scripture it has no right to. */}
      <div className="mb-5 p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
        <p className="text-sm text-white/85 font-semibold mb-1">Add your own translations</p>
        <p className="text-xs text-white/50 leading-relaxed mb-3">
          GloryCast includes the public-domain WEB and KJV. Copyrighted translations
          (NIV, ESV, NKJV, NLT…) are licensed to your church, not to GloryCast, so you
          add them here from files you own — the same way ProPresenter and EasyWorship work.
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={onImport}
            disabled={busy || desktopOnly}
            className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm font-semibold transition-colors"
          >{busy ? 'Adding…' : 'Add Translation…'}</button>
          {libraryDir && (
            <button
              onClick={() => window.glorycast?.shell.openPath(libraryDir)}
              className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/10 text-white/70 text-sm transition-colors"
            >Open Library Folder</button>
          )}
        </div>
        {desktopOnly && (
          <p className="text-[11px] text-amber-300 mt-2">
            Adding translations requires the GloryCast desktop app.
          </p>
        )}
        {note && <p className="text-[11px] text-white/60 mt-2">{note}</p>}
      </div>

      {/* API.Bible — the operator's own key against the American Bible Society
          catalogue. This is how GloryCast reaches thousands of translations
          (including a large free set) without shipping any of them. */}
      <div className="mb-5 p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm text-white/85 font-semibold">Online translations (API.Bible)</p>
          {apiConfigured && <span className="text-[9px] font-bold uppercase text-emerald-400">Connected</span>}
        </div>
        <p className="text-xs text-white/50 leading-relaxed mb-3">
          Adds 2,500+ translations from the American Bible Society, including many free
          public-domain ones. Free key, and it stays on this machine.
        </p>
        <div className="flex items-center gap-2">
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="API.Bible key"
            className="flex-1 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white/80 placeholder:text-white/25 outline-none focus:border-purple-500/40"
          />
          <button
            onClick={onSaveKey}
            disabled={!apiKey.trim() || desktopOnly}
            className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm font-semibold transition-colors"
          >Save</button>
          <button
            onClick={() => window.glorycast?.shell.openExternal('https://scripture.api.bible/')}
            className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/10 text-white/70 text-sm transition-colors"
          >Get a key</button>
        </div>
        {apiCount > 0 && (
          <p className="text-[11px] text-emerald-300/80 mt-2">{apiCount} online translations available.</p>
        )}

        {apiConfigured && (
          <div className="mt-3 pt-3 border-t border-white/[0.06]">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search translations to install… e.g. ASV, Young's"
              className="w-full px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white/80 placeholder:text-white/25 outline-none focus:border-purple-500/40"
            />
            {search.trim().length > 1 && (
              <div className="mt-2 max-h-60 overflow-y-auto space-y-1">
                {matches.length === 0 && <p className="text-[11px] text-white/40 px-1 py-2">No match.</p>}
                {matches.map(b => {
                  const installed = library.some(t => t.id === b.abbreviation.toUpperCase())
                  const prog = progress[b.id]
                  return (
                    <div key={b.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.03]">
                      <div className="min-w-0 flex-1">
                        <div className="text-[11.5px] text-white/80 truncate">
                          <span className="font-bold text-purple-300">{b.abbreviation}</span> — {b.name}
                        </div>
                        <div className="text-[9.5px] text-white/35">{b.language}</div>
                      </div>
                      {installed ? (
                        <span className="text-[9px] font-semibold uppercase text-emerald-400 shrink-0">Installed</span>
                      ) : prog ? (
                        <span className="text-[9.5px] font-mono text-purple-300 shrink-0 tabular-nums">
                          {Math.round((prog.done / prog.total) * 100)}%
                        </span>
                      ) : (
                        <button
                          onClick={() => onInstall(b)}
                          disabled={downloading !== null}
                          className="px-2.5 py-1 rounded-md bg-purple-600 hover:bg-purple-500 disabled:opacity-30 text-[10px] font-semibold text-white shrink-0 transition-colors"
                        >Install</button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            {/* Downloading a whole translation is ~1,190 requests, so it is worth
                telling the operator this is a one-time cost, not a stall. */}
            {downloading && (
              <p className="text-[11px] text-white/55 mt-2">
                Installing {downloading} — this takes a few minutes and only happens once.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="space-y-0">
        <SettingRow label="Default Translation" description="Used until a speaker names another version aloud">
          <select
            value={bibleTranslation}
            onChange={e => setBibleTranslation(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white/70 outline-none w-52"
          >
            {/* NIV stays selectable even when absent so the preference survives
                until the church adds the file — it just falls back to bundled
                text meanwhile rather than projecting nothing. */}
            {!library.some(t => t.id === bibleTranslation) && (
              <option value={bibleTranslation}>{bibleTranslation} (not installed)</option>
            )}
            {library.map(t => <option key={t.id} value={t.id}>{t.id} — {t.name}</option>)}
          </select>
        </SettingRow>
      </div>

      <div className="mt-5">
        <p className="text-[11px] uppercase tracking-wider text-white/40 mb-2">
          Installed ({library.length})
        </p>
        <div className="space-y-1.5">
          {library.map(t => (
            <div key={t.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <span className="text-[11px] font-bold text-purple-300 w-12 shrink-0">{t.id}</span>
              <div className="min-w-0 flex-1">
                <div className="text-[12px] text-white/80 truncate">{t.name}</div>
                {t.copyright && <div className="text-[10px] text-white/40 truncate">© {t.copyright}</div>}
              </div>
              {t.bundled
                ? <span className="text-[9px] font-semibold uppercase text-emerald-400/80 shrink-0">Included</span>
                : t.removable
                  ? <button onClick={() => onRemove(t.id)} className="text-[10px] text-white/40 hover:text-red-400 shrink-0">Remove</button>
                  : <span className="text-[9px] uppercase text-white/30 shrink-0">Linked</span>}
            </div>
          ))}
        </div>
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

      {/* CC-BY and CC-BY-SA make visible attribution a condition of use, so
          this has to ship in the product rather than live only in the repo. */}
      <div className="mt-8">
        <SectionHeader
          title="Data & Attributions"
          description="Third-party data included in GloryCast, and its licences"
        />
        <Attributions />
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
      <div className="w-48 shrink-0 border-r border-white/[0.05] bg-chrome py-3">
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
