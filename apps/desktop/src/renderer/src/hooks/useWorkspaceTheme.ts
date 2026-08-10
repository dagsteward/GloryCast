import { useEffect } from 'react'
import { useWorkspace } from '../stores/workspaceStore'

const THEME_CLASSES = ['theme-dim', 'theme-light'] as const

/**
 * Applies the active workspace's palette to the document root.
 *
 * The workspace owns the *base* look — Minimal is a light workspace, Command
 * Center is teal-on-dark — because the palette is part of what distinguishes
 * the three products, not a user preference layered on top. Appearance
 * settings still fine-tune within that base; this runs on workspace change, so
 * a later user override is not clobbered until they switch workspace again.
 */
export function useWorkspaceTheme(): void {
  const workspace = useWorkspace()

  useEffect(() => {
    const root = document.documentElement

    root.classList.remove(...THEME_CLASSES)
    if (workspace.themeClass) root.classList.add(workspace.themeClass)

    root.style.setProperty('--accent', workspace.accent)
    // Exposed so CSS can branch on workspace without a class per component.
    root.dataset.workspace = workspace.id
  }, [workspace.id, workspace.themeClass, workspace.accent])
}
