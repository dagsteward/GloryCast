import { spawn } from 'child_process'
import { app, ipcMain } from 'electron'
import { existsSync, mkdirSync, writeFileSync, unlinkSync, readdirSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

// ─────────────────────────────────────────────────────────────────────────────
// Whisper — local, offline speech recognition.
//
// Replaces the Web Speech API, which was the wrong foundation for this product
// in three ways: it ships every word of a service to Google's servers, it stops
// working without internet, and it can only ever hear the default microphone —
// never the soundboard feed, which is the one source that actually carries the
// preacher clearly.
//
// The renderer segments audio into utterances and hands us WAV files; we run
// whisper.cpp over each one and return the text. Per-utterance invocation keeps
// this simple and robust: a crashed transcription costs one sentence, not the
// whole service.
// ─────────────────────────────────────────────────────────────────────────────

export interface WhisperOptions {
  /** Model file id, e.g. "base.en". */
  model: string
  /** Prompt used to bias decoding toward scripture vocabulary. */
  prompt: string
  /** Worker threads. Defaults to half the cores so the encoder keeps its own. */
  threads?: number
}

export interface WhisperResult {
  text: string
  /** Seconds of wall clock the transcription took — surfaced to warn on lag. */
  elapsedSec: number
}

/** Where models live. Kept in userData so an app update never deletes them. */
export function modelsDirectory(): string {
  const dir = join(app.getPath('userData'), 'whisper-models')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

function modelPath(model: string): string {
  return join(modelsDirectory(), `ggml-${model}.bin`)
}

/**
 * Locate the whisper.cpp executable.
 *
 * Checked in order of how deliberate the choice is: an explicit override wins,
 * then a binary shipped beside the app, then whatever is on PATH.
 */
function resolveBinary(): string | null {
  const override = process.env.GLORYCAST_WHISPER_PATH
  if (override && existsSync(override)) return override

  const bundled = join(process.resourcesPath ?? '', 'whisper', binaryName())
  if (existsSync(bundled)) return bundled

  return null
}

function binaryName(): string {
  return process.platform === 'win32' ? 'whisper-cli.exe' : 'whisper-cli'
}

export interface WhisperAvailability {
  ready: boolean
  binary: string | null
  /** Models actually present on disk. */
  installedModels: string[]
  detail: string
}

export function checkAvailability(): WhisperAvailability {
  const binary = resolveBinary()

  let installedModels: string[] = []
  try {
    installedModels = readdirSync(modelsDirectory())
      .filter(f => f.startsWith('ggml-') && f.endsWith('.bin'))
      .map(f => f.replace(/^ggml-|\.bin$/g, ''))
  } catch {
    installedModels = []
  }

  if (!binary) {
    return {
      ready: false,
      binary: null,
      installedModels,
      detail:
        'Whisper engine not found. Local transcription is unavailable — ' +
        'GloryCast will fall back to online recognition.',
    }
  }
  if (installedModels.length === 0) {
    return {
      ready: false,
      binary,
      installedModels,
      detail: 'No Whisper model installed. Download one in Settings → AI Services.',
    }
  }

  return { ready: true, binary, installedModels, detail: 'Local transcription ready.' }
}

/** Transcribe one WAV buffer. Resolves to null when nothing intelligible. */
async function transcribe(wav: ArrayBuffer, options: WhisperOptions): Promise<WhisperResult | null> {
  const availability = checkAvailability()
  if (!availability.ready || !availability.binary) return null

  const model = modelPath(options.model)
  if (!existsSync(model)) return null

  // whisper.cpp reads from disk; a temp file per utterance is cheap and avoids
  // any stdin framing ambiguity.
  const file = join(tmpdir(), `glorycast-${Date.now()}-${Math.random().toString(36).slice(2)}.wav`)
  writeFileSync(file, Buffer.from(wav))

  const started = Date.now()

  try {
    const text = await new Promise<string>((resolve, reject) => {
      const args = [
        '-m', model,
        '-f', file,
        '--output-txt', 'false',
        '--no-timestamps',
        '--language', 'en',
        // Bias decoding toward scripture vocabulary.
        '--prompt', options.prompt,
        '--threads', String(options.threads ?? Math.max(1, Math.floor((navigatorHardware() || 4) / 2))),
        // Suppress the "[BLANK_AUDIO]" style markers whisper emits on silence.
        '--no-prints',
      ]

      const proc = spawn(availability.binary as string, args, { stdio: ['ignore', 'pipe', 'pipe'] })

      let stdout = ''
      let stderr = ''
      proc.stdout?.on('data', (d: Buffer) => { stdout += d.toString() })
      proc.stderr?.on('data', (d: Buffer) => { stderr += d.toString() })

      // A single utterance must never hang the pipeline; if the model is too
      // slow for this machine we drop the sentence and keep listening.
      const timeout = setTimeout(() => {
        try { proc.kill('SIGKILL') } catch { /* already gone */ }
        reject(new Error('Transcription timed out'))
      }, 20000)

      proc.on('error', (err) => {
        clearTimeout(timeout)
        reject(err)
      })

      proc.on('close', (code) => {
        clearTimeout(timeout)
        if (code === 0) resolve(stdout)
        else reject(new Error(stderr.trim().split('\n').pop() ?? `whisper exited ${code}`))
      })
    })

    const cleaned = cleanTranscript(text)
    if (!cleaned) return null

    return { text: cleaned, elapsedSec: (Date.now() - started) / 1000 }
  } finally {
    try { unlinkSync(file) } catch { /* best effort */ }
  }
}

function navigatorHardware(): number {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return (require('os') as typeof import('os')).cpus().length
  } catch {
    return 4
  }
}

/**
 * Strip whisper.cpp's non-speech annotations.
 *
 * On silence or music the model emits bracketed markers, and on very short
 * segments it is prone to hallucinating stock phrases. Both would otherwise
 * flow straight into scripture detection as if they were spoken words.
 */
export function cleanTranscript(raw: string): string {
  let text = raw
    .replace(/\[[^\]]*\]/g, ' ')      // [BLANK_AUDIO], [MUSIC]
    .replace(/\([^)]*\)/g, ' ')       // (upbeat music)
    .replace(/\s+/g, ' ')
    .trim()

  // Common Whisper hallucinations on near-silence.
  const noise = [
    'thank you.', 'thanks for watching!', 'you', 'bye.', 'subtitles by',
    'thank you for watching.', '.', 'okay.',
  ]
  if (noise.includes(text.toLowerCase())) return ''

  return text
}

export function registerWhisper(): void {
  ipcMain.handle('whisper:availability', () => checkAvailability())
  ipcMain.handle('whisper:models-dir', () => modelsDirectory())

  ipcMain.handle(
    'whisper:transcribe',
    async (_event, payload: { wav: ArrayBuffer; model: string; prompt: string }) => {
      try {
        const result = await transcribe(payload.wav, {
          model: payload.model,
          prompt: payload.prompt,
        })
        return { ok: true as const, result }
      } catch (err) {
        return {
          ok: false as const,
          error: err instanceof Error ? err.message : String(err),
        }
      }
    },
  )
}
