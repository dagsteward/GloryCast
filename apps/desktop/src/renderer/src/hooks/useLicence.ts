import { useCallback, useEffect, useState } from 'react'
import { TRIAL_DAYS, type Entitlement } from '@glorycast/licensing'

// ─────────────────────────────────────────────────────────────────────────────
// useLicence — entitlement state for the UI.
//
// The main process owns validation; this only reflects it. Status is polled
// rarely (entitlement changes on the scale of days) and re-checked on window
// focus so an activation done on the website is picked up without a restart.
// ─────────────────────────────────────────────────────────────────────────────

/** Optimistic default so the UI never flashes a scary state while loading. */
const LOADING: Entitlement = {
  state: 'trial',
  active: true,
  daysRemaining: TRIAL_DAYS,
  message: '',
  license: null,
  watermark: false,
  blockNewBroadcast: false,
}

export interface LicenceController {
  entitlement: Entitlement
  loading: boolean
  /** Null outside the desktop app. */
  deviceId: string | null
  activate: (key: string) => Promise<{ ok: boolean; error?: string }>
  deactivate: () => Promise<void>
  refresh: () => Promise<void>
}

export function useLicence(): LicenceController {
  const [entitlement, setEntitlement] = useState<Entitlement>(LOADING)
  const [loading, setLoading] = useState(true)
  const [deviceId, setDeviceId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const api = window.glorycast?.licence
    if (!api) {
      // Browser dev preview: there is no installation to licence, so treat it
      // as unrestricted rather than showing a trial countdown that means
      // nothing.
      setEntitlement({ ...LOADING, message: '' })
      setLoading(false)
      return
    }
    try {
      const status = await api.status()
      setEntitlement(status)
    } catch {
      // Keep the last known state rather than locking the operator out
      // because an IPC call failed.
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    void window.glorycast?.licence?.deviceId().then(setDeviceId).catch(() => {})

    // Entitlement moves on the scale of days; hourly is ample.
    const interval = setInterval(() => { void refresh() }, 60 * 60 * 1000)
    const onFocus = () => { void refresh() }
    window.addEventListener('focus', onFocus)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [refresh])

  const activate = useCallback(async (key: string) => {
    const api = window.glorycast?.licence
    if (!api) return { ok: false, error: 'Activation is only available in the desktop app.' }

    const result = await api.activate(key)
    if (result.ok) {
      setEntitlement(result.entitlement)
      return { ok: true }
    }
    return { ok: false, error: result.error }
  }, [])

  const deactivate = useCallback(async () => {
    const result = await window.glorycast?.licence?.deactivate()
    if (result?.ok) setEntitlement(result.entitlement)
  }, [])

  return { entitlement, loading, deviceId, activate, deactivate, refresh }
}
