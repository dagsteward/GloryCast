import { motion } from 'framer-motion'
import { Construction } from 'lucide-react'

/**
 * Honest stand-in for a navigation destination that has not been built yet.
 *
 * The sidebar advertises the full GloryCast OS module set, and a nav item that
 * silently renders nothing reads as a bug. This says plainly what is missing so
 * nobody — operator or reviewer — mistakes an empty screen for a broken one.
 */
export function ModulePlaceholder({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="w-full h-full flex items-center justify-center p-8"
    >
      <div className="max-w-sm text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center">
          <Construction size={20} className="text-purple-400/70" />
        </div>
        <h2 className="text-[15px] font-semibold text-white/85">{title}</h2>
        <p className="mt-2 text-[12px] leading-relaxed text-white/40">{description}</p>
        <p className="mt-4 text-[10px] tracking-[0.14em] font-semibold text-white/25">
          MODULE NOT YET IMPLEMENTED
        </p>
      </div>
    </motion.div>
  )
}
