import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '../../stores/appStore'
import { cn } from '../../lib/utils'

interface VideoSource {
  id: string
  label: string
  type: 'camera' | 'capture' | 'ndi' | 'media' | 'screen' | 'browser'
  thumbnail?: string
}

const MOCK_SOURCES: VideoSource[] = [
  { id: 'cam1', label: 'Camera 1 — Wide', type: 'camera' },
  { id: 'cam2', label: 'Camera 2 — Close', type: 'camera' },
  { id: 'cam3', label: 'Camera 3 — Stage', type: 'camera' },
  { id: 'capture1', label: 'HDMI Input 1', type: 'capture' },
  { id: 'screen1', label: 'Screen Share', type: 'screen' },
  { id: 'media1', label: 'Media Playback', type: 'media' },
  { id: 'ndi1', label: 'NDI — Laptop', type: 'ndi' },
  { id: 'program', label: 'PROGRAM OUT', type: 'camera' },
]

export function MultiView() {
  const { programSource, previewSource, setProgramSource, setPreviewSource } = useAppStore()

  return (
    <div className="h-full flex flex-col gap-3">
      {/* Program + Preview monitors */}
      <div className="grid grid-cols-2 gap-3 flex-1">
        <MonitorWindow
          label="PREVIEW"
          source={MOCK_SOURCES.find(s => s.id === previewSource)}
          variant="preview"
          onSourceSelect={(id) => setPreviewSource(id)}
        />
        <MonitorWindow
          label="PROGRAM"
          source={MOCK_SOURCES.find(s => s.id === programSource)}
          variant="program"
          onSourceSelect={(id) => setProgramSource(id)}
        />
      </div>

      {/* Multi-view grid */}
      <div className="grid grid-cols-4 gap-2 shrink-0" style={{ height: '160px' }}>
        {MOCK_SOURCES.slice(0, 8).map(source => (
          <SourceThumbnail
            key={source.id}
            source={source}
            isProgram={source.id === programSource}
            isPreview={source.id === previewSource}
            onPreviewSelect={() => setPreviewSource(source.id)}
          />
        ))}
      </div>
    </div>
  )
}

function MonitorWindow({
  label,
  source,
  variant,
  onSourceSelect,
}: {
  label: string
  source: VideoSource | undefined
  variant: 'program' | 'preview'
  onSourceSelect: (id: string) => void
}) {
  return (
    <div className={cn(
      'relative rounded-lg overflow-hidden border-2 flex flex-col',
      variant === 'program' ? 'active-program' : 'active-preview',
    )}>
      {/* Video area */}
      <div className="flex-1 bg-black relative">
        {/* Simulated video feed */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={cn(
            'absolute inset-0 opacity-30',
            variant === 'program'
              ? 'bg-gradient-to-br from-red-900/40 to-black'
              : 'bg-gradient-to-br from-emerald-900/30 to-black',
          )} />
          <div className="text-center relative z-10">
            <div className="text-white/20 text-xs">{source?.label ?? 'No Source'}</div>
          </div>
        </div>

        {/* Overlay label */}
        <div className={cn(
          'absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold tracking-widest',
          variant === 'program'
            ? 'bg-red-500 text-white'
            : 'bg-emerald-500 text-white',
        )}>
          {label}
        </div>

        {/* Source name */}
        <div className="absolute bottom-2 left-2 text-[10px] text-white/50 font-mono">
          {source?.label ?? '—'}
        </div>
      </div>
    </div>
  )
}

function SourceThumbnail({
  source,
  isProgram,
  isPreview,
  onPreviewSelect,
}: {
  source: VideoSource
  isProgram: boolean
  isPreview: boolean
  onPreviewSelect: () => void
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onPreviewSelect}
      className={cn(
        'relative rounded-md overflow-hidden cursor-pointer border transition-all',
        isProgram && 'border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]',
        isPreview && 'border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]',
        !isProgram && !isPreview && 'border-white/10 hover:border-white/25',
      )}
    >
      {/* Thumbnail */}
      <div className="w-full h-full bg-black relative aspect-video">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[9px] text-white/25 text-center px-1 leading-tight">
            {source.label}
          </span>
        </div>

        {/* Status badges */}
        {isProgram && (
          <div className="absolute top-1 left-1 px-1 py-0.5 bg-red-500 rounded-sm text-[8px] font-bold text-white">
            PGM
          </div>
        )}
        {isPreview && (
          <div className="absolute top-1 left-1 px-1 py-0.5 bg-emerald-500 rounded-sm text-[8px] font-bold text-white">
            PVW
          </div>
        )}

        {/* Source type badge */}
        <div className="absolute bottom-1 right-1 px-1 py-0.5 bg-black/60 rounded text-[8px] text-white/40 uppercase">
          {source.type}
        </div>
      </div>
    </motion.div>
  )
}
