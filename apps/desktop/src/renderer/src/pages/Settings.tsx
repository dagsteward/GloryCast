import { useState } from 'react'
import { motion } from 'framer-motion'
import { Cpu, Wifi, Key, Palette, Video, Mic2, Globe, Bell, Shield } from 'lucide-react'
import { cn } from '../lib/utils'

type SettingsSection = 'general' | 'audio-video' | 'streaming' | 'ai' | 'bible' | 'appearance' | 'security'

const SECTIONS = [
  { id: 'general' as SettingsSection, icon: Cpu, label: 'General' },
  { id: 'audio-video' as SettingsSection, icon: Video, label: 'Audio & Video' },
  { id: 'streaming' as SettingsSection, icon: Wifi, label: 'Streaming' },
  { id: 'ai' as SettingsSection, icon: Globe, label: 'AI Services' },
  { id: 'bible' as SettingsSection, icon: Globe, label: 'Bible Engine' },
  { id: 'appearance' as SettingsSection, icon: Palette, label: 'Appearance' },
  { id: 'security' as SettingsSection, icon: Shield, label: 'Security' },
]

export function SettingsPage() {
  const [section, setSection] = useState<SettingsSection>('ai')

  return (
    <div className="h-full flex overflow-hidden">
      {/* Sidebar */}
      <div className="w-48 shrink-0 border-r border-white/[0.05] bg-[#09090f] py-3">
        {SECTIONS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setSection(id)}
            className={cn(
              'w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors',
              section === id
                ? 'text-purple-400 bg-purple-600/10'
                : 'text-white/40 hover:text-white/70 hover:bg-white/[0.03]',
            )}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {section === 'ai' && <AISettings />}
        {section === 'streaming' && <StreamingSettings />}
        {section === 'audio-video' && <AVSettings />}
        {section === 'bible' && <BibleSettings />}
        {section !== 'ai' && section !== 'streaming' && section !== 'audio-video' && section !== 'bible' && (
          <div className="text-white/30 text-sm">Settings coming soon...</div>
        )}
      </div>
    </div>
  )
}

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
    <button
      onClick={() => onChange(!value)}
      className={cn(
        'relative w-10 h-5 rounded-full transition-colors',
        value ? 'bg-purple-600' : 'bg-white/15',
      )}
    >
      <span className={cn(
        'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
        value ? 'translate-x-5' : 'translate-x-0.5',
      )} />
    </button>
  )
}

function Input({ value, onChange, placeholder, type = 'text' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-64 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white/70 placeholder:text-white/25 outline-none focus:border-purple-500/50 transition-colors"
    />
  )
}

