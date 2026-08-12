import { spawn, spawnSync } from 'child_process'
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

  const onPath = resolveFromPath(binaryName())
  if (onPath) return onPath

  return null
}

/**
 * Look up a binary on the system PATH. Node has no built-in equivalent of
 * `which`/`where` — `spawnSync` with `shell: true` lets the OS's own shell
 * resolve it exactly as a user's terminal would, including on Windows where
 * PATHEXT resolution (`.exe`, `.cmd`, etc.) isn't otherwise straightforward.
 */
function resolveFromPath(name: string): string | null {
  try {
    const cmd = process.platform === 'win32' ? `where ${name}` : `command -v ${name}`
    const result = spawnSync(cmd, { shell: true, encoding: 'utf8' })
    const found = result.stdout?.split(/\r?\n/).map(l => l.trim()).find(Boolean)
    return found && existsSync(found) ? found : null
  } catch {
    return null
  }
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

// ─── Persistent server ───────────────────────────────────────────────────────
// whisper-cli loads the model from disk on every invocation. At ~142 MB for
// base.en that is one to three seconds of startup before a single word is
// transcribed — per utterance. Over a sermon that is the difference between
// scripture appearing while the verse is still being read and appearing after
// the preacher has moved on, and it is why slow utterances hit the timeout and
// vanished entirely.
//
// whisper-server loads the model once and stays resident, so each utterance
// costs only inference. We fall back to the CLI when the server binary is
// missing, so an older whisper.cpp build still works.

const SERVER_PORT = 8178
const SERVER_HOST = '127.0.0.1'

let _server: import('child_process').ChildProcess | null = null
let _serverModel: string | null = null
let _serverReady: Promise<boolean> | null = null

function serverBinary(): string | null {
  const cli = resolveBinary()
  if (!cli) return null
  const candidate = cli.replace(/whisper-cli(\.exe)?$/i, (_m, ext) => `whisper-server${ext ?? ''}`)
  return candidate !== cli && existsSync(candidate) ? candidate : null
}

export function shutdownWhisperServer(): void {
  if (_server && !_server.killed) {
    try { _server.kill() } catch { /* already gone */ }
  }
  _server = null
  _serverModel = null
  _serverReady = null
}

/** Start (or reuse) the server for `model`. Resolves false when unavailable. */
function ensureServer(model: string): Promise<boolean> {
  // A different model means the resident one is wrong — restart rather than
  // silently transcribing with whatever was loaded first.
  if (_server && _serverModel !== model) shutdownWhisperServer()
  if (_serverReady) return _serverReady

  const binary = serverBinary()
  const modelFile = modelPath(model)
  if (!binary || !existsSync(modelFile)) return Promise.resolve(false)

  _serverReady = new Promise<boolean>((resolve) => {
    try {
      _server = spawn(binary, [
        '-m', modelFile,
        '--host', SERVER_HOST,
        '--port', String(SERVER_PORT),
        '-t', String(Math.max(1, Math.floor((navigatorHardware() || 4) / 2))),
      ], { stdio: ['ignore', 'pipe', 'pipe'] })
      _serverModel = model

      _server.on('error', () => { shutdownWhisperServer(); resolve(false) })
      _server.on('exit', () => { _server = null; _serverModel = null; _serverReady = null })

      // Poll until it answers rather than guessing a fixed delay — model load
      // time varies hugely between base.en and a large model.
      const deadline = Date.now() + 60_000
      const probe = async () => {
        if (Date.now() > deadline) { shutdownWhisperServer(); resolve(false); return }
        try {
          const res = await fetch(`http://${SERVER_HOST}:${SERVER_PORT}/`, { method: 'GET' })
          if (res.status < 500) { resolve(true); return }
        } catch { /* not up yet */ }
        setTimeout(probe, 400)
      }
      setTimeout(probe, 400)
    } catch {
      shutdownWhisperServer()
      resolve(false)
    }
  })

  return _serverReady
}

/** Transcribe via the resident server. Returns null when it cannot be used. */
async function transcribeViaServer(
  wav: ArrayBuffer, options: WhisperOptions,
): Promise<WhisperResult | null> {
  if (!(await ensureServer(options.model))) return null

  const started = Date.now()
  try {
    const form = new FormData()
    form.append('file', new Blob([wav], { type: 'audio/wav' }), 'audio.wav')
    form.append('response_format', 'json')
    form.append('language', 'en')
    form.append('temperature', '0')
    if (options.prompt) form.append('prompt', options.prompt)

    const res = await fetch(`http://${SERVER_HOST}:${SERVER_PORT}/inference`, {
      method: 'POST',
      body: form,
    })
    if (!res.ok) return null

    const json: any = await res.json()
    const cleaned = cleanTranscript(String(json?.text ?? ''))
    if (!cleaned) return null

    return { text: cleaned, elapsedSec: (Date.now() - started) / 1000 }
  } catch {
    return null
  }
}

/** Transcribe one WAV buffer. Resolves to null when nothing intelligible. */
async function transcribe(wav: ArrayBuffer, options: WhisperOptions): Promise<WhisperResult | null> {
  const availability = checkAvailability()
  if (!availability.ready || !availability.binary) return null

  const model = modelPath(options.model)
  if (!existsSync(model)) return null

  // Resident server first — no model reload, so this is the fast path. Falls
  // through to the CLI when whisper-server is absent or failed to start.
  const viaServer = await transcribeViaServer(wav, options)
  if (viaServer) return viaServer

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
        // whisper.cpp defaults to beam search (width 5) with temperature
        // fallback, which is noticeably slower on CPU than greedy decoding.
        // This is live scripture detection, not a transcript for the record —
        // matches go through fuzzy/regex lookup afterward, so exact wording
        // barely matters and latency matters a lot.
        '--beam-size', '1', '--best-of', '1',
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
