// ─────────────────────────────────────────────────────────────────────────────
// API endpoint configuration.
//
// The base URL was previously hardcoded to localhost:3001 at the call sites,
// which meant a packaged installer would call the operator's own machine and
// silently fail for every customer. It is now resolved once, here.
//
// Resolution order:
//   1. VITE_API_URL, baked in at build time (how release builds are pointed at
//      production).
//   2. localhost, for local development.
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_DEV_API = 'http://localhost:3001'

function resolveBase(): string {
  const configured = import.meta.env?.VITE_API_URL as string | undefined
  const base = configured?.trim() || DEFAULT_DEV_API
  // Trailing slashes produce "//api/v1" paths, which some proxies 404.
  return base.replace(/\/+$/, '')
}

/** Origin of the GloryCast API, no trailing slash. */
export const API_ORIGIN = resolveBase()

/** Versioned API root, e.g. "https://api.glorycast.ai/api/v1". */
export const API_BASE = `${API_ORIGIN}/api/v1`

/** Build a URL against the versioned API root. */
export function apiUrl(path: string): string {
  return `${API_BASE}/${path.replace(/^\/+/, '')}`
}

/** True when pointed at a developer machine rather than a deployment. */
export const IS_LOCAL_API = API_ORIGIN.includes('localhost') || API_ORIGIN.includes('127.0.0.1')
