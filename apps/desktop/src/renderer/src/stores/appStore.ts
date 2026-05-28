import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface StreamHealth {
  bitrate: number
  fps: number
  time: string
  droppedFrames: number
  uptime: number
}

interface AppState {
  // Stream state
  isStreaming: boolean
  streamHealth: StreamHealth | null
  programSource: string
  previewSource: string
  currentScene: string | null
  viewerCount: number

  // Presentation
  isListeningForScripture: boolean
  currentDetectedScripture: string | null

  // UI
  aiPanelOpen: boolean
  connectionStatus: 'connected' | 'disconnected' | 'connecting'

  // Actions
  setIsStreaming: (v: boolean) => void
  setStreamHealth: (h: StreamHealth | null) => void
  setProgramSource: (id: string) => void
  setPreviewSource: (id: string) => void
  setCurrentScene: (name: string | null) => void
  setViewerCount: (n: number) => void
  toggleScriptureListening: () => void
  setCurrentDetectedScripture: (ref: string | null) => void
  toggleAiPanel: () => void
  setConnectionStatus: (s: AppState['connectionStatus']) => void
}

export const useAppStore = create<AppState>()(
  devtools(
    (set) => ({
      // Initial state
      isStreaming: false,
      streamHealth: null,
      programSource: 'cam1',
      previewSource: 'cam2',
      currentScene: 'Main Worship',
      viewerCount: 0,
      isListeningForScripture: false,
      currentDetectedScripture: null,
      aiPanelOpen: false,
      connectionStatus: 'disconnected',

      // Actions
      setIsStreaming: (v) => set({ isStreaming: v }),
      setStreamHealth: (h) => set({ streamHealth: h }),
      setProgramSource: (id) => set({ programSource: id }),
      setPreviewSource: (id) => set({ previewSource: id }),
      setCurrentScene: (name) => set({ currentScene: name }),
      setViewerCount: (n) => set({ viewerCount: n }),
      toggleScriptureListening: () => set((s) => ({ isListeningForScripture: !s.isListeningForScripture })),
      setCurrentDetectedScripture: (ref) => set({ currentDetectedScripture: ref }),
      toggleAiPanel: () => set((s) => ({ aiPanelOpen: !s.aiPanelOpen })),
      setConnectionStatus: (status) => set({ connectionStatus: status }),
    }),
    { name: 'GloryCast' },
  ),
)
