import { motion } from 'framer-motion'
import { TrendingUp, Users, Globe, Clock, Eye, Heart, MessageSquare, Download } from 'lucide-react'
import { cn } from '../lib/utils'

const STAT_CARDS = [
  { label: 'Total Viewers', value: '2,847', delta: '+23%', icon: Eye, color: 'text-blue-400', bg: 'bg-blue-600/10 border-blue-500/20' },
  { label: 'In-Person', value: '342', delta: '+18', icon: Users, color: 'text-purple-400', bg: 'bg-purple-600/10 border-purple-500/20' },
  { label: 'Countries', value: '14', delta: '+2', icon: Globe, color: 'text-emerald-400', bg: 'bg-emerald-600/10 border-emerald-500/20' },
  { label: 'Watch Time', value: '4,210h', delta: '+31%', icon: Clock, color: 'text-orange-400', bg: 'bg-orange-600/10 border-orange-500/20' },
  { label: 'Engagement', value: '87%', delta: '+12%', icon: Heart, color: 'text-red-400', bg: 'bg-red-600/10 border-red-500/20' },
  { label: 'Chat Messages', value: '1,429', delta: '+44%', icon: MessageSquare, color: 'text-cyan-400', bg: 'bg-cyan-600/10 border-cyan-500/20' },
]

const PLATFORM_STATS = [
  { name: 'YouTube', viewers: 1284, pct: 45, color: 'bg-red-500' },
  { name: 'Facebook', viewers: 842, pct: 30, color: 'bg-blue-500' },
  { name: 'Church Website', viewers: 511, pct: 18, color: 'bg-purple-500' },
  { name: 'Other', viewers: 210, pct: 7, color: 'bg-white/30' },
]

export function AnalyticsPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white/90">Analytics</h1>
            <p className="text-sm text-white/40 mt-0.5">Sunday Service · Live Dashboard</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-xs text-white/60 hover:text-white/80 transition-colors">
            <Download size={13} />
            Export Report
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-6 gap-3">
          {STAT_CARDS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className={cn('rounded-xl border p-4', stat.bg)}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] text-white/50">{stat.label}</span>
                <stat.icon size={14} className={stat.color} />
              </div>
              <div className="text-2xl font-bold text-white/90">{stat.value}</div>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp size={11} className="text-emerald-400" />
                <span className="text-[11px] text-emerald-400">{stat.delta} vs last week</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-12 gap-4">
          {/* Viewer over time — fake chart */}
          <div className="col-span-8 card-premium p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white/80">Live Viewer Count</h3>
              <div className="flex items-center gap-2 text-[10px] text-white/40">
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-purple-500 inline-block rounded" />YouTube</span>
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-500 inline-block rounded" />Facebook</span>
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-orange-500 inline-block rounded" />Website</span>
              </div>
            </div>
            <FakeLineChart />
          </div>

          {/* Platform breakdown */}
          <div className="col-span-4 card-premium p-4">
            <h3 className="text-sm font-semibold text-white/80 mb-4">Platforms</h3>
            <div className="space-y-3">
              {PLATFORM_STATS.map(platform => (
                <div key={platform.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-white/60">{platform.name}</span>
                    <span className="text-xs font-mono text-white/50">{platform.viewers.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${platform.pct}%` }}
                      transition={{ duration: 1, delay: 0.5 }}
                      className={cn('h-full rounded-full', platform.color)}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-white/[0.05]">
              <div className="text-center">
                <div className="text-3xl font-bold gradient-text-brand">2,847</div>
                <div className="text-[11px] text-white/40 mt-1">Total Viewers</div>
              </div>
            </div>
          </div>
        </div>

        {/* Engagement metrics */}
        <div className="grid grid-cols-3 gap-4">
          <MetricCard title="Peak Viewers" value="3,241" subtext="at 10:47 AM during altar call" />
          <MetricCard title="Avg Watch Time" value="54 min" subtext="out of 1h 24m total service" />
          <MetricCard title="New Visitors" value="203" subtext="84 from social media referral" />
        </div>
      </div>
    </div>
  )
}

function MetricCard({ title, value, subtext }: { title: string; value: string; subtext: string }) {
  return (
    <div className="card-premium p-4">
      <div className="text-[11px] text-white/40 mb-2">{title}</div>
      <div className="text-3xl font-bold text-white/90 mb-1">{value}</div>
      <div className="text-[11px] text-white/35">{subtext}</div>
    </div>
  )
}

function FakeLineChart() {
  const points = [120, 245, 380, 720, 1100, 1580, 2200, 2640, 2847, 2720, 2500, 2300, 2100, 1800, 1500, 1200]
  const max = Math.max(...points)
  const w = 100 / (points.length - 1)

  const svgPoints = points
    .map((v, i) => `${i * w},${100 - (v / max) * 90}`)
    .join(' ')

  return (
    <div className="relative h-40">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
        <defs>
          <linearGradient id="line-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgb(124,58,237)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="rgb(124,58,237)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline
          points={`${svgPoints} ${100},100 0,100`}
          fill="url(#line-grad)"
        />
        <polyline
          points={svgPoints}
          fill="none"
          stroke="rgb(168,85,247)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Peak indicator */}
        <circle cx={`${8 * w}`} cy={`${100 - (max / max) * 90}`} r="2" fill="rgb(249,115,22)" />
      </svg>

      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-[9px] font-mono text-white/25 pr-2">
        <span>3K</span>
        <span>2K</span>
        <span>1K</span>
        <span>0</span>
      </div>
    </div>
  )
}
