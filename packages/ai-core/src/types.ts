// Shared contracts for the speech pipeline.

/** Which engine produced a transcript — surfaced so the operator knows. */
export type AsrEngineId = 'whisper' | 'web-speech' | 'none'

export interface AsrStatus {
  engine: AsrEngineId
  /** True when audio is being captured and segmented. */
  listening: boolean
  /** True while the gate is open — i.e. someone is actually speaking. */
  speaking: boolean
  /**
   * Whisper only: whether the binary and a model were found. When false the
   * app falls back to Web Speech and must say so, because that path needs the
   * internet and cannot hear a selected input.
   */
  ready: boolean
  /** Human-readable reason the preferred engine is unavailable. */
  detail?: string
}

export interface TranscriptSegment {
  text: string
  /** Milliseconds of audio this segment covers. */
  durationMs: number
  /** Wall-clock time the segment was captured. */
  at: number
  /**
   * Model confidence 0..1 where the engine reports it. Web Speech does not
   * expose a usable value, so it reports undefined rather than a made-up one.
   */
  confidence?: number
  engine: AsrEngineId
}

/** Whisper model sizes, smallest to largest. */
export type WhisperModel = 'tiny.en' | 'base.en' | 'small.en' | 'medium.en'

export interface WhisperModelInfo {
  id: WhisperModel
  label: string
  /** Approximate download size. */
  sizeMb: number
  /** Guidance on the tradeoff, shown in Settings. */
  note: string
}

export const WHISPER_MODELS: WhisperModelInfo[] = [
  {
    id: 'tiny.en',
    label: 'Tiny (English)',
    sizeMb: 75,
    // Measured against spoken references (John 3:16, 2 Corinthians 5:17,
    // Deuteronomy 31:6, Philippians 4:13, Romans 8:28): ~1.6s vs ~2.9s per
    // utterance, and it resolved 5/5 where base resolved 4/5 — base ran
    // "four thirteen" together as "413", which no parser can recover.
    note: 'Recommended for scripture detection. Fastest, and handles spoken references well.',
  },
  {
    id: 'base.en',
    label: 'Base (English)',
    sizeMb: 142,
    note: 'Slower per utterance. Better for full sermon transcripts than live reference detection.',
  },
  {
    id: 'small.en',
    label: 'Small (English)',
    sizeMb: 466,
    note: 'Noticeably better on names. Needs a reasonably modern CPU.',
  },
  {
    id: 'medium.en',
    label: 'Medium (English)',
    sizeMb: 1500,
    note: 'Highest accuracy. Only keeps up live on a fast multi-core machine.',
  },
]
