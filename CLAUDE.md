# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Commands

### Monorepo (from root)
```bash
npm run dev            # All apps in parallel (Turborepo)
npm run dev:desktop    # Desktop only
npm run dev:backend    # Backend API only
npm run build          # Build all apps
npm run lint           # Lint all packages
npm run type-check     # TypeScript check across all packages
npm run clean          # Remove all dist/ and node_modules/
```

### Desktop (`apps/desktop`)
```bash
npm run dev            # Electron main (tsc --watch) + Vite renderer (port 5173) via concurrently
npm run dev:renderer   # Vite renderer only — use this for browser preview without Electron
npm run electron       # Launch Electron against existing build
npm run dist           # Package distributable (electron-builder)
npx vite build         # One-shot renderer build — fastest way to catch import/syntax errors
```

The renderer has **no tsconfig** — Vite uses esbuild (no type-checking). The main process uses `tsconfig.main.json`. Running `npx vite build` inside `apps/desktop` is the fastest way to verify renderer correctness.

### Backend (`apps/backend`)
```bash
npm run dev            # NestJS watch mode
npm run test           # Jest unit tests
npm run test:e2e       # E2E tests
npx prisma migrate dev # Apply schema changes + generate client
npx prisma db seed     # Seed demo users, church, and bible data
npx prisma studio      # Visual DB browser on port 5555
```

### Infrastructure
```bash
docker compose -f infrastructure/docker/docker-compose.yml up -d
# Starts: postgres, redis, minio, ollama, livekit, nginx
```

---

## Architecture

### Monorepo layout
```
apps/
  desktop/    Electron + Vite + React (the main product)
  backend/    NestJS API server
  mobile/     React Native (future)
packages/
  bible-engine/   Local Bible search, reference parsing, scripture detection
  media-engine/   Camera/audio capture abstractions
  shared-types/   TypeScript interfaces shared across all apps
  ui/             Shared React component library
services/
  ai-worker/      Whisper.cpp transcription + Ollama LLM queue processor
  stream-worker/  RTMP ingest + ffmpeg re-stream to YouTube/Facebook/etc.
  sync-worker/    Background sync jobs
infrastructure/
  docker/         Docker Compose for local dev + production
  nginx/          Reverse-proxy with rate limiting, WebSocket support, HLS pass-through
```

---

### Desktop app (`apps/desktop`)

**Two-process Electron model:**

| Process | Entry | Responsibility |
|---------|-------|----------------|
| Main | `src/main/index.ts` | Window creation, IPC, media engine (NDI/FFmpeg), file dialogs, permission grants |
| Renderer | `src/renderer/src/main.tsx` | React SPA — all UI pages |

**Renderer routing** (`App.tsx`): HashRouter with routes for each page. `MainLayout` wraps all except `/stage-display` (fullscreen on second monitor).

**Page → File mapping:**
- `/` → `Dashboard.tsx` — stream control, quick nav cards, live stats
- `/production` → `Production.tsx` — vMix-style PGM/PVW switcher, NDI sources
- `/presentation` → `Presentation.tsx` — slides with preview → program flow, song/scripture slides
- `/bible` → `Bible.tsx` — 66-book browser, multi-translation, lower-third queue with preview → program states
- `/engagement` → `Engagement.tsx` — Quiz, Polls, Q&A with live leaderboard
- `/ai-studio` → `AiStudio.tsx` — sermon transcript → AI content generation
- `/webinar` → `Webinar.tsx` — hybrid event with screen share, chat, Q&A, polling
- `/analytics` → `Analytics.tsx` — per-service viewer metrics with CSV export
- `/settings` → `Settings.tsx` — AV devices, streaming RTMP, appearance, AI keys

**State management:**

Two Zustand stores:
1. `stores/appStore.ts` — global app state: `church`, `isStreaming`, `destinations`, `streamHealth`, `viewerCount`, `upcomingService`, `lastDetectedScriptures`, `aiPanelOpen`. Persisted to `localStorage` under key `glorycast-app`.
2. `hooks/useMediaEngine.ts` — AV state: device lists, MediaStream pool, appearance config. Streams live in a module-level `Map<string, MediaStream>` (never in React state — avoids serialisation overhead). Appearance persisted under `gc-appearance`.

**Appearance / theming:** `applyAppearance()` in `useMediaEngine.ts` sets `--accent` CSS custom property on `document.documentElement` and toggles `theme-dim` / `theme-light` classes. The base dark theme lives in `globals.css` with `--gc-*` tokens. Theme selector in Settings → Appearance writes to this store; if theme isn't visually changing, check that `applyAppearance` is being called and the CSS classes are present.