function AISettings() {
  const [openaiKey, setOpenaiKey] = useState('')
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434')
  const [scriptureDetection, setScriptureDetection] = useState(true)
  const [autoDisplay, setAutoDisplay] = useState(false)
  const [whisperModel, setWhisperModel] = useState('base.en')

  return (
    <div>
      <h2 className="text-lg font-bold text-white/90 mb-1">AI Services</h2>
      <p className="text-sm text-white/40 mb-6">Configure AI providers for scripture detection, transcription, and content generation</p>

      <div className="space-y-0">
        <SettingRow label="OpenAI API Key" description="Used for GPT-4o content generation">
          <Input value={openaiKey} onChange={setOpenaiKey} placeholder="sk-..." type="password" />
        </SettingRow>

        <SettingRow label="Ollama Server URL" description="Local LLM server for offline AI processing">
          <Input value={ollamaUrl} onChange={setOllamaUrl} placeholder="http://localhost:11434" />
        </SettingRow>

        <SettingRow label="Whisper Model" description="Speech recognition model for scripture detection">
          <select
            value={whisperModel}
            onChange={e => setWhisperModel(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white/70 outline-none"
          >
            {['tiny.en', 'base.en', 'small.en', 'medium.en', 'large-v3'].map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </SettingRow>

        <SettingRow label="Scripture Detection" description="Automatically detect Bible references from live audio">
          <Toggle value={scriptureDetection} onChange={setScriptureDetection} />
        </SettingRow>

        <SettingRow label="Auto-Display Detected Scripture" description="Automatically send detected scriptures to the output">
          <Toggle value={autoDisplay} onChange={setAutoDisplay} />
        </SettingRow>
      </div>
    </div>
  )
}

function StreamingSettings() {
  const [rtmpUrl, setRtmpUrl] = useState('rtmp://a.rtmp.youtube.com/live2')
  const [streamKey, setStreamKey] = useState('')
  const [bitrate, setBitrate] = useState('6000')
  const [resolution, setResolution] = useState('1920x1080')

  return (
    <div>
      <h2 className="text-lg font-bold text-white/90 mb-1">Streaming</h2>
      <p className="text-sm text-white/40 mb-6">Configure RTMP destinations and encoder settings</p>
      <div className="space-y-0">
        <SettingRow label="Primary RTMP URL" description="Main streaming destination">
          <Input value={rtmpUrl} onChange={setRtmpUrl} />
        </SettingRow>
        <SettingRow label="Stream Key" description="Keep this secret">
          <Input value={streamKey} onChange={setStreamKey} type="password" placeholder="Stream key..." />
        </SettingRow>
        <SettingRow label="Video Bitrate (kbps)" description="Higher = better quality, more bandwidth">
          <Input value={bitrate} onChange={setBitrate} />
        </SettingRow>
        <SettingRow label="Output Resolution" description="Streaming output resolution">
          <select
            value={resolution}
            onChange={e => setResolution(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white/70 outline-none"
          >
            {['1920x1080', '1280x720', '854x480', '640x360'].map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </SettingRow>
      </div>
    </div>
  )
}

function AVSettings() {
  const [videoDevice, setVideoDevice] = useState('Default Camera')
  const [audioDevice, setAudioDevice] = useState('Default Microphone')
  const [noiseSuppression, setNoiseSuppression] = useState(true)
  const [echoCancellation, setEchoCancellation] = useState(true)

  return (
    <div>
      <h2 className="text-lg font-bold text-white/90 mb-1">Audio & Video</h2>
      <p className="text-sm text-white/40 mb-6">Configure capture devices and processing</p>
      <div className="space-y-0">
        <SettingRow label="Primary Camera" description="Default video capture device">
          <select className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white/70 outline-none">
            <option>Default Camera</option>
            <option>Logitech C920</option>
            <option>Elgato Facecam</option>
          </select>
        </SettingRow>
        <SettingRow label="Audio Input" description="Microphone for AI transcription">
          <select className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white/70 outline-none">
            <option>Default Microphone</option>
            <option>Shure SM7B (USB)</option>
            <option>Line Input</option>
          </select>
        </SettingRow>
        <SettingRow label="Noise Suppression" description="AI-powered background noise removal">
          <Toggle value={noiseSuppression} onChange={setNoiseSuppression} />
        </SettingRow>
        <SettingRow label="Echo Cancellation" description="Remove acoustic echo from room">
          <Toggle value={echoCancellation} onChange={setEchoCancellation} />
        </SettingRow>
      </div>
    </div>
  )
}

function BibleSettings() {
  const [defaultTranslation, setDefaultTranslation] = useState('NIV')
  const [secondaryTranslation, setSecondaryTranslation] = useState('KJV')

  return (
    <div>
      <h2 className="text-lg font-bold text-white/90 mb-1">Bible Engine</h2>
      <p className="text-sm text-white/40 mb-6">Configure Bible translations and display preferences</p>
      <div className="space-y-0">
        <SettingRow label="Default Translation" description="Primary Bible translation for display">
          <select value={defaultTranslation} onChange={e => setDefaultTranslation(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white/70 outline-none">
            {['NIV', 'ESV', 'KJV', 'NKJV', 'NLT', 'NASB'].map(t => <option key={t}>{t}</option>)}
          </select>
        </SettingRow>
        <SettingRow label="Secondary Translation" description="Shown alongside primary translation">
          <select value={secondaryTranslation} onChange={e => setSecondaryTranslation(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white/70 outline-none">
            {['None', 'NIV', 'ESV', 'KJV', 'NKJV', 'NLT', 'NASB'].map(t => <option key={t}>{t}</option>)}
          </select>
        </SettingRow>
      </div>
    </div>
  )
}
