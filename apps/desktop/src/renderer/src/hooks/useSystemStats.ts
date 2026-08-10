import { useState, useEffect } from 'react'

/**
 * Live machine telemetry, polled from the Electron main process.
 *
 * These figures drive the status bar an operator watches during a service, so
 * they must be real. When the app runs outside Electron (browser dev preview)
 * there is no way to read them, and we report `available: false` rather than
 * inventing numbers — the UI shows a dash instead of a comforting lie.
 */
export interface SystemStats {
  /** Whole-app CPU usage, 0..100. */
  cpu: number
  /** GPU process usage, 0..100, or null when unreported. */
  gpu: number | null
  /** App resident memory, MB. */
  memoryUsedMb: number
  /** Installed physical RAM, MB. */
  memoryTotalMb: number
  /** Machine-wide memory pressure, 0..100. */
  memoryPercent: number
  /** False in the browser dev preview, where no main process exists. */
  available: boolean
}

const UNAVAILABLE: SystemStats = {
  cpu: 0,
  gpu: null,
  memoryUsedMb: 0,
  memoryTotalMb: 0,
  memoryPercent: 0,
  available: false,
}

const POLL_INTERVAL_MS = 2000

export function useSystemStats(): SystemStats {
  const [stats, setStats] = useState<SystemStats>(UNAVAILABLE)

  useEffect(() => {
    const api = window.glorycast?.system
    if (!api) return

    let cancelled = false

    const poll = async () => {
      try {
        const next = await api.stats()
        if (!cancelled) setStats({ ...next, available: true })
      } catch {
        // A failed poll is not worth tearing the UI down over — keep the last
        // known figures and try again on the next tick.
      }
    }

    void poll()
    const interval = setInterval(poll, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  return stats
}

/** Format a megabyte count the way the status bar shows it (e.g. "6.2 GB"). */
export function formatMemory(mb: number): string {
  if (mb <= 0) return '—'
  if (mb < 1024) return `${mb} MB`
  return `${(mb / 1024).toFixed(1)} GB`
}
