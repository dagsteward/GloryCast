import {
  Clapperboard, Library, Music4, BookOpen, Sparkles, Users, Layers,
  SlidersHorizontal, PlayCircle, Radio, MonitorPlay, Settings, Home,
  LayoutDashboard, BarChart3, Network, Globe, CalendarRange, MessageSquare,
  type LucideIcon,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// Workspaces — GloryCast ships as three distinct products in one binary.
//
// A workspace is NOT a colour scheme. It decides the shell layout, the palette,
// AND which capabilities exist at all. The whole point is that a small church
// running the Minimal workspace never sees an NDI picker or a video switcher,
// and a broadcast team in Cinematic isn't nagged by cloud-sync onboarding.
//
// Everything that varies between the three lives in this one file, so adding a
// capability means declaring where it belongs rather than scattering
// `if (workspace === …)` through the UI.
// ─────────────────────────────────────────────────────────────────────────────

export type WorkspaceId = 'cinematic' | 'minimal' | 'command'

/**
 * Capability flags. These map one-to-one onto the feature bullets shown on the
 * workspace chooser, so what we advertise and what we enable cannot drift.
 */
export type Feature =
  // Cinematic Broadcast
  | 'advanced-switcher'
  | 'multi-camera'
  | 'ndi-capture'
  | 'audio-mixer'
  | 'multi-streaming'
  | 'realtime-analytics'
  // Minimal AI Workspace
  | 'ai-scripture-detection'
  | 'smart-suggestions'
  | 'easy-presentation'
  | 'team-collaboration'
  | 'webinar-integration'
  | 'cloud-sync'
  // Command Center
  | 'multi-event-control'
  | 'advanced-routing'
  | 'engagement-tracking'
  | 'ai-monitoring'
  | 'global-streaming'

export interface WorkspaceNavItem {
  icon: LucideIcon
  label: string
  path: string
}

/** Where the primary navigation sits — drives which shell component renders. */
export type ChromeStyle =
  /** Full-height left rail with brand, nav and the scene list. */
  | 'rail'
  /** Horizontal nav in a slim top bar, content-first. */
  | 'top'
  /** Operations bar with live counters, plus a left sources rail. */
  | 'command'

export interface WorkspaceDef {
  id: WorkspaceId
  name: string
  tagline: string
  description: string
  /** Feature bullets shown on the chooser — mirrors `features`. */
  highlights: string[]
  features: readonly Feature[]
  nav: readonly WorkspaceNavItem[]
  chrome: ChromeStyle
  /** Class applied to <html>; '' means the base dark theme. */
  themeClass: '' | 'theme-dim' | 'theme-light'
  /** RGB triplet for the --accent custom property (no rgb() wrapper). */
  accent: string
  /** Route the workspace opens on. */
  homePath: string
}

export const WORKSPACES: Record<WorkspaceId, WorkspaceDef> = {
  // ── 1. Cinematic Broadcast ────────────────────────────────────────────────
  cinematic: {
    id: 'cinematic',
    name: 'Cinematic Broadcast',
    tagline: 'Powerful broadcast experience',
    description:
      'Powerful broadcast experience for churches, studios and live productions.',
    highlights: [
      'Advanced Switcher',
      'Multi-Camera',
      'NDI & Capture Cards',
      'Audio Mixer',
      'Multi-Streaming',
      'Real-time Analytics',
    ],
    features: [
      'advanced-switcher',
      'multi-camera',
      'ndi-capture',
      'audio-mixer',
      'multi-streaming',
      'realtime-analytics',
      // Scripture detection is GloryCast's signature; it belongs everywhere.
      'ai-scripture-detection',
      'easy-presentation',
    ],
    nav: [
      { icon: Clapperboard,      label: 'Production',       path: '/production'   },
      { icon: Library,           label: 'Media Library',    path: '/media'        },
      { icon: Music4,            label: 'Worship',          path: '/presentation' },
      { icon: BookOpen,          label: 'Bible',            path: '/bible'        },
      { icon: Sparkles,          label: 'AI Studio',        path: '/ai-studio'    },
      { icon: Users,             label: 'Webinar & Guests', path: '/webinar'      },
      { icon: Layers,            label: 'Graphics',         path: '/graphics'     },
      { icon: SlidersHorizontal, label: 'Audio Mixer',      path: '/audio'        },
      { icon: PlayCircle,        label: 'Playback',         path: '/playback'     },
      { icon: Radio,             label: 'Stream & Record',  path: '/stream'       },
      { icon: MonitorPlay,       label: 'Stage Display',    path: '/stage'        },
      { icon: Settings,          label: 'Settings',         path: '/settings'     },
    ],
    chrome: 'rail',
    themeClass: '',
    accent: '124 58 237',      // purple-600
    homePath: '/production',
  },

  // ── 2. Minimal AI Workspace ───────────────────────────────────────────────
  minimal: {
    id: 'minimal',
    name: 'Minimal AI Workspace',
    tagline: 'Simple, clean and AI-powered',
    description:
      'Simple, clean and AI-powered workspace for pastors and volunteer teams.',
    highlights: [
      'AI Scripture Detection',
      'Smart Suggestions',
      'Easy Presentation',
      'Team Collaboration',
      'Webinar Integration',
      'Cloud Sync',
    ],
    features: [
      'ai-scripture-detection',
      'smart-suggestions',
      'easy-presentation',
      'team-collaboration',
      'webinar-integration',
      'cloud-sync',
    ],
    nav: [
      { icon: Home,       label: 'Home',         path: '/home'         },
      { icon: Music4,     label: 'Worship',      path: '/presentation' },
      { icon: BookOpen,   label: 'Bible',        path: '/bible'        },
      { icon: Sparkles,   label: 'AI Assistant', path: '/ai-studio'    },
      { icon: Library,    label: 'Media',        path: '/media'        },
      { icon: Users,      label: 'Webinar',      path: '/webinar'      },
      { icon: Radio,      label: 'Stream',       path: '/stream'       },
      { icon: Settings,   label: 'Settings',     path: '/settings'     },
    ],
    chrome: 'top',
    themeClass: 'theme-light',
    accent: '124 58 237',
    homePath: '/home',
  },

  // ── 3. Command Center ─────────────────────────────────────────────────────
  command: {
    id: 'command',
    name: 'Command Center',
    tagline: 'Advanced control for large events',
    description:
      'Advanced command center for large events, conferences and global ministries.',
    highlights: [
      'Real-time Analytics',
      'Multi-Event Control',
      'Advanced Routing',
      'Engagement Tracking',
      'AI Monitoring',
      'Global Streaming',
    ],
    features: [
      'realtime-analytics',
      'multi-event-control',
      'advanced-routing',
      'engagement-tracking',
      'ai-monitoring',
      'global-streaming',
      // A command centre still switches sources and rides faders.
      'advanced-switcher',
      'multi-camera',
      'audio-mixer',
      'multi-streaming',
      'ai-scripture-detection',
    ],
    nav: [
      { icon: LayoutDashboard, label: 'Command',    path: '/command'    },
      { icon: BarChart3,       label: 'Analytics',  path: '/analytics'  },
      { icon: MessageSquare,   label: 'Engagement', path: '/engagement' },
      { icon: Network,         label: 'Routing',    path: '/routing'    },
      { icon: CalendarRange,   label: 'Events',     path: '/events'     },
      { icon: Globe,           label: 'Streams',    path: '/stream'     },
      { icon: Settings,        label: 'Settings',   path: '/settings'   },
    ],
    chrome: 'command',
    themeClass: '',
    accent: '20 184 166',      // teal-500
    homePath: '/command',
  },
}

export const WORKSPACE_ORDER: readonly WorkspaceId[] = ['cinematic', 'minimal', 'command']

export function getWorkspace(id: WorkspaceId): WorkspaceDef {
  return WORKSPACES[id] ?? WORKSPACES.cinematic
}

/** True when `id` exposes `feature`. */
export function workspaceHas(id: WorkspaceId, feature: Feature): boolean {
  return getWorkspace(id).features.includes(feature)
}

/** True when `path` is reachable in `id`'s navigation. */
export function workspaceAllows(id: WorkspaceId, path: string): boolean {
  return getWorkspace(id).nav.some(item => path.startsWith(item.path))
}
