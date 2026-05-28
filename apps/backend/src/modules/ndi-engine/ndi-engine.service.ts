import { Injectable, Logger } from '@nestjs/common'
import { EventEmitter2 }      from '@nestjs/event-emitter'
import { Interval }           from '@nestjs/schedule'

export interface NDISource {
  name:    string
  url:     string
  online:  boolean
  latency: number
}

@Injectable()
export class NDIEngineService {
  private readonly logger  = new Logger(NDIEngineService.name)
  private sources: NDISource[] = []
  private readonly simulatedSources: NDISource[] = [
    { name: 'CAMERA-1 (NDI)',  url: 'ndi://192.168.1.10/camera-1', online: true,  latency: 4  },
    { name: 'STAGE-CAM (NDI)', url: 'ndi://192.168.1.11/stage-cam', online: true,  latency: 6  },
    { name: 'SLIDE-PC (NDI)',  url: 'ndi://192.168.1.20/slide-pc',  online: false, latency: 0  },
  ]

  constructor(private readonly emitter: EventEmitter2) {
    this.sources = [...this.simulatedSources]
  }

  getSources(): NDISource[] {
    return this.sources
  }

  addSource(source: NDISource) {
    const existing = this.sources.findIndex(s => s.url === source.url)
    if (existing >= 0) {
      this.sources[existing] = source
    } else {
      this.sources.push(source)
    }
    this.emitter.emit('ndi.source.added', source)
    return source
  }

  removeSource(url: string) {
    this.sources = this.sources.filter(s => s.url !== url)
    this.emitter.emit('ndi.source.removed', { url })
  }

  getSourceStatus(url: string): NDISource | undefined {
    return this.sources.find(s => s.url === url)
  }

  // Periodic discovery scan (every 30s)
  @Interval(30_000)
  async discoverSources() {
    this.logger.debug('NDI discovery scan...')
    // In production: exec ndi-discovery binary or use SDK bindings
    // For now update simulated latencies
    this.sources = this.sources.map(s => ({
      ...s,
      latency: s.online ? Math.floor(Math.random() * 8) + 2 : 0,
    }))
    this.emitter.emit('ndi.sources.updated', this.sources)
  }
}
