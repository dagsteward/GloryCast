import { motion } from 'framer-motion'
import { Users, Globe, TrendingUp, MapPin } from 'lucide-react'

const LOCATION_BREAKDOWN = [
  { country: 'United States', flag: '🇺🇸', count: 1840, pct: 65 },
  { country: 'Nigeria', flag: '🇳🇬', count: 425, pct: 15 },
  { country: 'United Kingdom', flag: '🇬🇧', count: 280, pct: 10 },
  { country: 'Canada', flag: '🇨🇦', count: 168, pct: 6 },
  { country: 'Other', flag: '🌍', count: 134, pct: 4 },
]

export function AudienceCountWidget() {
  const total = LOCATION_BREAKDOWN.reduce((a, b) => a + b.count, 0)

  return (
    <div className="card-premium p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white/80">Live Audience</h3>
        <Globe size={14} className="text-white/30" />
      </div>

      {/* Total count */}
      <div className="text-center mb-4">
        <motion.div
          key={total}
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className="text-5xl font-black gradient-text-brand"
        >
          {total.toLocaleString()}
        </motion.div>
        <div className="flex items-center justify-center gap-1 mt-1">
          <TrendingUp size={12} className="text-emerald-400" />
          <span className="text-xs text-emerald-400">+203 in last 30 min</span>
        </div>
      </div>

      {/* Location breakdown */}
      <div className="flex-1 space-y-2">
        {LOCATION_BREAKDOWN.map(loc => (
          <div key={loc.country} className="flex items-center gap-2">
            <span className="text-base w-6">{loc.flag}</span>
            <div className="flex-1">
              <div className="flex justify-between text-[11px] mb-0.5">
                <span className="text-white/55">{loc.country}</span>
                <span className="text-white/40 font-mono">{loc.count.toLocaleString()}</span>
              </div>
              <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${loc.pct}%` }}
                  transition={{ duration: 1, delay: 0.3 }}
                  className="h-full bg-gradient-to-r from-purple-500 to-orange-500 rounded-full"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
