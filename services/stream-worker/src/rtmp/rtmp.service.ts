import { Injectable, Logger } from '@nestjs/common'
import * as NodeMediaServer    from 'node-media-server'
import { exec }                from 'child_process'

interface StreamSession {
  streamKey: string
  startedAt: Date
  destinations: string[]
  ffmpegPids: number[]
}

@Injectable()
export class RTMPService {
  private readonly logger = new Logger(RTMPService.name)
  private nms: any
  private readonly sessions = new Map<string, StreamSession>()

  private readonly config = {
    rtmp: {
      port:   parseInt(process.env.RTMP_PORT  ?? '1935'),
      chunk_size: 60000,
      gop_cache:  true,
      ping:       30,
      ping_timeout: 60,
    },
    http: {
      port:      parseInt(process.env.HLS_PORT ?? '8088'),
      allow_origin: '*',
      mediaroot: process.env.MEDIA_ROOT ?? '/tmp/glorycast/hls',
    },
  }

  start() {
    this.nms = new NodeMediaServer(this.config)

    this.nms.on('prePublish', (id: string, StreamPath: string) => {
      const key = StreamPath.split('/').pop()!
      this.logger.log(`Stream started: key=${key}`)
      this.sessions.set(key, { streamKey: key, startedAt: new Date(), destinations: [], ffmpegPids: [] })
    })

    this.nms.on('donePublish', (id: string, StreamPath: string) => {
      const key = StreamPath.split('/').pop()!
      this.logger.log(`Stream ended: key=${key}`)
      this.stopRestream(key)
      this.sessions.delete(key)
    })

    this.nms.run()
    this.logger.log(`RTMP server started on :${this.config.rtmp.port}`)
  }

  addDestination(streamKey: string, rtmpUrl: string) {
    const session = this.sessions.get(streamKey)
    if (!session) return false

    const ingestUrl = `rtmp://localhost:${this.config.rtmp.port}/live/${streamKey}`
    const cmd = `ffmpeg -re -i "${ingestUrl}" -c copy -f flv "${rtmpUrl}"`
    const proc = exec(cmd)
    if (proc.pid) session.ffmpegPids.push(proc.pid)
    session.destinations.push(rtmpUrl)
    this.logger.log(`Restreaming ${streamKey} → ${rtmpUrl}`)
    return true
  }

  stopRestream(streamKey: string) {
    const session = this.sessions.get(streamKey)
    if (!session) return

    for (const pid of session.ffmpegPids) {
      try { process.kill(pid) } catch {}
    }
    session.ffmpegPids = []
    session.destinations = []
  }

  getActiveSessions() {
    return [...this.sessions.values()].map(s => ({
      streamKey: s.streamKey,
      startedAt: s.startedAt,
      destinations: s.destinations,
    }))
  }
}
