// ─────────────────────────────────────────────────────────────────────────────
// Main-process API configuration.
//
// This is NOT the same mechanism as the renderer's VITE_API_URL. The renderer
// is bundled by Vite, which substitutes import.meta.env.VITE_API_URL with a
// literal string at build time — that value survives into the packaged app.
//
// The main process is compiled with plain tsc, which does no such
// substitution. Code here that reads process.env.VITE_API_URL is reading the
// environment of whoever launches the app — for a customer who double-clicks
// an installed .exe, that is empty. It would silently fall back to
// localhost:3001 in every packaged build, regardless of what the renderer was
// built to point at.
//
// The fix is the same one used for LICENSE_PUBLIC_KEY: a literal committed to
// source, intentionally changed for a release, overridable by an environment
// variable for local development and staging.
// ─────────────────────────────────────────────────────────────────────────────

const isDev = process.env.NODE_ENV === 'development'

/** Origin of the GloryCast API, no trailing slash. */
export const API_BASE_URL = (
  process.env.GLORYCAST_API_URL
  ?? (isDev ? 'http://localhost:3001' : 'https://glorycastbackend-production.up.railway.app')
).replace(/\/+$/, '')
