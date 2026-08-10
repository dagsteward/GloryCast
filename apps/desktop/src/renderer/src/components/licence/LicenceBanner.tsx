import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { KeyRound, X, ExternalLink } from 'lucide-react'
import { useLicence } from '../../hooks/useLicence'
import { LicenceDialog } from './LicenceDialog'
import { cn } from '../../lib/utils'

/**
 * Trial and licence status strip.
 *
 * Shown only when there is something the operator needs to know or do. During
 * a healthy licence it renders nothing at all — nobody should be nagged in the
 * middle of a service by software they have already paid for.
 */
export function LicenceBanner() {
  const { entitlement, loading } = useLicence()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  const { state, daysRemaining, message } = entitlement

  // Quiet states: nothing to say.
  const silent =
    loading ||
    state === 'licensed' && daysRemaining > 14 ||
    !message

  // A trial with plenty of time left is worth a gentle note, not a warning,
  // and it can be dismissed for the session.
  const gentle = state === 'trial' && daysRemaining > 7
  if (silent || (gentle && dismissed)) {
    return <LicenceDialogHost open={dialogOpen} onClose={() => setDialogOpen(false)} />
  }

  const severity =
    state === 'trial-expired' || state === 'expired' || state === 'invalid'
      ? 'blocking'
      : state === 'grace' || (state === 'trial' && daysRemaining <= 7) || state === 'licensed'
        ? 'warning'
        : 'info'

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className={cn(
            'shrink-0 overflow-hidden border-b',
            severity === 'blocking' ? 'bg-red-500/12 border-red-500/25'
              : severity === 'warning' ? 'bg-amber-500/10 border-amber-500/25'
              : 'bg-purple-500/10 border-purple-500/20',
          )}
        >
          <div className="flex items-center gap-3 px-4 h-9">
            <KeyRound
              size={13}
              className={
                severity === 'blocking' ? 'text-red-400'
                  : severity === 'warning' ? 'text-amber-400'
                  : 'text-purple-400'
              }
            />
            <span className="flex-1 text-[11.5px] text-white/80 truncate">{message}</span>

            <button
              onClick={() => setDialogOpen(true)}
              className={cn(
                'h-6 px-2.5 rounded-md text-[11px] font-semibold transition-colors',
                severity === 'blocking'
                  ? 'bg-red-600 text-white hover:bg-red-500'
                  : 'bg-white/10 text-white/85 hover:bg-white/15',
              )}
            >
              {entitlement.license ? 'Manage licence' : 'Activate licence'}
            </button>

            {gentle && (
              <button
                onClick={() => setDismissed(true)}
                className="w-5 h-5 rounded flex items-center justify-center text-white/35 hover:text-white/70"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      <LicenceDialogHost open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </>
  )
}

function LicenceDialogHost({ open, onClose }: { open: boolean; onClose: () => void }) {
  return <LicenceDialog open={open} onClose={onClose} />
}

/** Purchase link used by the dialog and the expired state. */
export const PURCHASE_URL = 'https://glorycast.ai/pricing'

export function BuyLink() {
  return (
    <button
      onClick={() => window.glorycast?.shell.openExternal(PURCHASE_URL)}
      className="inline-flex items-center gap-1 text-purple-400 hover:text-purple-300 font-medium"
    >
      View pricing <ExternalLink size={11} />
    </button>
  )
}
