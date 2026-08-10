import { spawn, type ChildProcess } from 'child_process'
import { EventEmitter } from 'events'
import { ipcMain, type BrowserWindow } from 'electron'

// ─────────────────────────────────────────────────────────────────────────────
// Encoder — the piece that actually puts GloryCast on air.
//
// The renderer composites video on the GPU and mixes audio in Web Audio, then
// hands us encoded WebM chunks from a MediaRecorder. We transcode those to
// H.264/AAC and fan them out to every enabled RTMP destination.
//
// A single FFmpeg process with `-f tee` serves all destinations: encoding once
// and duplicating the packets costs a fraction of running one encoder per
// platform, which matters on the modest hardware most churches actually own.
// ─────────────────────────────────────────────────────────────────────────────

export interface Destination {
  id: string
  name: string
  /** Full RTMP target including the stream key. */
  url: string
}

export interface EncoderConfig {
  destinations: Destination[]
  width: number
  height: number
  fps: number
  /** Video bitrate in kbps. */
  videoBitrate: number
  /** Audio bitrate in kbps. */
  audioBitrate: number
  /** x264 preset. 'veryfast' is the sane live default. */
  preset: string
  /** Optional local recording path. */
  recordPath?: string
}

export interface EncoderStats {
  /** Frames FFmpeg has encoded. */
  frames: number
  /** Encoding rate reported by FFmpeg. */
  fps: number
  /** Current output bitrate, e.g. "6012.3kbits/s". */
  bitrate: string
  /** Wall-clock position, e.g. "00:12:34.56". */
  time: string
  /** <1.0 means the encoder is falling behind real time — the key warning. */
  speed: number
  /** Frames FFmpeg dropped to keep up. */
  dropped: number
}

export type EncoderState = 'idle' | 'starting' | 'live' | 'stopping' | 'error'

class Encoder extends EventEmitter {
  private process: ChildProcess | null = null
  private state: EncoderState = 'idle'
  private ffmpegPath = 'ffmpeg'
  private available = false
  /** Tail of FFmpeg's stderr, kept so a failure can be reported usefully. */
  private stderrTail: string[] = []

  async detect(): Promise<boolean> {
    this.available = await new Promise<boolean>((resolve) => {
      try {
        const probe = spawn(this.ffmpegPath, ['-version'], { stdio: 'ignore' })
        probe.on('close', code => resolve(code === 0))
        probe.on('error', () => resolve(false))
      } catch {
        resolve(false)
      }
    })
    return this.available
  }

  get isAvailable(): boolean {
    return this.available
  }

  get currentState(): EncoderState {
    return this.state
  }

  /**
   * Build the FFmpeg argument list.
   *
   * Input is Matroska/WebM off the renderer's MediaRecorder. We must NOT use
   * `-re` — that paces a file at real time, and our input already arrives in
   * real time; adding it would compound latency until the stream drifts.
   */
  private buildArgs(config: EncoderConfig): string[] {
    const gop = config.fps * 2

    const args = [
      '-hide_banner',
      '-loglevel', 'info',
      // Read the live WebM stream from stdin.
      '-f', 'matroska',
      '-i', 'pipe:0',

      // ── Video ──
      '-c:v', 'libx264',
      '-preset', config.preset,
      '-tune', 'zerolatency',
      '-profile:v', 'high',
      '-pix_fmt', 'yuv420p',
      '-b:v', `${config.videoBitrate}k`,
      '-maxrate', `${config.videoBitrate}k`,
      // A 2s buffer is what YouTube and Facebook both expect for stable ABR.
      '-bufsize', `${config.videoBitrate * 2}k`,
      '-g', String(gop),
      '-keyint_min', String(gop),
      // Closed GOP with no scene-cut keyframes: platforms segment on keyframe
      // boundaries, and an irregular cadence causes visible stalls on HLS.
      '-sc_threshold', '0',
      '-r', String(config.fps),

      // ── Audio ──
      '-c:a', 'aac',
      '-b:a', `${config.audioBitrate}k`,
      '-ar', '44100',
      '-ac', '2',
    ]

    const outputs: string[] = config.destinations.map(
      d => `[f=flv:onfail=ignore]${d.url}`,
    )
    if (config.recordPath) {
      outputs.push(`[f=mp4]${config.recordPath}`)
    }

    if (outputs.length === 1 && !config.recordPath) {
      // Single destination — skip the tee muxer entirely.
      args.push('-f', 'flv', config.destinations[0].url)
    } else {
      // onfail=ignore keeps the service on air if one platform rejects us.
      args.push('-f', 'tee', '-map', '0:v', '-map', '0:a', outputs.join('|'))
    }

    return args
  }

