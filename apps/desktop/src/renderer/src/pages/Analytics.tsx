import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp, Users, Globe, Clock, Eye, Heart,
  MessageSquare, Download, Calendar, BarChart3,
  Activity, ChevronDown,
} from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { cn } from '../lib/utils'

// ── Historical data (last 4 services) ─────────────────────────────────────────
const SERVICES = [
  { label: 'This Sunday',    date: 'Jun 1',  viewers: 2637, inPerson: 318, duration: '1h 22m', countries: 12, engagement: 78, chat: 1204 },
  { label: 'Last Sunday',    date: 'May 25', viewers: 2847, inPerson: 342, duration: '1h 24m', countries: 14, engagement: 87, chat: 1429 },
  { label: '2 Sundays ago',  date: 'May 18', viewers: 2190, inPerson: 295, duration: '1h 18m', countries: 11, engagement: 72, chat: 986  },
  { label: '3 Sundays ago',  date: 'May 11', viewers: 1988, inPerson: 278, duration: '1h 31m', countries: 9,  engagement: 65, chat: 841  },
]

const PLATFORM_STATS = [
  { name: 'YouTube Live',   viewers: 1284, pct: 49, color: 'bg-red-500'   },
  { name: 'Facebook Live',  viewers: 842,  pct: 32, color: 'bg-blue-500'  },
  { name: 'Church Website', viewers: 511,  pct: 19, color: 'bg-purple-500'},
]

const LOCATION_DATA = [
  { country: 'United States', flag: '🇺🇸', count: 1840, pct: 70 },
  { country: 'Nigeria',       flag: '🇳🇬', count: 425,  pct: 16 },
  { country: 'United Kingdom',flag: '🇬🇧', count: 280,  pct: 11 },
  { country: 'Canada',        flag: '🇨🇦', count: 168,  pct: 6  },
  { country: 'Other',         flag: '🌍', count: 134,  pct: 5  },
]

// Viewer timeline data for the selected service
const TIMELINE_POINTS = [80, 160, 310, 620, 1050, 1480, 2100, 2500, 2637, 2580, 2420, 2200, 1950, 1700, 1400, 1100]

