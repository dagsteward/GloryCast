import { useEffect, useRef, useState } from 'react'
import {
  VoiceActivityDetector,
  buildScripturePrompt,
  downsample,
  encodeWav,
  normalizeSpokenReferences,
  WHISPER_SAMPLE_RATE,
  type AsrEngineId,
  type AsrStatus,
} from '@glorycast/ai-core'

// ─────────────────────────────────────────────────────────────────────────────
// useSpeechEngine — turns service audio into text.
//
// Prefers local Whisper. Falls back to the browser's Web Speech API only when
// Whisper is unavailable, and reports which is running so the UI can be honest
// about it: the fallback needs the internet, sends audio to a third party, and
// can only hear the default microphone.
//
// Audio comes from an explicitly selected input, not whatever the OS considers
// default. In a real church the preacher is on a lapel mic going into a desk,
// and the desk feed is the only source worth transcribing.
// ─────────────────────────────────────────────────────────────────────────────

/** Frame size fed to the VAD. ~64ms at 16k — responsive without thrashing. */
const FRAME_SIZE = 1024

export interface SpeechEngineOptions {
  enabled: boolean
  /** deviceId of the audio input to listen to. Empty = system default. */
  deviceId?: string
  model: string
  onTranscript: (text: string, engine: AsrEngineId) => void
}

export function useSpeechEngine({
  enabled, deviceId, model, onTranscript,
}: SpeechEngineOptions): AsrStatus {
  const [status, setStatus] = useState<AsrStatus>({
    engine: 'none', listening: false, speaking: false, ready: false,
  })

  // Held in refs so the capture graph is never rebuilt by a re-render.
  const onTranscriptRef = useRef(onTranscript)
  onTranscriptRef.current = onTranscript

  const contextRef  = useRef<AudioContext | null>(null)
  const streamRef   = useRef<MediaStream | null>(null)
  const vadRef      = useRef<VoiceActivityDetector | null>(null)
  const recentRef   = useRef('')
  /** Serialises transcription so a slow model cannot pile up requests. */
  const busyRef     = useRef(false)
  const queueRef    = useRef<ArrayBuffer[]>([])

  useEffect(() => {
    if (!enabled) {
      setStatus(s => ({ ...s, listening: false, speaking: false }))
      return
    }

    let cancelled = false
    let cleanup: (() => void) | undefined

    const run = async () => {
      const availability = await window.glorycast?.whisper?.availability().catch(() => null)
      const whisperReady = Boolean(availability?.ready)

      if (cancelled) return

      if (whisperReady) {
        cleanup = await startWhisper(availability?.detail ?? '')
      } else {
        cleanup = startWebSpeech(availability?.detail)
      }
    }

    // ── Local Whisper path ────────────────────────────────────────────────
    const startWhisper = async (detail: string): Promise<(() => void) | undefined> => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: deviceId ? { exact: deviceId } : undefined,
            // Leave the desk feed alone. Browser speech processing is tuned
            // for a laptop mic in a meeting; on a board feed it pumps and
            // gates exactly where a preacher pauses for effect.
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        })
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop())
          return
        }

        streamRef.current = stream
        const context = new AudioContext()
        contextRef.current = context

        const source = context.createMediaStreamSource(stream)
        const processor = context.createScriptProcessor(FRAME_SIZE, 1, 1)

        const vad = new VoiceActivityDetector({ sampleRate: WHISPER_SAMPLE_RATE })
        vadRef.current = vad

        processor.onaudioprocess = (event) => {
          const input = event.inputBuffer.getChannelData(0)
          const frame = downsample(new Float32Array(input), context.sampleRate)

          const utterance = vad.push(frame, Date.now())
          setStatus(s => (s.speaking === vad.isSpeaking ? s : { ...s, speaking: vad.isSpeaking }))

          if (utterance) {
            queueRef.current.push(encodeWav(utterance.samples, utterance.sampleRate))
            void drainQueue()
          }
        }

        source.connect(processor)
        // A ScriptProcessor only runs while connected to a destination. Routing
        // it through a muted gain keeps it alive without the capture being
        // audible in the room.
        const silent = context.createGain()
        silent.gain.value = 0
        processor.connect(silent)
        silent.connect(context.destination)

        setStatus({ engine: 'whisper', listening: true, speaking: false, ready: true, detail })

        return () => {
          processor.onaudioprocess = null
          try { source.disconnect() } catch { /* torn down */ }
          try { processor.disconnect() } catch { /* torn down */ }
          try { silent.disconnect() } catch { /* torn down */ }
          stream.getTracks().forEach(t => t.stop())
          void context.close().catch(() => {})
          vad.reset()
        }
      } catch (err) {
        setStatus({
          engine: 'none', listening: false, speaking: false, ready: false,
          detail: err instanceof Error ? err.message : 'Could not open the audio input.',
        })
        return undefined
      }
    }

    const drainQueue = async () => {
      if (busyRef.current) return
      busyRef.current = true

      try {
        while (queueRef.current.length > 0) {
          // Under sustained load, keep only the newest pending utterance.
          // Falling behind and projecting a verse from a minute ago is worse
          // than skipping one.
          const wav = queueRef.current.pop() as ArrayBuffer
          queueRef.current.length = 0

          const response = await window.glorycast?.whisper?.transcribe({
            wav,
            model,
            prompt: buildScripturePrompt(recentRef.current),
          })

          if (!response?.ok || !response.result) continue

          const text = normalizeSpokenReferences(response.result.text)
          if (!text) continue

          recentRef.current = `${recentRef.current} ${text}`.slice(-400)
          onTranscriptRef.current(text, 'whisper')
        }
      } finally {
        busyRef.current = false
      }
    }

    // ── Fallback: browser speech recognition ──────────────────────────────
    const startWebSpeech = (detail?: string): (() => void) | undefined => {
      const SR = (window as unknown as Record<string, unknown>).SpeechRecognition
        ?? (window as unknown as Record<string, unknown>).webkitSpeechRecognition

      if (!SR) {
        setStatus({
          engine: 'none', listening: false, speaking: false, ready: false,
          detail: detail ?? 'No speech recognition engine is available.',
        })
        return undefined
      }

      const recognition = new (SR as new () => any)()
      recognition.continuous = true
      recognition.interimResults = false
      recognition.lang = 'en-US'

      let active = true

      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (!event.results[i].isFinal) continue
          const raw = event.results[i][0].transcript as string
          const text = normalizeSpokenReferences(raw)
          if (text) onTranscriptRef.current(text, 'web-speech')
        }
      }
      recognition.onend = () => { if (active) { try { recognition.start() } catch { /* restarting */ } } }
      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          active = false
          setStatus({
            engine: 'none', listening: false, speaking: false, ready: false,
            detail: 'Microphone permission denied.',
          })
        }
      }

      try { recognition.start() } catch { /* already started */ }

      setStatus({
        engine: 'web-speech', listening: true, speaking: false, ready: false,
        detail: detail
          ?? 'Using online recognition. Audio is sent to the browser vendor and the default microphone is used.',
      })

      return () => {
        active = false
        try { recognition.stop() } catch { /* already stopped */ }
      }
    }

    void run()

    return () => {
      cancelled = true
      cleanup?.()
      queueRef.current = []
      recentRef.current = ''
      streamRef.current = null
      contextRef.current = null
      vadRef.current = null
    }
  }, [enabled, deviceId, model])

  return status
}
