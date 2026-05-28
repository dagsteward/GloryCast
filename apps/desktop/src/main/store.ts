import Store from 'electron-store'

interface StoreSchema {
  windowBounds: { width: number; height: number; x: number; y: number }
  theme: 'dark' | 'light'
  apiKeys: Record<string, string>
  streamingConfig: {
    rtmpUrl: string
    streamKey: string
    platforms: string[]
  }
  bibleTranslation: string
  aiConfig: {
    ollamaUrl: string
    openaiKey: string
    scriptureDetectionEnabled: boolean
  }
  presentation: {
    defaultBackground: string
    defaultFont: string
    defaultFontSize: number
  }
}

export class AppStore {
  private store: Store<StoreSchema>

  constructor() {
    this.store = new Store<StoreSchema>({
      defaults: {
        windowBounds: { width: 1600, height: 900, x: 0, y: 0 },
        theme: 'dark',
        apiKeys: {},
        streamingConfig: { rtmpUrl: '', streamKey: '', platforms: [] },
        bibleTranslation: 'NIV',
        aiConfig: {
          ollamaUrl: 'http://localhost:11434',
          openaiKey: '',
          scriptureDetectionEnabled: true,
        },
        presentation: {
          defaultBackground: '#000000',
          defaultFont: 'Inter',
          defaultFontSize: 72,
        },
      },
    })
  }

  get(key: string): unknown {
    return this.store.get(key as keyof StoreSchema)
  }

  set(key: string, value: unknown): void {
    this.store.set(key as keyof StoreSchema, value as never)
  }

  delete(key: string): void {
    this.store.delete(key as keyof StoreSchema)
  }
}
