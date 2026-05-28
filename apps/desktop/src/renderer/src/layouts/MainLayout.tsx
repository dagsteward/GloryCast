import { Outlet } from 'react-router-dom'
import { Sidebar } from '../components/shell/Sidebar'
import { TitleBar } from '../components/shell/TitleBar'
import { StatusBar } from '../components/shell/StatusBar'
import { AIAssistantPanel } from '../components/ai/AIAssistantPanel'
import { useAppStore } from '../stores/appStore'

export function MainLayout() {
  const { aiPanelOpen } = useAppStore()

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
