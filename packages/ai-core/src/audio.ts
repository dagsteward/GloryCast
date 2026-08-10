// ─────────────────────────────────────────────────────────────────────────────
// Audio conversion for the speech pipeline.
//
// Whisper expects 16 kHz mono. Browser capture is typically 44.1 or 48 kHz, so
// everything has to be downsampled before it leaves the renderer — sending
// 48 kHz over IPC would triple the payload for no accuracy gain.
// ─────────────────────────────────────────────────────────────────────────────

export const WHISPER_SAMPLE_RATE = 16000

/**
 * Downsample mono float audio to `targetRate`.
 *
 * Averages across each source window rather than picking the nearest sample.
 * Naive decimation aliases high frequencies down into the speech band, which
 * on sibilants produces exactly the kind of artefact that makes an ASR model
 * hallucinate words.
 */
export function downsample(
  input: Float32Array,
  inputRate: number,
  targetRate: number = WHISPER_SAMPLE_RATE,
): Float32Array {
  if (inputRate === targetRate) return input
  if (inputRate < targetRate) {
    // Upsampling would invent detail that is not there; Whisper handles a
    // lower rate better than a fabricated one.
    return input
  }

  const ratio = inputRate / targetRate
  const outputLength = Math.floor(input.length / ratio)
  const output = new Float32Array(outputLength)

  for (let i = 0; i < outputLength; i++) {
    const start = Math.floor(i * ratio)
    const end = Math.min(input.length, Math.floor((i + 1) * ratio))

    let sum = 0
    for (let j = start; j < end; j++) sum += input[j]
    output[i] = end > start ? sum / (end - start) : 0
  }

  return output
}

/** Mix an interleaved multi-channel buffer down to mono. */
export function toMono(input: Float32Array, channels: number): Float32Array {
  if (channels <= 1) return input

  const frames = Math.floor(input.length / channels)
  const output = new Float32Array(frames)

  for (let i = 0; i < frames; i++) {
    let sum = 0
    for (let c = 0; c < channels; c++) sum += input[i * channels + c]
    output[i] = sum / channels
  }

  return output
}

/**
 * Encode mono float samples as a 16-bit PCM WAV.
 *
 * whisper.cpp reads WAV from disk, so the renderer hands the main process a
 * complete, self-describing file rather than raw samples plus out-of-band
 * format metadata that could drift.
 */
export function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)

  const writeString = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i))
  }

  const dataSize = samples.length * 2

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeString(8, 'WAVE')

  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)          // PCM chunk size
  view.setUint16(20, 1, true)           // format = PCM
  view.setUint16(22, 1, true)           // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)  // byte rate
  view.setUint16(32, 2, true)           // block align
  view.setUint16(34, 16, true)          // bits per sample

  writeString(36, 'data')
  view.setUint32(40, dataSize, true)

  let offset = 44
  for (let i = 0; i < samples.length; i++) {
    // Clamp before scaling: a value beyond ±1 would wrap and become a loud
    // click, which reads to the model as a plosive.
    const clamped = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true)
    offset += 2
  }

  return buffer
}
