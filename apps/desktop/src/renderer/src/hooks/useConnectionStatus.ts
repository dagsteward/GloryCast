import { useEffect } from 'react'
import { useAppStore } from '../stores/appStore'

// ─────────────────────────────────────────────────────────────────────────────
// useConnectionStatus — keeps appStore.connectionStatus tied to reality.
//
// `connectionStatus` existed in the store with a setter that no code ever
// called, so it sat on its 'disconnected' default forever and the status bar
// reported "Offline" permanently, on every machine, regardless of the actual
// network. Mount this once (MainLayout) to make the indicator mean something.
//
// navigator.onLine is authoritative for the negative case only: false really
// does mean no usable interface. True merely means an interface exists, which
// is why the UI says "Online" rather than claiming a link quality we have not
// measured.
// ─────────────────────────────────────────────────────────────────────────────

export function useConnectionStatus(): void {
  const setConnectionStatus = useAppStore(s => s.setConnectionStatus)

  useEffect(() => {
    const sync = () => setConnectionStatus(navigator.onLine ? 'connected' : 'disconnected')

    sync()
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    return () => {
      window.removeEventListener('online', sync)
      window.removeEventListener('offline', sync)
    }
  }, [setConnectionStatus])
}
