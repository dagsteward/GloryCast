import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

export interface StreamHealth {
  bitrate: number
  fps: number
  time: string
  droppedFrames: number
  uptime: number
}

export interface StreamDestination {
  id:       string
  name:     string
  /** Ingest URL WITHOUT the key, e.g. "rtmp://a.rtmp.youtube.com/live2/". */
  rtmpUrl:  string
  /**
   * Per-destination stream key. Each platform issues its own, so a single
   * app-wide key cannot work once you are streaming to more than one place.
   * Empty means the destination is not yet configured and cannot go live.
   */
  streamKey: string
  enabled:  boolean
  viewers:  number
  bitrate:  number
  health:   number
  status:   'live' | 'idle' | 'error'
}

export interface ChurchProfile {
  name:     string
  slug:     string
  timezone: string
  logoUrl?: string
  role:     string
}

export interface UpcomingService {
  title:     string
  date:      string   // ISO
  type:      string
  speakerName?: string
}

export interface SavedSong {
  id:         string
  title:      string
  rawText:    string
  uploadedAt: string  // ISO
}

interface AppState {
  // Church / user identity
  church: ChurchProfile
  userDisplayName: string
  userEmail: string

  // Stream state
  isStreaming:    boolean
  streamHealth:   StreamHealth | null
  streamKey:      string
  streamUptime:   number
  viewerCount:    number
  destinations:   StreamDestination[]

  // Production
  programSource:  string
  previewSource:  string
  currentScene:   string | null

  // Presentation
  isListeningForScripture:  boolean
  currentDetectedScripture: string | null
  lastDetectedScriptures:   { reference: string; time: string }[]

  // Service schedule
  upcomingService: UpcomingService | null
  lastServiceDate: string | null

  // Song library (persisted)
  songLibrary: SavedSong[]

  // Speech recognition
  /** deviceId of the input the AI listens to. Empty = system default. */
  asrDeviceId: string
  /** Whisper model id, e.g. "base.en". */
  asrModel: string

  // UI
  aiPanelOpen:      boolean
  connectionStatus: 'connected' | 'disconnected' | 'connecting'

  // Actions
  setChurch: (c: ChurchProfile) => void
  setUserInfo: (name: string, email: string) => void
  setIsStreaming: (v: boolean) => void
  setStreamHealth: (h: StreamHealth | null) => void
  setStreamKey: (k: string) => void
  setViewerCount: (n: number) => void
  setDestinations: (d: StreamDestination[]) => void
  setAsrDevice: (id: string) => void
  setAsrModel: (id: string) => void
  updateDestination: (id: string, patch: Partial<StreamDestination>) => void
  setProgramSource: (id: string) => void
  setPreviewSource: (id: string) => void
  setCurrentScene: (name: string | null) => void
  toggleScriptureListening: () => void
  setCurrentDetectedScripture: (ref: string | null) => void
  addDetectedScripture: (reference: string) => void
  setUpcomingService: (s: UpcomingService | null) => void
  setLastServiceDate: (d: string | null) => void
  saveSong: (song: Omit<SavedSong, 'id' | 'uploadedAt'>) => void
  deleteSong: (id: string) => void
  toggleAiPanel: () => void
  setConnectionStatus: (s: AppState['connectionStatus']) => void
  resetStream: () => void
}

