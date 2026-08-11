import { Mic, MicOff, Cloud, ShieldCheck } from 'lucide-react'
import { useServiceStore } from '../../stores/serviceStore'
import { cn } from '../../lib/utils'

// ─────────────────────────────────────────────────────────────────────────────
// AsrEngineBadge — honest, shared status for the signature feature.
//
// GloryCast's differentiator is that scripture detection runs locally and
// privately on-device (Whisper), not that it merely "listens". The three
// workspaces previously showed only a bare on/off dot with no indication of
// WHICH engine — an operator running the degraded cloud fallback had no way
// to know, and one running Whisper had no way to see the thing that makes
// this product different from a generic "AI assistant" toggle.
// ─────────────────────────────────────────────────────────────────────────────

export type BadgeSize = 'sm' | 'md'

export function AsrEngineBadge({ size = 'md', accent = 'purple' }: {
  size?: BadgeSize
  /** Tailwind-ish accent family; each workspace has its own signature colour. */
  accent?: 'purple' | 'teal'
}) {
  const aiListening = useServiceStore(s => s.aiListening)
  const engine = useServiceStore(s => s.asrEngine)
  const ready = useServiceStore(s => s.asrReady)
  const detail = useServiceStore(s => s.asrDetail)

  const on = accent === 'teal'
    ? { text: 'text-teal-300', bg: 'bg-teal-500/15', dot: 'bg-teal-400' }
    : { text: 'text-purple-300', bg: 'bg-purple-600/20', dot: 'bg-purple-400' }

  if (!aiListening) {
    return (
      <span
        title="Voice detection is off"
        className={cn(
          'inline-flex items-center gap-1 rounded-full font-semibold text-white/45 bg-white/[0.06]',
          size === 'sm' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-1 text-[10.5px]',
        )}
      >
        <MicOff size={size === 'sm' ? 9 : 11} /> Off
      </span>
    )
  }

  if (engine === 'whisper' && ready) {
    return (
      <span
        title="Scripture detection is running locally on this machine — no audio leaves it."
        className={cn(
          'inline-flex items-center gap-1 rounded-full font-semibold animate-pulse',
          on.text, on.bg,
          size === 'sm' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-1 text-[10.5px]',
        )}
      >
        <ShieldCheck size={size === 'sm' ? 9 : 11} /> Local AI
      </span>
    )
  }

  if (engine === 'web-speech') {
    return (
      <span
        title={detail ?? 'Using online recognition — audio is sent to the browser vendor and this needs internet.'}
        className={cn(
          'inline-flex items-center gap-1 rounded-full font-semibold text-amber-300 bg-amber-500/15',
          size === 'sm' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-1 text-[10.5px]',
        )}
      >
        <Cloud size={size === 'sm' ? 9 : 11} /> Online AI
      </span>
    )
  }

  return (
    <span
      title={detail ?? 'Starting the speech engine…'}
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-semibold text-white/50 bg-white/[0.06]',
        size === 'sm' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-1 text-[10.5px]',
      )}
    >
      <Mic size={size === 'sm' ? 9 : 11} /> Starting…
    </span>
  )
}
