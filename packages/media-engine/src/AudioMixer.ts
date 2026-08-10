// ─────────────────────────────────────────────────────────────────────────────
// AudioMixer — the audio half of program output.
//
// Mirrors the Compositor: sources go in, one bus comes out, and that bus is
// what the encoder muxes alongside the composited video. Built on Web Audio so
// gain, muting and metering all happen on the audio thread rather than in
// React.
//
// Signal path per channel:
//   MediaStreamSource → gain (fader) → analyser (metering) → master
// and the master carries its own gain plus a limiter, because a church desk
// feed WILL clip at some point and clipping the stream is unrecoverable.
// ─────────────────────────────────────────────────────────────────────────────

export interface ChannelState {
  id: string
  label: string
  /** Linear gain, 0..2 (unity = 1). */
  gain: number
  muted: boolean
  soloed: boolean
  /** True when the channel's source actually carries audio. */
  hasSignal: boolean
}

/** Instantaneous level readings for one channel, in dBFS. */
export interface ChannelLevels {
  /** RMS level — what a VU meter shows. -Infinity when silent. */
  rms: number
  /** Sample peak since the last read. */
  peak: number
  /** True if any sample hit full scale since the last read. */
  clipped: boolean
}

const MIN_DB = -60

/** Convert a 0..1 linear amplitude to dBFS, floored at MIN_DB. */
function toDb(amplitude: number): number {
  if (amplitude <= 0) return MIN_DB
  return Math.max(MIN_DB, 20 * Math.log10(amplitude))
}

class Channel {
  readonly source: MediaStreamAudioSourceNode
  readonly gainNode: GainNode
  readonly analyser: AnalyserNode

  // Explicit ArrayBuffer backing: getFloatTimeDomainData rejects a
  // SharedArrayBuffer-backed view, which is what the bare Float32Array type
  // widens to under current lib.dom typings.
  private readonly buffer: Float32Array<ArrayBuffer>
  private peakHold = 0
  private clipped = false

  constructor(
    context: AudioContext,
    stream: MediaStream,
    public state: ChannelState,
  ) {
    this.source = context.createMediaStreamSource(stream)
    this.gainNode = context.createGain()
    this.analyser = context.createAnalyser()
    // Small FFT: we only need time-domain samples for levels, and a short
    // window keeps the meter responsive.
    this.analyser.fftSize = 1024
    this.analyser.smoothingTimeConstant = 0.3

    this.buffer = new Float32Array(this.analyser.fftSize)

    this.source.connect(this.gainNode)
    this.gainNode.connect(this.analyser)
  }

  /**
   * Apply the channel's gain, accounting for mute and the mixer's solo state.
   * Ramped rather than stepped — an abrupt gain change is an audible click on
   * air.
   */
  applyGain(context: AudioContext, anySoloed: boolean): void {
    const audible = !this.state.muted && (!anySoloed || this.state.soloed)
    const target = audible ? this.state.gain : 0
    this.gainNode.gain.setTargetAtTime(target, context.currentTime, 0.015)
  }

  readLevels(): ChannelLevels {
    this.analyser.getFloatTimeDomainData(this.buffer)

    let sumSquares = 0
    let peak = 0
    for (let i = 0; i < this.buffer.length; i++) {
      const sample = this.buffer[i]
      sumSquares += sample * sample
      const abs = Math.abs(sample)
      if (abs > peak) peak = abs
    }

    if (peak >= 0.999) this.clipped = true
    if (peak > this.peakHold) this.peakHold = peak

    const rms = Math.sqrt(sumSquares / this.buffer.length)
    const levels: ChannelLevels = {
      rms: toDb(rms),
      peak: toDb(this.peakHold),
      clipped: this.clipped,
    }

    // Peak hold decays so the meter falls back after a transient.
    this.peakHold *= 0.88
    return levels
  }

  resetClip(): void {
    this.clipped = false
  }

  disconnect(): void {
    try { this.source.disconnect() } catch { /* already torn down */ }
    try { this.gainNode.disconnect() } catch { /* already torn down */ }
    try { this.analyser.disconnect() } catch { /* already torn down */ }
  }
}

export class AudioMixer {
  private context: AudioContext
  private master: GainNode
  private limiter: DynamicsCompressorNode
  private masterAnalyser: AnalyserNode
  private destination: MediaStreamAudioDestinationNode

  private readonly channels = new Map<string, Channel>()
  private readonly masterBuffer: Float32Array<ArrayBuffer>
  private masterPeakHold = 0
  private masterClipped = false

  /** Master fader, 0..2. */
  masterGain = 1

  constructor(context?: AudioContext) {
    this.context = context ?? new AudioContext({ latencyHint: 'interactive' })

    this.master = this.context.createGain()

    // Brick-wall-ish limiter. A hard knee just below full scale is the
    // difference between a hot moment sounding loud and it sounding broken.
    this.limiter = this.context.createDynamicsCompressor()
    this.limiter.threshold.value = -1.5
    this.limiter.knee.value = 0
    this.limiter.ratio.value = 20
    this.limiter.attack.value = 0.003
    this.limiter.release.value = 0.12

    this.masterAnalyser = this.context.createAnalyser()
    this.masterAnalyser.fftSize = 1024
    this.masterBuffer = new Float32Array(this.masterAnalyser.fftSize)

    this.destination = this.context.createMediaStreamDestination()

    this.master.connect(this.limiter)
    this.limiter.connect(this.masterAnalyser)
    this.masterAnalyser.connect(this.destination)
  }

