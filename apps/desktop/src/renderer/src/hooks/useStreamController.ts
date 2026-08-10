import { useCallback, useEffect, useState } from 'react'
import { getCompositor } from './useCompositor'
import { getAudioMixer } from './useAudioMixer'
import { useAppStore } from '../stores/appStore'

// ─────────────────────────────────────────────────────────────────────────────
// useStreamController — going live.
//
// Chain: compositor canvas (video) + AudioMixer master bus (audio)
//        → MediaRecorder (WebM/VP8+Opus)
//        → IPC chunks → FFmpeg in the main process
//        → H.264/AAC → every enabled RTMP destination
//
// The renderer never touches the network. It produces frames; the main process
// owns the connection, so a renderer crash or reload cannot silently take the
// stream down without the encoder noticing.
// ─────────────────────────────────────────────────────────────────────────────

/** How often MediaRecorder hands us a chunk. */
const CHUNK_MS = 250

export type StreamState = 'idle' | 'starting' | 'live' | 'stopping' | 'error'

export interface StreamStats {
  frames: number
  fps: number
  bitrate: string
  time: string
  /** <1.0 means the encoder is losing ground against real time. */
  speed: number
  dropped: number
}

export interface StreamController {
  state: StreamState
  stats: StreamStats | null
  error: string | null
  /** False when streaming cannot start — the UI must disable Go Live. */
  encoderAvailable: boolean | null
  /**
   * Why streaming is unavailable, or null when it is available. Distinguishes
   * "you are in the browser preview" from "FFmpeg is not installed" — very
   * different problems with very different fixes.
   */
  unavailableReason: string | null
  start: () => Promise<void>
  stop: () => Promise<void>
}

let _recorder: MediaRecorder | null = null
let _captureStream: MediaStream | null = null

/** Pick the best container the runtime will actually give us. */
function chooseMimeType(): string | null {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ]
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type
  }
  return null
}

