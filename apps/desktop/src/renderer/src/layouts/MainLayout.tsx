import { Outlet } from 'react-router-dom'
import { Sidebar } from '../components/shell/Sidebar'
import { TitleBar } from '../components/shell/TitleBar'
import { StatusBar } from '../components/shell/StatusBar'
import { AIAssistantPanel } from '../components/ai/AIAssistantPanel'
import { useAppStore } from '../stores/appStore'
import { useAiCopilot } from '../hooks/useAiCopilot'

export function MainLayout() {
  const { aiPanelOpen } = useAppStore()

  // Always-listening AI engine — runs once for the whole app. While a service
  // is live, it feeds scripture + song detections into the shared serviceStore.
  useAiCopilot()

  return (
    <div className="flex flex-col w-full h-full bg-broadcast overflow-hidden">
      {/* Window title bar (frameless on macOS, hidden on Windows) */}
      <TitleBar />

      <div className="flex flex-1 overflow-hidden">
        {/* Left navigation sidebar */}
        <Sidebar />

        {/* Main content area */}
        <main className="flex-1 overflow-hidden relative">
          <Outlet />
        </main>

        {/* AI Assistant slide-in panel */}
        {aiPanelOpen && (
          <AIAssistantPanel />
        )}
      </div>

      {/* Bottom status bar */}
      <StatusBar />
    </div>
  )
}
