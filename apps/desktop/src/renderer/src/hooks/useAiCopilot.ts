import { useCallback, useEffect, useRef } from 'react'
import type { AsrEngineId, AsrStatus } from '@glorycast/ai-core'
import { useServiceStore } from '../stores/serviceStore'
import { useAppStore } from '../stores/appStore'
import { useSpeechEngine } from './useSpeechEngine'
import {
  detectScripture,
  detectScriptureQuotes,
  detectSongs,
  resolveVerse,
  buildSongIndex,
  type SongLine,
} from '../lib/aiDetect'

// ─────────────────────────────────────────────────────────────────────────────
// useAiCopilot — the always-listening engine.
//
// Mount exactly ONCE near the app root. Speech comes from useSpeechEngine
// (local Whisper, falling back to browser recognition); this layer turns that
// text into scripture and song detections and pushes them into serviceStore.
//
// The detection logic is unchanged and deliberately so — it was already the
// strongest part of the app. What changed underneath is where the words come
// from: a local model listening to a chosen input, rather than a cloud service
// listening to the default microphone.
// ─────────────────────────────────────────────────────────────────────────────

const COPILOT_TRANSLATION = 'NIV'

export function useAiCopilot(): AsrStatus {
  const aiListening   = useServiceStore(s => s.aiListening)
  const setTranscript = useServiceStore(s => s.setTranscript)
  const addDetection  = useServiceStore(s => s.addDetection)
  const songLibrary   = useAppStore(s => s.songLibrary)
  const asrDeviceId   = useAppStore(s => s.asrDeviceId)
  const asrModel      = useAppStore(s => s.asrModel)

  const songIndexRef = useRef<SongLine[]>([])
  useEffect(() => {
    songIndexRef.current = buildSongIndex(songLibrary)
  }, [songLibrary])

  // Rolling window of what has been said, plus de-dup sets so the same verse
  // is not announced twice as the window slides over it.
  const windowRef        = useRef('')
  const seenScriptureRef = useRef<Set<string>>(new Set())
  const seenQuoteRef     = useRef<Set<string>>(new Set())
  const seenSongRef      = useRef<Set<string>>(new Set())
  const quoteBusyRef     = useRef(false)
  const lastQuoteScanRef = useRef(0)

  const handleTranscript = useCallback((text: string, _engine: AsrEngineId) => {
    windowRef.current = `${windowRef.current} ${text}`.trim().slice(-600)
    const windowText = windowRef.current
    setTranscript(windowText)

    // ── Explicit references ("Romans 8:28") ──
    for (const hit of detectScripture(windowText, seenScriptureRef.current)) {
      void (async () => {
        const { text: verseText, translation } = await resolveVerse(
          hit.book, hit.chapter, hit.verse, hit.endVerse, COPILOT_TRANSLATION,
        )
        addDetection({
          kind: 'scripture',
          reference: hit.reference,
          text: verseText || '(verse text unavailable — open Bible page)',
          subtitle: translation,
          confidence: hit.confidence,
        })
      })()
    }

    // ── Quoted or paraphrased scripture (no reference spoken) ──
    // The fuzzy whole-Bible scan is far heavier than the regex, so it is
    // throttled rather than run on every utterance.
    const now = Date.now()
    if (!quoteBusyRef.current && now - lastQuoteScanRef.current > 2000) {
      lastQuoteScanRef.current = now
      quoteBusyRef.current = true
      void (async () => {
        try {
          const quotes = await detectScriptureQuotes(windowText, seenQuoteRef.current)
          for (const q of quotes) {
            if (seenScriptureRef.current.has(q.reference)) continue
            seenScriptureRef.current.add(q.reference)
            addDetection({
              kind: 'scripture',
              reference: q.reference,
              text: q.text,
              subtitle: q.translation,
              confidence: q.confidence,
            })
          }
        } finally {
          quoteBusyRef.current = false
        }
      })()
    }

    // ── Songs ──
    for (const s of detectSongs(windowText, songIndexRef.current, seenSongRef.current)) {
      addDetection({
        kind: 'song',
        reference: s.songTitle,
        text: s.line,
        subtitle: s.partLabel,
        confidence: s.confidence,
      })
    }
  }, [addDetection, setTranscript])

  const status = useSpeechEngine({
    enabled: aiListening,
    deviceId: asrDeviceId,
    model: asrModel,
    onTranscript: handleTranscript,
  })

  // Clear the de-dup windows when listening stops, so restarting a service
  // does not silently suppress a verse that was used earlier.
  useEffect(() => {
    if (aiListening) return
    windowRef.current = ''
    seenScriptureRef.current = new Set()
    seenQuoteRef.current = new Set()
    seenSongRef.current = new Set()
  }, [aiListening])

  return status
}
