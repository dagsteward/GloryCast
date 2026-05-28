import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  MonitorPlay, Video, Users, Sparkles, Radio, BookOpen,
  TrendingUp, Clock, ChevronRight, Zap, Globe, Mic2,
  BarChart3, Activity, Play, Eye
} from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { QuickStartCard } from '../components/dashboard/QuickStartCard'
import { StreamHealthWidget } from '../components/dashboard/StreamHealthWidget'
import { RecentSlidesWidget } from '../components/dashboard/RecentSlidesWidget'
import { ScriptureAlertBanner } from '../components/scripture/ScriptureAlertBanner'
import { AudienceCountWidget } from '../components/dashboard/AudienceCountWidget'
import { cn } from '../lib/utils'

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
}

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { isStreaming, currentDetectedScripture, viewerCount } = useAppStore()

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden">
      <motion.div
        variants={stagger}
        initial="initial"
        animate="animate"
        className="p-6 space-y-6 max-w-[1600px] mx-auto"
      >
        {/* Header */}
        <motion.div variants={fadeUp} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white/90 tracking-tight">
              Good morning, Pastor
            </h1>
            <p className="text-sm text-white/40 mt-0.5">
              Sunday Service · {new Date().toLocaleDateString('en-US', {
                weekday: 'long', month: 'long', day: 'numeric'
              })}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isStreaming && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/15 border border-red-500/30 glow-red"
              >
                <span className="live-dot w-2 h-2 rounded-full bg-red-400" />
                <span className="text-sm font-semibold text-red-400">LIVE</span>
                <span className="text-sm text-red-400/70 font-mono">
                  {viewerCount?.toLocaleString()} viewers
                </span>
              </motion.div>
            )}

            <button
              onClick={() => navigate('/production')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors glow-purple"
            >
              <Play size={14} />
              Go Live
            </button>
          </div>
        </motion.div>

        {/* Scripture detection banner */}
        {currentDetectedScripture && (
          <motion.div variants={fadeUp}>
            <ScriptureAlertBanner scripture={currentDetectedScripture} />
          </motion.div>
        )}

        {/* Quick start cards */}
        <motion.div variants={fadeUp}>
          <div className="grid grid-cols-4 gap-3">
            <QuickStartCard
              icon={MonitorPlay}
              label="Presentation"
              description="Slides & lyrics"
              color="purple"
              onClick={() => navigate('/presentation')}
              badge={isStreaming ? 'Active' : undefined}
            />
            <QuickStartCard
              icon={Video}
              label="Production"
              description="Multi-camera switcher"
              color="orange"
              onClick={() => navigate('/production')}
            />
            <QuickStartCard
              icon={Radio}
              label="Webinar"
              description="Hybrid event host"
              color="blue"
              onClick={() => navigate('/webinar')}
            />
            <QuickStartCard
              icon={Sparkles}
              label="AI Studio"
              description="Content generation"
              color="emerald"
              onClick={() => navigate('/ai-studio')}
            />
          </div>
        </motion.div>

        {/* Main widgets grid */}
        <motion.div variants={fadeUp} className="grid grid-cols-12 gap-4">
          {/* Stream health — spans 8 columns */}
          <div className="col-span-8">
            <StreamHealthWidget />
          </div>

          {/* Audience count */}
          <div className="col-span-4">
            <AudienceCountWidget />
          </div>
        </motion.div>

        {/* Secondary row */}
        <motion.div variants={fadeUp} className="grid grid-cols-12 gap-4">
          {/* Recent slides */}
          <div className="col-span-5">
            <RecentSlidesWidget />
          </div>

          {/* Stats */}
          <div className="col-span-4">
            <ServiceStatsWidget />
          </div>

          {/* Quick Bible search */}
          <div className="col-span-3">
            <QuickBibleWidget />
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}

function ServiceStatsWidget() {
  const stats = [
    { label: 'In-Person', value: '342', delta: '+18', icon: Users, color: 'text-purple-400' },
    { label: 'Online', value: '1,284', delta: '+203', icon: Globe, color: 'text-blue-400' },
    { label: 'Duration', value: '1h 24m', delta: null, icon: Clock, color: 'text-orange-400' },
    { label: 'Engagement', value: '87%', delta: '+12%', icon: Activity, color: 'text-emerald-400' },
  ]

  return (
    <div className="card-premium p-4 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white/80">Service Stats</h3>
        <BarChart3 size={14} className="text-white/30" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {stats.map(({ label, value, delta, icon: Icon, color }) => (
          <div key={label} className="glass rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-white/40">{label}</span>
              <Icon size={12} className={color} />
            </div>
            <div className="text-xl font-bold text-white/90">{value}</div>
            {delta && (
              <div className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-0.5">
                <TrendingUp size={10} />
                {delta}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function QuickBibleWidget() {
  const { useNavigate: nav } = { useNavigate: useNavigate }
  const navigate = useNavigate()

  return (
    <div className="card-premium p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white/80">Bible</h3>
        <BookOpen size={14} className="text-white/30" />
      </div>

      <div className="flex-1 space-y-2">
        {/* Quick verse of the day */}
        <div className="glass rounded-lg p-3">
          <div className="text-[10px] text-purple-400 font-medium mb-1.5">Verse of the Day</div>
          <p className="text-xs text-white/70 leading-relaxed italic">
            "For God so loved the world that he gave his one and only Son..."
          </p>
          <div className="text-[10px] text-white/40 mt-1.5">John 3:16 NIV</div>
        </div>

        {/* Quick search */}
        <input
          type="text"
          placeholder="Search scripture..."
          className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white/80 placeholder:text-white/25 outline-none focus:border-purple-500/50 transition-colors"
        />
      </div>

      <button
        onClick={() => navigate('/bible')}
        className="mt-3 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] text-white/50 hover:text-white/80 hover:bg-white/[0.04] transition-colors"
      >
        Open Bible Engine
        <ChevronRight size={12} />
      </button>
    </div>
  )
}
