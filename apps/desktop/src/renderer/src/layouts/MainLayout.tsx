import { Outlet } from 'react-router-dom'
import { Sidebar } from '../components/shell/Sidebar'
import { TopBar } from '../components/shell/TopBar'
import { StatusBar } from '../components/shell/StatusBar'
import { MinimalTopNav } from '../components/shell/MinimalTopNav'
import { CommandBar } from '../components/shell/CommandBar'
import { AIAssistantPanel } from '../components/ai/AIAssistantPanel'
import { LicenceBanner } from '../components/licence/LicenceBanner'
import { useAppStore } from '../stores/appStore'
import { useWorkspace } from '../stores/workspaceStore'
import { useWorkspaceTheme } from '../hooks/useWorkspaceTheme'
import { useAiCopilot } from '../hooks/useAiCopilot'

/**
 * The app shell. Which chrome renders is decided entirely by the active
 * workspace — the three products share this component and nothing else about
 * their layout.
 */
export function MainLayout() {
  const aiPanelOpen = useAppStore(s => s.aiPanelOpen)
  const workspace = useWorkspace()

  // Applies the workspace palette to <html> before anything paints.
  useWorkspaceTheme()

  // Always-listening AI engine — runs once for the whole app. While a service
  // is live, it feeds scripture + song detections into the shared serviceStore.
  useAiCopilot()

  const content = (
    <main className="flex-1 overflow-hidden relative">
      <Outlet />
    </main>
  )

  const assistant = aiPanelOpen ? <AIAssistantPanel /> : null

  // ── Minimal AI Workspace: one slim nav, nothing else ──────────────────────
  if (workspace.chrome === 'top') {
    return (
      <div className="flex flex-col w-full h-full bg-app overflow-hidden">
        <LicenceBanner />
        <MinimalTopNav />
        <div className="flex flex-1 overflow-hidden">
          {content}
          {assistant}
        </div>
      </div>
    )
  }

  // ── Command Center: operations bar over a full-width content area ─────────
  if (workspace.chrome === 'command') {
    return (
      <div className="flex flex-col w-full h-full bg-app overflow-hidden">
        <LicenceBanner />
        <CommandBar />
        <div className="flex flex-1 overflow-hidden">
          {content}
          {assistant}
        </div>
        <StatusBar />
      </div>
    )
  }

  // ── Cinematic Broadcast: full-height brand rail + vitals bar + status rail ─
  return (
    <div className="flex flex-col w-full h-full bg-app overflow-hidden">
      <LicenceBanner />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <div className="flex flex-col flex-1 overflow-hidden">
          <TopBar />
          {content}
        </div>

        {assistant}
      </div>

      <StatusBar />
    </div>
  )
}