const DEFAULT_DESTINATIONS: StreamDestination[] = [
  // Enabled defaults to false: a destination with no stream key cannot go
  // live, and pre-arming them would let an operator hit Go Live expecting
  // four platforms and reach none of them.
  { id: 'yt',  name: 'YouTube Live',    rtmpUrl: 'rtmp://a.rtmp.youtube.com/live2/', streamKey: '', enabled: false, viewers: 0, bitrate: 0, health: 0, status: 'idle' },
  { id: 'fb',  name: 'Facebook Live',   rtmpUrl: 'rtmps://live-api-s.facebook.com:443/rtmp/', streamKey: '', enabled: false, viewers: 0, bitrate: 0, health: 0, status: 'idle' },
  { id: 'twitch', name: 'Twitch',       rtmpUrl: 'rtmp://live.twitch.tv/app/',       streamKey: '', enabled: false, viewers: 0, bitrate: 0, health: 0, status: 'idle' },
  { id: 'custom', name: 'Custom RTMP',  rtmpUrl: '',                                 streamKey: '', enabled: false, viewers: 0, bitrate: 0, health: 0, status: 'idle' },
]

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        // Church / user
        church: {
          name:     'Grace Community Church',
          slug:     'grace-community-church',
          timezone: 'America/New_York',
          role:     'PRODUCER',
        },
        userDisplayName: 'Demo Producer',
        userEmail:       'producer@glorycast.ai',

        // Stream
        isStreaming:    false,
        streamHealth:   null,
        streamKey:      'gc-live-xxxxxxxx',
        streamUptime:   0,
        viewerCount:    0,
        destinations:   DEFAULT_DESTINATIONS,

        // Production
        programSource:  'cam1',
        previewSource:  'cam2',
        currentScene:   'Main Worship',

        // Presentation
        isListeningForScripture:  false,
        currentDetectedScripture: null,
        lastDetectedScriptures:   [],

        // Schedule
        upcomingService: {
          title:       'Sunday Morning Service',
          date:        (() => {
            const d = new Date()
            d.setDate(d.getDate() + (7 - d.getDay()) % 7 || 7)
            d.setHours(9, 0, 0, 0)
            return d.toISOString()
          })(),
          type:       'Worship Service',
          speakerName: 'Pastor James Wilson',
        },
        lastServiceDate: new Date(Date.now() - 7 * 86400000).toISOString(),

        asrDeviceId: '',
        asrModel: 'base.en',

        // Song library
        songLibrary: [],

        // UI
        aiPanelOpen:      false,
        connectionStatus: 'disconnected',

        // Actions
        setChurch: (c) => set({ church: c }),
        setUserInfo: (name, email) => set({ userDisplayName: name, userEmail: email }),
        setIsStreaming: (v) => set({ isStreaming: v }),
        setStreamHealth: (h) => set({ streamHealth: h }),
        setStreamKey: (k) => set({ streamKey: k }),
        setViewerCount: (n) => set({ viewerCount: n }),
        setDestinations: (d) => set({ destinations: d }),
        setAsrDevice: (id) => set({ asrDeviceId: id }),
        setAsrModel: (id) => set({ asrModel: id }),
        updateDestination: (id, patch) => set(s => ({
          destinations: s.destinations.map(d => d.id === id ? { ...d, ...patch } : d),
        })),
        setProgramSource: (id) => set({ programSource: id }),
        setPreviewSource: (id) => set({ previewSource: id }),
        setCurrentScene: (name) => set({ currentScene: name }),
        toggleScriptureListening: () => set(s => ({ isListeningForScripture: !s.isListeningForScripture })),
        setCurrentDetectedScripture: (ref) => set({ currentDetectedScripture: ref }),
        addDetectedScripture: (reference) => set(s => ({
          lastDetectedScriptures: [
            { reference, time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) },
            ...s.lastDetectedScriptures.slice(0, 9),
          ],
        })),
        setUpcomingService: (s) => set({ upcomingService: s }),
        setLastServiceDate: (d) => set({ lastServiceDate: d }),
        saveSong: ({ title, rawText }) => set(s => ({
          songLibrary: [
            { id: `song-lib-${Date.now()}`, title, rawText, uploadedAt: new Date().toISOString() },
            ...s.songLibrary.filter(x => x.title !== title),  // deduplicate by title
          ],
        })),
        deleteSong: (id) => set(s => ({ songLibrary: s.songLibrary.filter(x => x.id !== id) })),
        toggleAiPanel: () => set(s => ({ aiPanelOpen: !s.aiPanelOpen })),
        setConnectionStatus: (status) => set({ connectionStatus: status }),
        resetStream: () => set({
          isStreaming: false,
          streamHealth: null,
          streamUptime: 0,
          viewerCount: 0,
          destinations: get().destinations.map(d => ({ ...d, viewers: 0, bitrate: 0, health: 0, status: 'idle' as const })),
        }),
      }),
      {
        name: 'glorycast-app',
        partialize: (s) => ({
          church: s.church,
          userDisplayName: s.userDisplayName,
          userEmail: s.userEmail,
          streamKey: s.streamKey,
          destinations: s.destinations,
          upcomingService: s.upcomingService,
          lastServiceDate: s.lastServiceDate,
          songLibrary: s.songLibrary,
        }),
      },
    ),
    { name: 'GloryCast' },
  ),
)
