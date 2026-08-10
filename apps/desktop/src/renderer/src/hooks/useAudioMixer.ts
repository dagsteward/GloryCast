import { useEffect, useRef, useState } from 'react'
import { AudioMixer, type ChannelLevels, type ChannelState } from '@glorycast/media-engine'
import { useMediaEngine, getStream } from './useMediaEngine'

// ─────────────────────────────────────────────────────────────────────────────
// useAudioMixer — binds the Web Audio mixer to the app's live sources.
//
// Module-level singleton for the same reason as the compositor: an AudioContext
// is an expensive, limited resource, and the mix must survive route changes. A
// service should never lose its audio because someone clicked Settings.
// ─────────────────────────────────────────────────────────────────────────────

let _mixer: AudioMixer | null = null

export function getAudioMixer(): AudioMixer | null {
  if (_mixer) return _mixer
  try {
    _mixer = new AudioMixer()
  } catch (err) {
    console.error('[AudioMixer] unavailable:', err)
    _mixer = null
  }
  return _mixer
}

/**
 * Keep a mixer channel for every source that carries audio.
 *
 * Returns the channel list and a levels map that updates on an animation
 * frame. Levels deliberately bypass React state per frame — metering at 60Hz
 * through a store would re-render the page continuously.
 */
export function useAudioMixer() {
  const sources = useMediaEngine(s => s.sources)
  const [channels, setChannels] = useState<ChannelState[]>([])
  const levelsRef = useRef<Record<string, ChannelLevels>>({})
  const masterRef = useRef<ChannelLevels | null>(null)

  // ── Sync channels with sources ───────────────────────────────────────────
  useEffect(() => {
    const mixer = getAudioMixer()
    if (!mixer) return

    const seen = new Set<string>()

    for (const source of sources) {
      const stream = getStream(source.id)
      if (!stream || stream.getAudioTracks().length === 0) continue

      seen.add(source.id)
      if (!mixer.hasChannel(source.id)) {
        mixer.addChannel(source.id, source.label, stream)
      }
    }

    for (const channel of mixer.getChannels()) {
      if (!seen.has(channel.id)) mixer.removeChannel(channel.id)
    }

    setChannels(mixer.getChannels())
  }, [sources])

  // ── Metering loop ────────────────────────────────────────────────────────
  useEffect(() => {
    const mixer = getAudioMixer()
    if (!mixer) return

    let raf = 0
    const tick = () => {
      levelsRef.current = mixer.readLevels()
      masterRef.current = mixer.readMasterLevels()
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const mixer = getAudioMixer()

  return {
    channels,
    /** Read the latest levels. Call inside your own render/animation loop. */
    getLevels: () => levelsRef.current,
    getMasterLevels: () => masterRef.current,

    setGain: (id: string, gain: number) => {
      mixer?.setGain(id, gain)
      if (mixer) setChannels(mixer.getChannels())
    },
    setMuted: (id: string, muted: boolean) => {
      mixer?.setMuted(id, muted)
      if (mixer) setChannels(mixer.getChannels())
    },
    setSoloed: (id: string, soloed: boolean) => {
      mixer?.setSoloed(id, soloed)
      if (mixer) setChannels(mixer.getChannels())
    },
    setMasterGain: (gain: number) => mixer?.setMasterGain(gain),
    masterGain: mixer?.masterGain ?? 1,
    resetClips: () => mixer?.resetClipIndicators(),
  }
}