**Audio/video permissions:** `session.defaultSession.setPermissionRequestHandler` in `src/main/index.ts` auto-grants `media`, `display-capture`, and `mediaKeySystem`. Without this, all `getUserMedia` / `getDisplayMedia` calls fail silently inside Electron's renderer.

**Multi-window:** Main window + optional stage display (`#/stage-display`) launched on the second monitor via `ipcMain.on('open-stage-display')`. A third confidence monitor window is defined but not yet wired to a route.

**Preload bridge:** `src/preload/index.ts` exposes `window.glorycast` IPC methods to the renderer (contextIsolation is on, nodeIntegration off).

**Scripture detection → preview → program flow (Bible page):**
`QueueItem` objects have a `state` field: `prepared` → `preview` → `program`. The "Send to Preview" button puts a verse on the preview monitor; "Take" or "Cut" promotes it to programme output. `ScriptureDetectionPanel` is used inside the Presentation page sidebar; clicking "Display" on a detected item should call `setCurrentDetectedScripture` which triggers `ScriptureAlertBanner` and can auto-queue to the Bible engine preview.

---

### Backend API (`apps/backend`)

**Tech stack:** NestJS 10 with Fastify adapter, Prisma 5 + PostgreSQL 16, Redis (cache + Bull queues), MinIO (object storage), Socket.IO at `/ws`.

**API base:** `http://localhost:3001/api/v1`  
**Swagger:** `http://localhost:3001/api/v1/docs`

**15 NestJS modules:**
`Auth`, `Users`, `Churches`, `Stream`, `Webinar`, `Bible`, `Media`, `AIEngine`, `Quiz`, `Poll`, `QA`, `Notification`, `Analytics`, `StageDisplay`, `NDIEngine`

**Auth:** JWT access tokens (15 min) + refresh tokens (7 days, stored in DB). `@Public()` decorator bypasses JWT guard. `@CurrentUser()` / `@CurrentChurch()` param decorators available in all controllers. Role hierarchy: `VIEWER < CAMERA_OPERATOR < LYRICS_OPERATOR < BIBLE_OPERATOR < PRODUCER < CHURCH_ADMIN < SUPER_ADMIN`.

**Multi-tenancy:** Every resource is scoped to `churchId`. The church slug is used in URLs.

**Events:** `EventEmitter2` (wildcard enabled) for cross-module pub/sub. The WebSocket gateway (`gateways/app.gateway.ts`) bridges `@OnEvent` handlers to Socket.IO rooms (`church:{id}`, `stream:{id}`, `webinar:{id}`).

**Seeded accounts:**
| Email | Password | Role |
|-------|----------|------|
| `admin@glorycast.ai` | `Admin@123` | `CHURCH_ADMIN` |
| `producer@glorycast.ai` | `Producer@123` | `PRODUCER` |

Church: **Grace Community Church** (slug: `grace-community-church`)

---

### Design system

**Utility:** `cn(...classes)` from `src/renderer/src/lib/utils.ts` — wraps `clsx` + `tailwind-merge`.

**CSS tokens** (in `globals.css`): `--gc-black`, `--gc-surface-1..4`, `--gc-purple`, `--gc-orange`, `--gc-text-*`, `--gc-glass`. Dynamic accent: `--accent` (RGB triplet, no `rgb()`).

**Page background scale — use these, never ad-hoc `bg-[#0x0x0x]`:** `--gc-app` (page root canvas) and `--gc-chrome` (bars, headers, side rails, deep panels), surfaced as the `.bg-app` and `.bg-chrome` utilities. They are redefined under `.theme-dim` / `.theme-light`, so using them keeps every page theme-aware. Elevated cards use `.card-premium` / `.glass`.

**Tailwind custom classes** (defined in `globals.css` `@layer components`):
- `.card-premium` — frosted glass card with border
- `.glass` — lighter glass surface
- `.live-dot` — animated pulsing red/green dot
- `.glow-orange`, `.glow-purple` — box-shadow glow helpers

**Framer Motion patterns:** Use `initial/animate/exit` with `AnimatePresence` for page transitions. Stagger children with `variants` + `staggerChildren`. `layoutId="nav-active"` on the sidebar nav pill provides spring-animated indicator.

---

### Key conventions

- All viewer/stat counts must show zero (not dummy numbers) when `isStreaming === false`. Historical data is clearly labelled "Last Service" or "Last week".
- `resetStream()` in `appStore` zeroes all destination stats and sets `isStreaming = false` — call this on Stop Stream.
- Media file streams use `video.captureStream(30)` — only works in Chrome/Electron, not Firefox.
- LF line endings on source files; Git will warn about CRLF on Windows — this is expected and safe to ignore.
- No `tsconfig.json` in `apps/desktop` root — don't add one; the two processes each have their own config.
