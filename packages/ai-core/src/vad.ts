// ─────────────────────────────────────────────────────────────────────────────
// Voice activity detection.
//
// Whisper transcribes a *segment*, not a stream, so something has to decide
// where an utterance starts and stops. Sending fixed 5-second windows would
// slice words in half and wreck accuracy on exactly the phrases that matter
// ("...Romans eight twenty—" / "—eight, and we know").
//
// This is an energy gate with hysteresis and a hangover, which is what a
// broadcast noise gate does and is well suited to a church: the speech comes
// from a mic'd speaker well above the room floor, and the failure mode we care
// about is clipping the end of a sentence, not detecting a whisper.
// ─────────────────────────────────────────────────────────────────────────────

export interface VadOptions {
  /** Sample rate of incoming audio. */
  sampleRate: number
  /**
   * RMS above which a frame counts as speech, in dBFS. Music and a loud room
   * sit well below a mic'd voice, so this is deliberately not near-silence.
   */
  openThresholdDb: number
  /** Level below which we start closing. Lower than open — that gap is the
   *  hysteresis that stops the gate chattering on every syllable gap. */
  closeThresholdDb: number
  /** How long the level must stay below close before we end the utterance. */
  hangoverMs: number
  /** Utterances shorter than this are discarded as coughs and door bangs. */
  minUtteranceMs: number
  /**
   * Hard cap on an utterance. A preacher in full flow may not pause for a
   * minute; we must still emit periodically or detection latency becomes
   * useless for live projection.
   */
  maxUtteranceMs: number
  /**
   * Audio retained from *before* the gate opened. Without this the first
   * consonant is always missing, which is what turns "Romans" into "omans".
   */
  preRollMs: number
}

export const DEFAULT_VAD: VadOptions = {
  sampleRate: 16000,
  openThresholdDb: -38,
  closeThresholdDb: -45,
  hangoverMs: 700,
  minUtteranceMs: 400,
  maxUtteranceMs: 12000,
  preRollMs: 300,
}

export interface Utterance {
  /** Mono PCM at `sampleRate`, in -1..1 float. */
  samples: Float32Array
  sampleRate: number
  durationMs: number
  /** True when the segment was cut by maxUtteranceMs rather than a pause. */
  truncated: boolean
}

function rmsDb(frame: Float32Array): number {
  let sum = 0
  for (let i = 0; i < frame.length; i++) sum += frame[i] * frame[i]
  const rms = Math.sqrt(sum / frame.length)
  if (rms <= 1e-8) return -100
  return 20 * Math.log10(rms)
}

export class VoiceActivityDetector {
  private readonly options: VadOptions
  private speaking = false

  /** Samples accumulated for the utterance currently being captured. */
  private captured: Float32Array[] = []
  private capturedLength = 0

  /** Rolling pre-roll buffer, kept even while the gate is closed. */
  private preRoll: Float32Array[] = []
  private preRollLength = 0
  private readonly preRollSamples: number

  private belowSince: number | null = null

  constructor(options: Partial<VadOptions> = {}) {
    this.options = { ...DEFAULT_VAD, ...options }
    this.preRollSamples = Math.floor(
      (this.options.preRollMs / 1000) * this.options.sampleRate,
    )
  }

  /** Current gate state — drives the "listening" indicator in the UI. */
  get isSpeaking(): boolean {
    return this.speaking
  }

  /**
   * Feed one frame of mono audio. Returns a completed utterance when the
   * speaker pauses (or the cap is hit), otherwise null.
   */
  push(frame: Float32Array, now: number): Utterance | null {
    const level = rmsDb(frame)
    const { openThresholdDb, closeThresholdDb, hangoverMs, maxUtteranceMs, sampleRate } = this.options

    if (!this.speaking) {
      this.pushPreRoll(frame)

      if (level >= openThresholdDb) {
        // Open the gate, seeding with pre-roll so the attack is intact.
        this.speaking = true
        this.captured = [...this.preRoll]
        this.capturedLength = this.preRollLength
        this.belowSince = null
      }
      return null
    }

    // Gate is open — accumulate.
    this.captured.push(frame)
    this.capturedLength += frame.length

    const durationMs = (this.capturedLength / sampleRate) * 1000

    if (level < closeThresholdDb) {
      if (this.belowSince === null) this.belowSince = now
      if (now - this.belowSince >= hangoverMs) {
        return this.finish(false)
      }
    } else {
      this.belowSince = null
    }

    if (durationMs >= maxUtteranceMs) {
      return this.finish(true)
    }

    return null
  }

  /** Force-close the current utterance, e.g. when the operator stops listening. */
  flush(): Utterance | null {
    if (!this.speaking) return null
    return this.finish(true)
  }

  reset(): void {
    this.speaking = false
    this.captured = []
    this.capturedLength = 0
    this.preRoll = []
    this.preRollLength = 0
    this.belowSince = null
  }

  private finish(truncated: boolean): Utterance | null {
    const { sampleRate, minUtteranceMs } = this.options

    const samples = concat(this.captured, this.capturedLength)
    const durationMs = (samples.length / sampleRate) * 1000

    this.speaking = false
    this.captured = []
    this.capturedLength = 0
    this.belowSince = null
    // A truncated utterance continues immediately; seeding the next one with
    // pre-roll keeps the join from swallowing a syllable.
    this.preRoll = []
    this.preRollLength = 0

    if (durationMs < minUtteranceMs) return null

    return { samples, sampleRate, durationMs, truncated }
  }

  private pushPreRoll(frame: Float32Array): void {
    this.preRoll.push(frame)
    this.preRollLength += frame.length
    while (this.preRollLength - this.preRoll[0].length >= this.preRollSamples) {
      this.preRollLength -= this.preRoll[0].length
      this.preRoll.shift()
    }
  }
}

function concat(chunks: Float32Array[], totalLength: number): Float32Array {
  const out = new Float32Array(totalLength)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.length
  }
  return out
}
