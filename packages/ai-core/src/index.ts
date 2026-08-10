// GloryCast ai-core — public surface.

export {
  VoiceActivityDetector,
  DEFAULT_VAD,
  type Utterance,
  type VadOptions,
} from './vad.js'

export {
  downsample,
  encodeWav,
  toMono,
  WHISPER_SAMPLE_RATE,
} from './audio.js'

export {
  BIBLE_BOOKS,
  CHURCH_VOCABULARY,
  SPOKEN_NUMBERS,
  buildScripturePrompt,
  normalizeSpokenReferences,
  parseSpokenNumber,
} from './vocabulary.js'

export {
  WHISPER_MODELS,
  type AsrEngineId,
  type AsrStatus,
  type TranscriptSegment,
  type WhisperModel,
  type WhisperModelInfo,
} from './types.js'