export function AnalyticsPage() {
  const { isStreaming } = useAppStore()
  const [selectedService, setSelectedService] = useState(0)
  const svc = SERVICES[selectedService]

  const statCards = [
    { label: 'Online Viewers', value: svc.viewers.toLocaleString(), delta: '+23%', icon: Eye,          bg: 'bg-blue-600/10 border-blue-500/20',   color: 'text-blue-400'   },
    { label: 'In-Person',      value: svc.inPerson.toString(),      delta: '+18',  icon: Users,         bg: 'bg-purple-600/10 border-purple-500/20',color: 'text-purple-400' },
    { label: 'Countries',      value: svc.countries.toString(),      delta: '+2',   icon: Globe,         bg: 'bg-emerald-600/10 border-emerald-500/20',color:'text-emerald-400'},
    { label: 'Avg Watch Time', value: svc.duration,                  delta: null,   icon: Clock,         bg: 'bg-orange-600/10 border-orange-500/20',color: 'text-orange-400' },
    { label: 'Engagement',     value: `${svc.engagement}%`,          delta: '+12%', icon: Heart,         bg: 'bg-rose-600/10 border-rose-500/20',    color: 'text-rose-400'   },
    { label: 'Chat Messages',  value: svc.chat.toLocaleString(),      delta: '+44%', icon: MessageSquare, bg: 'bg-cyan-600/10 border-cyan-500/20',    color: 'text-cyan-400'   },
  ]

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 space-y-5 max-w-[1400px] mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-white/90">Analytics</h1>
            <p className="text-sm text-white/40 mt-0.5">
              {isStreaming ? 'Live dashboard · Updating every 30s' : 'Historical service data'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Service picker */}
            <div className="relative">
              <select
                value={selectedService}
                onChange={e => setSelectedService(+e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-xs text-white/70 outline-none cursor-pointer"
              >
                {SERVICES.map((s, i) => (
                  <option key={i} value={i} className="bg-[#1a1a2e]">{s.label} · {s.date}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
            </div>
            <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-xs text-white/50 hover:text-white/80 transition-colors">
              <Download size={12} />
              Export
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-6 gap-3">
          {statCards.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={cn('rounded-xl border p-4', stat.bg)}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] text-white/45">{stat.label}</span>
                <stat.icon size={13} className={stat.color} />
              </div>
              <div className="text-2xl font-bold text-white/90">{stat.value}</div>
              {stat.delta && (
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp size={10} className="text-emerald-400" />
                  <span className="text-[10px] text-emerald-400">{stat.delta} vs prev.</span>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-12 gap-4">

          {/* Viewer timeline */}
          <div className="col-span-8 card-premium p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white/80">Viewer Count Over Service</h3>
                <p className="text-[10px] text-white/30 mt-0.5">{svc.label} · {svc.date}</p>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-white/35">
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-purple-500 inline-block rounded" />YouTube</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-blue-500  inline-block rounded" />Facebook</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-orange-500 inline-block rounded" />Website</span>
              </div>
            </div>
            <ViewerChart points={TIMELINE_POINTS} peak={svc.viewers} />
          </div>

          {/* Platform breakdown */}
          <div className="col-span-4 card-premium p-4">
            <h3 className="text-sm font-semibold text-white/80 mb-1">Platforms</h3>
            <p className="text-[10px] text-white/30 mb-4">Total {svc.viewers.toLocaleString()} viewers</p>
            <div className="space-y-3.5">
              {PLATFORM_STATS.map(p => (
                <div key={p.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-white/55">{p.name}</span>
                    <span className="text-xs font-mono text-white/45">{p.viewers.toLocaleString()}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/[0.07] overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${p.pct}%` }}
                      transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
                      className={cn('h-full rounded-full', p.color)}
                    />
                  </div>
                  <div className="text-[9px] text-white/25 mt-0.5 font-mono text-right">{p.pct}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Geo + engagement row */}
        <div className="grid grid-cols-12 gap-4">

          {/* Geography */}
          <div className="col-span-5 card-premium p-4">
            <h3 className="text-sm font-semibold text-white/80 mb-4">Audience Geography</h3>
            <div className="space-y-2.5">
              {LOCATION_DATA.map(loc => (
                <div key={loc.country} className="flex items-center gap-3">
                  <span className="text-lg w-7 shrink-0">{loc.flag}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-white/55">{loc.country}</span>
                      <span className="text-white/40 font-mono">{loc.count.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${loc.pct}%` }}
                        transition={{ duration: 1, delay: 0.5, ease: 'easeOut' }}
                        className="h-full bg-gradient-to-r from-purple-500 to-orange-500 rounded-full"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Engagement metrics */}
          <div className="col-span-7 grid grid-cols-3 gap-3 content-start">
            {[
              { title: 'Peak Viewers',    value: (svc.viewers + 300).toLocaleString(), sub: 'During altar call', icon: TrendingUp, color: 'text-purple-400' },
              { title: 'Avg Watch Time',  value: svc.duration, sub: `of ${svc.duration} total service`,           icon: Clock,      color: 'text-orange-400' },
              { title: 'New Visitors',    value: '203',         sub: '84 from social referral',                   icon: Users,      color: 'text-blue-400'   },
              { title: 'In-Person',       value: svc.inPerson.toString(), sub: 'Physical attendance',            icon: Users,      color: 'text-emerald-400'},
              { title: 'Prayer Requests', value: '47',          sub: 'Submitted via app',                         icon: Heart,      color: 'text-rose-400'   },
              { title: 'Scripture Refs',  value: '12',          sub: 'AI-detected during service',                icon: Activity,   color: 'text-teal-400'   },
            ].map(m => (
              <div key={m.title} className="card-premium p-3.5">
                <div className="flex items-center gap-2 mb-2">
                  <m.icon size={13} className={m.color} />
                  <span className="text-[10px] text-white/40">{m.title}</span>
                </div>
                <div className="text-2xl font-bold text-white/90">{m.value}</div>
                <div className="text-[10px] text-white/30 mt-0.5">{m.sub}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

// ── Viewer chart ──────────────────────────────────────────────────────────────

function ViewerChart({ points, peak }: { points: number[]; peak: number }) {
  const max = Math.max(...points)
  const w   = 100 / (points.length - 1)
  const pts = points.map((v, i) => `${i * w},${100 - (v / max) * 88}`).join(' ')

  const times = ['9:00', '9:15', '9:30', '9:45', '10:00', '10:15', '10:30', '10:45',
                 '11:00', '11:15', '11:30', '11:45', '12:00', '12:15', '12:30', '12:45']

  return (
    <div>
      <div className="relative h-44">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-[9px] font-mono text-white/20 pr-2 pointer-events-none">
          <span>{(peak / 1000).toFixed(1)}k</span>
          <span>{(peak * 0.75 / 1000).toFixed(1)}k</span>
          <span>{(peak * 0.5 / 1000).toFixed(1)}k</span>
          <span>{(peak * 0.25 / 1000).toFixed(1)}k</span>
          <span>0</span>
        </div>

        <div className="absolute left-8 right-0 top-0 bottom-6">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
            <defs>
              <linearGradient id="area-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%"   stopColor="rgb(139,92,246)"  stopOpacity="0.35" />
                <stop offset="100%" stopColor="rgb(139,92,246)"  stopOpacity="0"    />
              </linearGradient>
            </defs>
            {/* Grid lines */}
            {[25, 50, 75].map(pct => (
              <line key={pct} x1="0" y1={100 - pct * 0.88} x2="100" y2={100 - pct * 0.88}
                stroke="white" strokeOpacity="0.04" strokeWidth="0.5" />
            ))}
            {/* Area fill */}
            <polyline
              points={`${pts} ${100},100 0,100`}
              fill="url(#area-grad)"
            />
            {/* Line */}
            <polyline
              points={pts}
              fill="none"
              stroke="rgb(168,85,247)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Peak dot */}
            <circle
              cx={`${8 * w}`}
              cy={`${100 - (max / max) * 88}`}
              r="2.5"
              fill="rgb(249,115,22)"
              stroke="rgb(249,115,22)"
              strokeOpacity="0.3"
              strokeWidth="4"
            />
          </svg>
        </div>

        {/* Peak label */}
        <div className="absolute right-1 top-0 text-[9px] font-mono text-orange-400">
          Peak {peak.toLocaleString()}
        </div>
      </div>

      {/* X-axis */}
      <div className="flex justify-between pl-8 mt-1">
        {times.filter((_, i) => i % 4 === 0).map(t => (
          <span key={t} className="text-[9px] font-mono text-white/20">{t}</span>
        ))}
      </div>
    </div>
  )
}
