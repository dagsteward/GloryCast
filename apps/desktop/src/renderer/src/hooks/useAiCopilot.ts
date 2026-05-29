import { useEffect, useRef } from 'react'
import { useServiceStore } from '../stores/serviceStore'
import { useAppStore } from '../stores/appStore'
import {
  detectScripture,
  detectSongs,
  fetchVerseText,
  buildSongIndex,
  type SongLine,
} from '../lib/aiDetect'

// ─────────────────────────────────────────────────────────────────────────────
// useAiCopilot — the always-listening engine.
//
// Mount this exactly ONCE near the app root. While a service is active and the
// AI is listening, it runs Web Speech recognition, detects scripture refs and
// song lyrics from the same transcript, and pushes them into serviceStore.
// Every page then reads serviceStore — no page runs its own recognition.
// ─────────────────────────────────────────────────────────────────────────────

export function useAiCopilot() {
  const aiListening  = useServiceStore(s => s.aiListening)
  const setTranscript = useServiceStore(s => s.setTranscript)
  const addDetection  = useServiceStore(s => s.addDetection)
  const setAiListening = useServiceStore(s => s.setAiListening)
  const songLibrary   = useAppStore(s => s.songLibrary)

  // Rebuilt whenever the library changes; read via ref inside the recognizer.
  const songIndexRef = useRef<SongLine[]>([])
  useEffect(() => {
    songIndexRef.current = buildSongIndex(songLibrary)
  }, [songLibrary])

  const recognitionRef    = useRef<any>(null)
  const finalTranscriptRef = useRef('')
  const seenScriptureRef  = useRef<Set<string>>(new Set())
  const seenSongRef       = useRef<Set<string>>(new Set())
  const activeRef         = useRef(false)

  useEffect(() => {
    if (!aiListening) {
      // Stop any running recognizer.
      activeRef.current = false
      try { recognitionRef.current?.stop() } catch { /* ignore */ }
      recognitionRef.current = null
      return
    }

    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
    if (!SR) {
      // Graceful: no engine here (e.g. plain browser preview). Leave a hint.
      setTranscript('Speech recognition unavailable in this environment.')
      return
    }

    activeRef.current = true
    const recognition: any = new SR()
    recognitionRef.current = recognition
    recognition.continuous     = true
    recognition.interimResults = true
    recognition.lang           = 'en-US'
    recognition.maxAlternatives = 1

    recognition.onend = () => {
      if (activeRef.current) {
        try { recognition.start() } catch { /* already starting */ }
      }
    }
    recognition.onerror = (e: any) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        activeRef.current = false
        setAiListening(false)
        setTranscript('Microphone permission denied.')
      }
    }

    recognition.onresult = (e: any) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) finalTranscriptRef.current += ' ' + t
        else interim += t
      }
      const windowText = (finalTranscriptRef.current + ' ' + interim).slice(-600).trim()
      setTranscript(windowText)

      // ── Scripture ──
      const scriptureHits = detectScripture(windowText, seenScriptureRef.current)
      for (const hit of scriptureHits) {
        void (async () => {
          const text = await fetchVerseText(hit.book, hit.chapter, hit.verse)
          addDetection({
            kind:       'scripture',
            reference:  hit.reference,
            text:       text || '(verse text unavailable — open Bible page)',
            subtitle:   'NIV',
            confidence: hit.confidence,
          })
        })()
      }

      // ── Songs ──
      const songHits = detectSongs(windowText, songIndexRef.current, seenSongRef.current)
      for (const s of songHits) {
        addDetection({
          kind:       'song',
          reference:  s.songTitle,
          text:       s.line,
          subtitle:   s.partLabel,
          confidence: s.confidence,
        })
      }
    }

    try { recognition.start() } catch { /* ignore */ }

    return () => {
      activeRef.current = false
      try { recognition.stop() } catch { /* ignore */ }
      recognitionRef.current = null
    }
  }, [aiListening, setTranscript, addDetection, setAiListening])

  // Reset the de-dup windows when listening restarts fresh.
  useEffect(() => {
    if (!aiListening) {
      seenScriptureRef.current = new Set()
      seenSongRef.current = new Set()
      finalTranscriptRef.current = ''
    }
  }, [aiListening])
}