  /**
   * The mixed output, ready to be muxed with the composited video.
   *
   * Deliberately NOT connected to context.destination — routing the program
   * mix to the operator's speakers is how you get feedback howl in a room with
   * open microphones. Monitoring is a separate, explicit opt-in.
   */
  get outputTrack(): MediaStreamTrack | null {
    return this.destination.stream.getAudioTracks()[0] ?? null
  }

  get outputStream(): MediaStream {
    return this.destination.stream
  }

  get sampleRate(): number {
    return this.context.sampleRate
  }

  /** Browsers start AudioContexts suspended until a user gesture. */
  async resume(): Promise<void> {
    if (this.context.state === 'suspended') {
      await this.context.resume()
    }
  }

  get running(): boolean {
    return this.context.state === 'running'
  }

  // ── Channels ──────────────────────────────────────────────────────────────

  /**
   * Add (or replace) a channel fed by `stream`. Streams with no audio track
   * are ignored rather than creating a silent dead channel.
   */
  addChannel(id: string, label: string, stream: MediaStream): boolean {
    if (stream.getAudioTracks().length === 0) return false

    this.removeChannel(id)

    const channel = new Channel(this.context, stream, {
      id, label, gain: 1, muted: false, soloed: false, hasSignal: true,
    })
    channel.gainNode.connect(this.master)
    this.channels.set(id, channel)
    this.refreshGains()
    return true
  }

  removeChannel(id: string): void {
    const channel = this.channels.get(id)
    if (!channel) return
    channel.disconnect()
    this.channels.delete(id)
    this.refreshGains()
  }

  hasChannel(id: string): boolean {
    return this.channels.has(id)
  }

  getChannels(): ChannelState[] {
    return [...this.channels.values()].map(c => ({ ...c.state }))
  }

  setGain(id: string, gain: number): void {
    const channel = this.channels.get(id)
    if (!channel) return
    channel.state.gain = Math.max(0, Math.min(2, gain))
    this.refreshGains()
  }

  setMuted(id: string, muted: boolean): void {
    const channel = this.channels.get(id)
    if (!channel) return
    channel.state.muted = muted
    this.refreshGains()
  }

  setSoloed(id: string, soloed: boolean): void {
    const channel = this.channels.get(id)
    if (!channel) return
    channel.state.soloed = soloed
    this.refreshGains()
  }

  setMasterGain(gain: number): void {
    this.masterGain = Math.max(0, Math.min(2, gain))
    this.master.gain.setTargetAtTime(this.masterGain, this.context.currentTime, 0.015)
  }

  /** Recompute every channel's effective gain — solo is a mixer-wide state. */
  private refreshGains(): void {
    const anySoloed = [...this.channels.values()].some(c => c.state.soloed)
    for (const channel of this.channels.values()) {
      channel.applyGain(this.context, anySoloed)
    }
  }

  // ── Metering ──────────────────────────────────────────────────────────────

  /** Read every channel's levels. Call on an animation frame from the UI. */
  readLevels(): Record<string, ChannelLevels> {
    const out: Record<string, ChannelLevels> = {}
    for (const [id, channel] of this.channels) {
      out[id] = channel.readLevels()
    }
    return out
  }

  readMasterLevels(): ChannelLevels {
    this.masterAnalyser.getFloatTimeDomainData(this.masterBuffer)

    let sumSquares = 0
    let peak = 0
    for (let i = 0; i < this.masterBuffer.length; i++) {
      const sample = this.masterBuffer[i]
      sumSquares += sample * sample
      const abs = Math.abs(sample)
      if (abs > peak) peak = abs
    }

    if (peak >= 0.999) this.masterClipped = true
    if (peak > this.masterPeakHold) this.masterPeakHold = peak

    const rms = Math.sqrt(sumSquares / this.masterBuffer.length)
    const levels: ChannelLevels = {
      rms: toDb(rms),
      peak: toDb(this.masterPeakHold),
      clipped: this.masterClipped,
    }
    this.masterPeakHold *= 0.88
    return levels
  }

  /** Clear latched clip indicators after the operator acknowledges them. */
  resetClipIndicators(): void {
    this.masterClipped = false
    for (const channel of this.channels.values()) channel.resetClip()
  }

  dispose(): void {
    for (const channel of this.channels.values()) channel.disconnect()
    this.channels.clear()
    try { this.master.disconnect() } catch { /* already torn down */ }
    try { this.limiter.disconnect() } catch { /* already torn down */ }
    try { this.masterAnalyser.disconnect() } catch { /* already torn down */ }
    void this.context.close().catch(() => {})
  }
}

export { MIN_DB }