export function useStreamController(): StreamController {
  const [state, setState] = useState<StreamState>('idle')
  const [stats, setStats] = useState<StreamStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [encoderAvailable, setEncoderAvailable] = useState<boolean | null>(null)
  const [unavailableReason, setUnavailableReason] = useState<string | null>(null)

  const destinations = useAppStore(s => s.destinations)
  const setStreaming = useAppStore(s => s.setIsStreaming)

  // ── Probe for FFmpeg once ────────────────────────────────────────────────
  useEffect(() => {
    const api = window.glorycast?.encoder
    if (!api) {
      setEncoderAvailable(false)
      setUnavailableReason('Streaming requires the GloryCast desktop app.')
      return
    }
    void api.available()
      .then((ok) => {
        setEncoderAvailable(ok)
        setUnavailableReason(ok
          ? null
          : 'FFmpeg was not found. Install it and add it to your PATH to stream or record.')
      })
      .catch(() => {
        setEncoderAvailable(false)
        setUnavailableReason('Could not reach the encoder process.')
      })
  }, [])

  // ── Subscribe to encoder events ──────────────────────────────────────────
  useEffect(() => {
    const api = window.glorycast
    if (!api) return

    const onStats = (payload: unknown) => setStats(payload as StreamStats)
    const onState = (payload: unknown) => {
      const next = payload as StreamState
      setState(next)
      setStreaming(next === 'live')
    }
    const onError = (payload: unknown) => {
      setError(String(payload))
      setState('error')
      setStreaming(false)
      stopRecorder()
    }

    api.on('encoder:stats', onStats)
    api.on('encoder:state', onState)
    api.on('encoder:error', onError)

    return () => {
      api.off('encoder:stats', onStats)
      api.off('encoder:state', onState)
      api.off('encoder:error', onError)
    }
  }, [setStreaming])

  const start = useCallback(async () => {
    const api = window.glorycast?.encoder
    if (!api) {
      setError('Streaming is only available in the desktop app.')
      setState('error')
      return
    }

    const compositor = getCompositor()
    if (!compositor) {
      setError('The compositor is not running, so there is no program output to stream.')
      setState('error')
      return
    }

    const enabled = destinations.filter(d => d.enabled)
    if (enabled.length === 0) {
      setError('No stream destinations are enabled. Add one in Settings → Streaming.')
      setState('error')
      return
    }

    // Refuse to start rather than connect to a URL with a missing key: FFmpeg
    // would fail seconds later, mid-service, with an opaque error.
    const unconfigured = enabled.filter(d => !d.rtmpUrl.trim() || !d.streamKey.trim())
    if (unconfigured.length > 0) {
      setError(
        `Missing stream key for ${unconfigured.map(d => d.name).join(', ')}. ` +
        'Add it in Settings → Streaming.',
      )
      setState('error')
      return
    }

    // Licence gate. Deliberately checked only when STARTING: an expired
    // licence must never interrupt a broadcast already on air. A church
    // mid-service is the worst possible moment to enforce billing.
    const licence = await window.glorycast?.licence?.status().catch(() => null)
    if (licence?.blockNewBroadcast) {
      setError(licence.message)
      setState('error')
      return
    }

    const mimeType = chooseMimeType()
    if (!mimeType) {
      setError('This build has no WebM encoder available for capture.')
      setState('error')
      return
    }

    setError(null)
    setState('starting')

    try {
      // An AudioContext created before any user gesture starts suspended, and
      // a suspended context emits silence — a stream that looks fine and has
      // no sound. Resuming here, inside the click handler, is the fix.
      const mixer = getAudioMixer()
      await mixer?.resume()

      // Combine composited video with the mixed audio bus.
      const capture = compositor.captureProgramStream()
      const audioTrack = mixer?.outputTrack
      if (audioTrack) capture.addTrack(audioTrack)
      _captureStream = capture

      const started = await api.start({
        destinations: enabled.map(d => ({
          id: d.id,
          name: d.name,
          // Join base URL and key, tolerating a missing or doubled slash.
          url: `${d.rtmpUrl.replace(/\/+$/, '')}/${d.streamKey.replace(/^\/+/, '')}`,
        })),
        width: compositor.config.width,
        height: compositor.config.height,
        fps: compositor.config.fps,
        videoBitrate: 6000,
        audioBitrate: 160,
        preset: 'veryfast',
      })

      if (!started.ok) {
        setError(started.error)
        setState('error')
        cleanupCapture()
        return
      }

      const recorder = new MediaRecorder(capture, {
        mimeType,
        videoBitsPerSecond: 6_000_000,
        audioBitsPerSecond: 160_000,
      })
      _recorder = recorder

      recorder.ondataavailable = async (event) => {
        if (event.data.size === 0) return
        const buffer = await event.data.arrayBuffer()
        api.chunk(buffer)
      }

      recorder.onerror = () => {
        setError('Capture failed while recording the program output.')
        setState('error')
      }

      recorder.start(CHUNK_MS)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setState('error')
      cleanupCapture()
    }
  }, [destinations])

  const stop = useCallback(async () => {
    setState('stopping')
    stopRecorder()
    // Give the recorder a moment to flush its final chunk before FFmpeg's
    // stdin closes, so the recording gets a valid trailer.
    await new Promise(resolve => setTimeout(resolve, CHUNK_MS * 2))
    await window.glorycast?.encoder?.stop()
    cleanupCapture()
    setStats(null)
    setState('idle')
    setStreaming(false)
  }, [setStreaming])

  return { state, stats, error, encoderAvailable, unavailableReason, start, stop }
}

function stopRecorder(): void {
  if (_recorder && _recorder.state !== 'inactive') {
    try { _recorder.stop() } catch { /* already stopped */ }
  }
  _recorder = null
}

function cleanupCapture(): void {
  // Only stop the video track we created; the audio track belongs to the
  // mixer and must keep running for the next stream.
  for (const track of _captureStream?.getVideoTracks() ?? []) {
    track.stop()
  }
  _captureStream = null
}
