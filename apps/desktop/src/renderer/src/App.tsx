import { HashRouter, Routes, Route } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { MainLayout } from './layouts/MainLayout'
import { DashboardPage } from './pages/Dashboard'
import { PresentationPage } from './pages/Presentation'
import { ProductionPage } from './pages/Production'
import { WebinarPage } from './pages/Webinar'
import { EngagementPage } from './pages/Engagement'
import { AiStudioPage } from './pages/AiStudio'
import { SettingsPage } from './pages/Settings'
import { StageDisplayPage } from './pages/StageDisplay'
import { BibleDisplayPage } from './pages/BibleDisplay'
import { BiblePage } from './pages/Bible'
import { AnalyticsPage } from './pages/Analytics'
import { ModulePlaceholder } from './pages/ModulePlaceholder'
import { MinimalHomePage } from './pages/MinimalHome'
import { CommandCenterPage } from './pages/CommandCenter'

export function App() {
  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AnimatePresence mode="wait">
        <Routes>
          {/* Stage display runs fullscreen on second monitor */}
          <Route path="/stage-display" element={<StageDisplayPage />} />
          {/* Congregation-facing scripture projection — outside MainLayout so
              it carries no app chrome onto the projector. */}
          <Route path="/bible-display" element={<BibleDisplayPage />} />

          {/* Main app shell — every page shares the brand rail, top bar and
              status bar, Production included. */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<ProductionPage />} />
            <Route path="/production" element={<ProductionPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/presentation" element={<PresentationPage />} />
            <Route path="/webinar" element={<WebinarPage />} />
            <Route path="/engagement" element={<EngagementPage />} />
            <Route path="/ai-studio" element={<AiStudioPage />} />
            <Route path="/bible" element={<BiblePage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/settings" element={<SettingsPage />} />

            {/* Stream control already exists on the dashboard. */}
            <Route path="/stream" element={<DashboardPage />} />

            {/* Workspace home screens. */}
            <Route path="/home" element={<MinimalHomePage />} />
            <Route path="/command" element={<CommandCenterPage />} />
            <Route path="/routing" element={
              <ModulePlaceholder
                title="Advanced Routing"
                description="Matrix routing of sources to program, aux and stream destinations across multiple simultaneous events."
              />
            } />
            <Route path="/events" element={
              <ModulePlaceholder
                title="Multi-Event Control"
                description="Run several services or venues at once, each with its own program output and destinations."
              />
            } />

            {/* Advertised in the sidebar, not yet built. */}
            <Route path="/media" element={
              <ModulePlaceholder
                title="Media Library"
                description="Central store for videos, images, backgrounds and stingers, with tagging and quick assignment to sources."
              />
            } />
            <Route path="/graphics" element={
              <ModulePlaceholder
                title="Graphics"
                description="Lower thirds, tickers, countdowns and overlay templates that composite onto the program output."
              />
            } />
            <Route path="/audio" element={
              <ModulePlaceholder
                title="Audio Mixer"
                description="Per-source gain, mute and solo with a master bus feeding the encoder. Currently available inline on the Production page."
              />
            } />
            <Route path="/playback" element={
              <ModulePlaceholder
                title="Playback"
                description="Playlist-driven media playback with transport controls and auto-advance into program."
              />
            } />
            <Route path="/stage" element={
              <ModulePlaceholder
                title="Stage Display"
                description="Configure what the platform sees: current and next slide, notes, timers and alerts. Opens on a second monitor."
              />
            } />
          </Route>
        </Routes>
      </AnimatePresence>
    </HashRouter>
  )
}
