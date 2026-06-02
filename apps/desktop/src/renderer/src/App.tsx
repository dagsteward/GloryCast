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
import { BiblePage } from './pages/Bible'
import { AnalyticsPage } from './pages/Analytics'

export function App() {
  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AnimatePresence mode="wait">
        <Routes>
          {/* Stage display runs fullscreen on second monitor */}
          <Route path="/stage-display" element={<StageDisplayPage />} />

          {/* Production is the landing page — a full-screen control room with its own chrome */}
          <Route path="/" element={<ProductionPage />} />
          <Route path="/production" element={<ProductionPage />} />

          {/* Main app shell */}
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/presentation" element={<PresentationPage />} />
            <Route path="/webinar" element={<WebinarPage />} />
            <Route path="/engagement" element={<EngagementPage />} />
            <Route path="/ai-studio" element={<AiStudioPage />} />
            <Route path="/bible" element={<BiblePage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </AnimatePresence>
    </HashRouter>
  )
}