  async start(config: EncoderConfig): Promise<void> {
    if (this.process) throw new Error('Encoder already running')
    if (config.destinations.length === 0 && !config.recordPath) {
      throw new Error('No destinations enabled')
    }
    if (!this.available && !(await this.detect())) {
      throw new Error(
        'FFmpeg was not found. Install FFmpeg and ensure it is on your PATH to stream or record.',
      )
    }

    this.state = 'starting'
    this.stderrTail = []

    const args = this.buildArgs(config)
    const proc = spawn(this.ffmpegPath, args, {
      stdio: ['pipe', 'ignore', 'pipe'],
    })
    this.process = proc

    proc.stderr?.setEncoding('utf8')
    proc.stderr?.on('data', (chunk: string) => {
      for (const line of chunk.split(/\r?\n|\r/)) {
        if (!line.trim()) continue

        this.stderrTail.push(line)
        if (this.stderrTail.length > 40) this.stderrTail.shift()

        const stats = parseProgress(line)
        if (stats) {
          if (this.state === 'starting') {
            this.state = 'live'
            this.emit('state', this.state)
          }
          this.emit('stats', stats)
        }
      }
    })

    // EPIPE is expected when FFmpeg exits while we are still writing; it must
    // not surface as an unhandled error and take down the main process.
    proc.stdin?.on('error', () => {})

    proc.on('error', (err) => {
      this.state = 'error'
      this.process = null
      this.emit('error', err.message)
    })

    proc.on('close', (code) => {
      const wasStopping = this.state === 'stopping'
      this.process = null
      this.state = wasStopping || code === 0 ? 'idle' : 'error'

      if (!wasStopping && code !== 0) {
        this.emit('error', this.describeFailure(code))
      }
      this.emit('state', this.state)
      this.emit('ended', { code })
    })
  }

  /**
   * Turn an FFmpeg exit into something an operator can act on. A raw exit code
   * mid-service is useless; the common failures have specific causes.
   */
  private describeFailure(code: number | null): string {
    const tail = this.stderrTail.join('\n')

    if (/Connection refused|Failed to connect|Cannot open connection/i.test(tail)) {
      return 'Could not reach the streaming server. Check the RTMP URL and your internet connection.'
    }
    if (/Invalid stream key|not authorized|403|Authentication/i.test(tail)) {
      return 'The streaming platform rejected the stream key.'
    }
    if (/No space left/i.test(tail)) {
      return 'The disk is full — recording stopped.'
    }
    const lastLine = this.stderrTail[this.stderrTail.length - 1] ?? ''
    return `Encoder exited with code ${code}. ${lastLine}`.trim()
  }

  /** Feed one MediaRecorder chunk to the encoder. */
  write(chunk: Buffer): void {
    const stdin = this.process?.stdin
    if (!stdin || stdin.destroyed) return
    // Backpressure is handled by Node's stream buffering; dropping chunks here
    // would corrupt the WebM container rather than merely delaying it.
    stdin.write(chunk)
  }

  async stop(): Promise<void> {
    const proc = this.process
    if (!proc) return

    this.state = 'stopping'
    this.emit('state', this.state)

    // Closing stdin lets FFmpeg flush and write a clean trailer, which matters
    // for the local recording. Only escalate if it will not exit.
    try { proc.stdin?.end() } catch { /* already closed */ }

    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        try { proc.kill('SIGKILL') } catch { /* already gone */ }
        resolve()
      }, 4000)

      proc.once('close', () => {
        clearTimeout(timer)
        resolve()
      })
    })
  }
}

/**
 * Parse one FFmpeg progress line.
 *
 * Returns null for anything that is not a progress update, so ordinary log
 * chatter never masquerades as telemetry.
 */
export function parseProgress(line: string): EncoderStats | null {
  if (!line.includes('frame=') || !line.includes('time=')) return null

  const num = (pattern: RegExp): number => {
    const match = line.match(pattern)
    return match ? parseFloat(match[1]) : 0
  }

  const bitrate = line.match(/bitrate=\s*(\S+)/)?.[1] ?? 'N/A'
  const time = line.match(/time=(\S+)/)?.[1] ?? '00:00:00.00'

  return {
    frames: num(/frame=\s*(\d+)/),
    fps: num(/fps=\s*([\d.]+)/),
    bitrate,
    time,
    speed: num(/speed=\s*([\d.]+)/),
    dropped: num(/drop=\s*(\d+)/),
  }
}

const encoder = new Encoder()

/** Register encoder IPC and forward its events to the given window. */
export function registerEncoder(getWindow: () => BrowserWindow | null): void {
  const send = (channel: string, payload?: unknown) => {
    const win = getWindow()
    if (win && !win.isDestroyed()) win.webContents.send(channel, payload)
  }

  encoder.on('stats', s => send('encoder:stats', s))
  encoder.on('state', s => send('encoder:state', s))
  encoder.on('error', m => send('encoder:error', m))
  encoder.on('ended', p => send('encoder:ended', p))

  ipcMain.handle('encoder:available', () => encoder.detect())
  ipcMain.handle('encoder:state', () => encoder.currentState)

  ipcMain.handle('encoder:start', async (_e, config: EncoderConfig) => {
    try {
      await encoder.start(config)
      return { ok: true as const }
    } catch (err) {
      return { ok: false as const, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('encoder:stop', async () => {
    await encoder.stop()
    return { ok: true as const }
  })

  // Chunks arrive continuously; `on` (not `handle`) avoids a promise per chunk.
  ipcMain.on('encoder:chunk', (_e, chunk: ArrayBuffer) => {
    encoder.write(Buffer.from(chunk))
  })
}

/** Stop the encoder during app shutdown so FFmpeg never outlives the app. */
export async function shutdownEncoder(): Promise<void> {
  await encoder.stop()
}
