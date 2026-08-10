import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { KeyRound, X, Check, Loader2, ExternalLink, Monitor } from 'lucide-react'
import { formatKey, TRIAL_DAYS } from '@glorycast/licensing'
import { useLicence } from '../../hooks/useLicence'
import { cn } from '../../lib/utils'

const PURCHASE_URL = 'https://glorycast.ai/pricing'

/**
 * Licence activation and management.
 *
 * Rendered through a portal: the shell uses Framer Motion transforms, and a
 * fixed-position overlay inside a transformed ancestor is positioned against
 * that ancestor rather than the viewport, which collapses the backdrop.
 */
export function LicenceDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { entitlement, deviceId, activate, deactivate } = useLicence()
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!open) { setError(null); setDone(false); setKey('') }
  }, [open])

  // Escape closes, as with any modal.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const submit = async () => {
    if (!key.trim() || busy) return
    setBusy(true)
    setError(null)

    const result = await activate(key)
    setBusy(false)

    if (result.ok) {
      setDone(true)
      setTimeout(onClose, 1400)
    } else {
      setError(result.error ?? 'Activation failed.')
    }
  }

  const licence = entitlement.license

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6"
        >
          <motion.div
            initial={{ scale: 0.96, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 8 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-chrome border border-white/10 shadow-2xl overflow-hidden"
          >
            <header className="flex items-center gap-2.5 px-5 h-12 border-b border-white/[0.07]">
              <KeyRound size={15} className="text-purple-400" />
              <h2 className="flex-1 text-[13.5px] font-semibold text-white/90">
                {licence ? 'Licence' : 'Activate GloryCast'}
              </h2>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.07]"
              >
                <X size={14} />
              </button>
            </header>

            <div className="p-5">
              {licence ? (
                <div className="space-y-3">
                  <Row label="Organisation" value={licence.organisation} />
                  <Row label="Email" value={licence.email} />
                  <Row label="Licence key" value={formatKey(licence.key)} mono />
                  <Row
                    label="Renews"
                    value={new Date(licence.expiresAt).toLocaleDateString(undefined, {
                      year: 'numeric', month: 'long', day: 'numeric',
                    })}
                  />
                  <Row
                    label="Seats"
                    value={`${licence.devices.length} of ${licence.seats} in use`}
                  />

                  <p className={cn(
                    'text-[11.5px] leading-relaxed pt-1',
                    entitlement.active ? 'text-white/45' : 'text-red-400/90',
                  )}>
                    {entitlement.message}
                  </p>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => window.glorycast?.shell.openExternal(PURCHASE_URL)}
                      className="flex-1 h-9 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[12px] font-semibold flex items-center justify-center gap-1.5"
                    >
                      Manage subscription <ExternalLink size={12} />
                    </button>
                    <button
                      onClick={() => void deactivate()}
                      title="Release this machine's seat so the licence can be used elsewhere"
                      className="h-9 px-3 rounded-lg border border-white/12 text-white/60 hover:text-white hover:bg-white/[0.06] text-[12px] font-medium"
                    >
                      Deactivate
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-[12px] leading-relaxed text-white/55">
                    {entitlement.state === 'trial'
                      ? `You are on the ${TRIAL_DAYS}-day free trial with every feature unlocked. ` +
                        'Enter a licence key to activate permanently.'
                      : entitlement.message}
                  </p>

                  <div>
                    <label className="block text-[10.5px] text-white/40 mb-1">Licence key</label>
                    <input
                      autoFocus
                      value={key}
                      onChange={e => setKey(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && void submit()}
                      placeholder="GCXXX-XXXXX-XXXXX-XXXXX"
                      spellCheck={false}
                      autoComplete="off"
                      className="w-full h-10 px-3 rounded-lg bg-white/[0.05] border border-white/[0.1] text-[13px] font-mono tracking-wider text-white/85 outline-none focus:border-purple-500/60"
                    />
                  </div>

                  {error && (
                    <p className="text-[11.5px] leading-relaxed text-red-400/90">{error}</p>
                  )}

                  <button
                    onClick={() => void submit()}
                    disabled={!key.trim() || busy || done}
                    className={cn(
                      'w-full h-10 rounded-lg text-[12.5px] font-semibold flex items-center justify-center gap-2 transition-colors',
                      done ? 'bg-emerald-600 text-white'
                        : !key.trim() || busy
                          ? 'bg-white/[0.06] text-white/25 cursor-not-allowed'
                          : 'bg-purple-600 hover:bg-purple-500 text-white',
                    )}
                  >
                    {done ? <><Check size={14} /> Activated</>
                      : busy ? <><Loader2 size={14} className="animate-spin" /> Activating…</>
                      : 'Activate'}
                  </button>

                  <button
                    onClick={() => window.glorycast?.shell.openExternal(PURCHASE_URL)}
                    className="w-full text-[11.5px] text-purple-400 hover:text-purple-300 inline-flex items-center justify-center gap-1"
                  >
                    Buy a licence <ExternalLink size={11} />
                  </button>
                </div>
              )}

              {deviceId && (
                <p className="mt-4 pt-3 border-t border-white/[0.06] text-[10px] text-white/25 flex items-center gap-1.5">
                  <Monitor size={10} />
                  This machine: <span className="font-mono">{deviceId.slice(0, 12)}</span>
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-[11px] text-white/35 shrink-0">{label}</span>
      <span className={cn('text-[12px] text-white/80 truncate', mono && 'font-mono')}>
        {value}
      </span>
    </div>
  )
}
