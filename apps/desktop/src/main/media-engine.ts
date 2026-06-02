import { spawn, ChildProcess } from 'child_process'
import { join } from 'path'
import { EventEmitter } from 'events'

export interface MediaEngine extends EventEmitter {
  initialize(): Promise<void>
  startCapture(deviceId: string): Promise<void>
  stopCapture(deviceId: string): Promise<void>
  startStream(config: StreamConfig): Promise<void>
  stopStream(): Promise<void>
  getDevices(): Promise<MediaDevice[]>
  destroy(): void
}

export interface StreamConfig {
  rtmpUrl: string
  streamKey: string
  videoBitrate: number
  audioBitrate: number
  width: number
  height: number
  fps: number
}

export interface MediaDevice {
  id: string
  name: string
  type: 'video' | 'audio' | 'ndi'
  capabilities: string[]
}

class GloryCastMediaEngine extends EventEmitter implements MediaEngine {
  private ffmpegProcess: ChildProcess | null = null
  private activeDevices: Map<string, ChildProcess> = new Map()
  private initialized = false

  /** True once FFmpeg has been detected — RTMP restream needs it. */
  ffmpegAvailable = false

  async initialize(): Promise<void> {
    if (this.initialized) return

    // FFmpeg is only required for server-side RTMP restreaming. The app (camera
    // capture, switching, projection, recording in the renderer) works without
    // it, so a missing binary must NOT prevent the app from launching.
    this.ffmpegAvailable = await this.checkFFmpeg()
    if (!this.ffmpegAvailable) {
      console.warn('[MediaEngine] FFmpeg not found — RTMP restream disabled. Install FFmpeg to enable it.')
    }
    this.initialized = true
    this.emit('ready')
  }

  private checkFFmpeg(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const proc = spawn('ffmpeg', ['-version'], { stdio: 'pipe' })
        proc.on('close', (code) => resolve(code === 0))
        proc.on('error', () => resolve(false))
      } catch {
        resolve(false)
      }
    })
  }

  async getDevices(): Promise<MediaDevice[]> {
    return new Promise((resolve) => {
      const devices: MediaDevice[] = []

      const proc = spawn('ffmpeg', [
        '-f', 'dshow',
        '-list_devices', 'true',
        '-i', 'dummy',
      ], { stdio: 'pipe' })

      let stderr = ''
      proc.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString()
      })

      proc.on('close', () => {
        // Parse dshow device list
        const videoMatches = stderr.matchAll(/"([^"]+)" \(video\)/g)
        const audioMatches = stderr.matchAll(/"([^"]+)" \(audio\)/g)

        for (const match of videoMatches) {
          devices.push({
            id: `video:${match[1]}`,
            name: match[1],
            type: 'video',
            capabilities: ['capture', 'preview'],
          })
        }

        for (const match of audioMatches) {
          devices.push({
            id: `audio:${match[1]}`,
            name: match[1],
            type: 'audio',
            capabilities: ['capture'],
          })
        }

        resolve(devices)
      })
    })
  }

  async startCapture(deviceId: string): Promise<void> {
    if (this.activeDevices.has(deviceId)) return

    const [type, name] = deviceId.split(':')
    const args = [
      '-f', 'dshow',
      '-i', `${type}=${name}`,
      '-f', 'rawvideo',
      '-pix_fmt', 'yuv420p',
      'pipe:1',
    ]

    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] })
    this.activeDevices.set(deviceId, proc)

    proc.stdout?.on('data', (frame: Buffer) => {
      this.emit('frame', { deviceId, frame })
    })

    proc.on('close', () => {
      this.activeDevices.delete(deviceId)
      this.emit('device-stopped', deviceId)
    })
  }

  async stopCapture(deviceId: string): Promise<void> {
    const proc = this.activeDevices.get(deviceId)
    if (proc) {
      proc.kill('SIGTERM')
      this.activeDevices.delete(deviceId)
    }
  }

  async startStream(config: StreamConfig): Promise<void> {
    if (this.ffmpegProcess) {
      await this.stopStream()
    }

    const rtmpTarget = `${config.rtmpUrl}/${config.streamKey}`

    const args = [
      '-f', 'rawvideo',
      '-pix_fmt', 'yuv420p',
      '-s', `${config.width}x${config.height}`,
      '-r', String(config.fps),
      '-i', 'pipe:0',
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-tune', 'zerolatency',
      '-b:v', `${config.videoBitrate}k`,
      '-maxrate', `${config.videoBitrate * 1.5}k`,
      '-bufsize', `${config.videoBitrate * 2}k`,
      '-pix_fmt', 'yuv420p',
      '-g', String(config.fps * 2),
      '-c:a', 'aac',
      '-b:a', `${config.audioBitrate}k`,
      '-ar', '44100',
      '-f', 'flv',
      rtmpTarget,
    ]

    this.ffmpegProcess = spawn('ffmpeg', args, { stdio: 'pipe' })

    this.ffmpegProcess.stderr?.on('data', (data: Buffer) => {
      this.emit('stream-stats', this.parseFFmpegStats(data.toString()))
    })

    this.ffmpegProcess.on('close', (code) => {
      this.ffmpegProcess = null
      this.emit('stream-ended', { code })
    })

    this.emit('stream-started', config)
  }

  async stopStream(): Promise<void> {
    if (this.ffmpegProcess) {
      this.ffmpegProcess.kill('SIGTERM')
      this.ffmpegProcess = null
    }
  }

  private parseFFmpegStats(output: string): Record<string, string> {
    const stats: Record<string, string> = {}
    const patterns = {
      fps: /fps=\s*(\d+\.?\d*)/,
      bitrate: /bitrate=\s*(\S+)/,
      time: /time=(\S+)/,
      speed: /speed=\s*(\S+)/,
    }

    for (const [key, pattern] of Object.entries(patterns)) {
      const match = output.match(pattern)
      if (match) stats[key] = match[1]
    }

    return stats
  }

  destroy(): void {
    this.stopStream()
    for (const [id] of this.activeDevices) {
      this.stopCapture(id)
    }
    this.removeAllListeners()
  }
}

export function createMediaEngine(): Promise<MediaEngine> {
  return Promise.resolve(new GloryCastMediaEngine())
}
