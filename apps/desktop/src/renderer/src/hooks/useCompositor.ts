import { useEffect, useRef } from 'react'
import {
  Compositor,
  TextRenderer,
  createLayer,
  createScene,
  type Scene,
  type TransitionKind,
  type FitMode,
} from '@glorycast/media-engine'
import { useMediaEngine, getStream } from './useMediaEngine'
import { useEngineStore } from '../stores/engineStore'

// ─────────────────────────────────────────────────────────────────────────────
// useCompositor — binds the GPU compositor to the app's live sources.
//
// The compositor itself knows nothing about React or the media engine. This is
// the seam: it keeps a texture registered for every live MediaStream, mirrors
// the program/preview selection into scenes, and publishes render stats.
//
// Everything lives at module scope, like the MediaStream pool in
// useMediaEngine — a single GPU context must survive re-renders, route changes
// and StrictMode double-mounts. Creating one per component would exhaust
// Electron's WebGL context limit within a few navigations.
// ─────────────────────────────────────────────────────────────────────────────

let _compositor: Compositor | null = null
let _textRenderer: TextRenderer | null = null

/** Hidden <video> elements that turn MediaStreams into sampleable textures. */
const _videos = new Map<string, HTMLVideoElement>()

/** Source id under which the scripture/lyric overlay is registered. */
const GRAPHIC_SOURCE_ID = '__graphic'

export interface ProgramGraphic {
  ref: string
  text: string
  translation?: string
}

/** The live compositor, created on first use. Null if WebGL2 is unavailable. */
export function getCompositor(): Compositor | null {
  if (_compositor) return _compositor
  try {
    _compositor = new Compositor(undefined, { width: 1920, height: 1080, fps: 60 })

    _textRenderer = new TextRenderer(1920, 1080)
    _compositor.registerSource(GRAPHIC_SOURCE_ID, _textRenderer.canvas)

    _compositor.on('stats', (stats) => {
      useEngineStore.getState().setStats({
        fps: stats.fps,
        frameTimeMs: stats.frameTimeMs,
        droppedFrames: stats.droppedFrames,
      })
    })
    _compositor.on('error', (err) => {
      console.error('[Compositor]', err)
      useEngineStore.getState().reset()
    })

    _compositor.start()
    useEngineStore.getState().setOutputFormat('1080p60')
  } catch (err) {
    // No WebGL2 — the app must still run, just without composited output.
    console.error('[Compositor] unavailable:', err)
    _compositor = null
  }
  return _compositor
}

/**
 * Ensure a hidden video element exists for `id` and is playing its stream.
 * Returns null when the source has no stream yet.
 */
function ensureVideo(id: string): HTMLVideoElement | null {
  const stream = getStream(id)
  if (!stream) return null

  let video = _videos.get(id)
  if (!video) {
    video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.autoplay = true
    _videos.set(id, video)
  }
  if (video.srcObject !== stream) {
    video.srcObject = stream
    // Autoplay can be refused; the compositor simply skips a texture that has
    // never produced a frame, so a rejected play is not fatal.
    void video.play().catch(() => {})
  }
  return video
}

function releaseVideo(id: string): void {
  const video = _videos.get(id)
  if (!video) return
  video.srcObject = null
  _videos.delete(id)
}

/** Build the layer stack for a source, optionally with the graphic on top. */
function buildScene(
  id: string, name: string, sourceId: string | null, withGraphic: boolean,
  fit: FitMode = 'cover',
): Scene {
  const layers = []
  // Fit is carried per source rather than fixed at 'cover'. Cover crops
  // anything that is not 16:9, which silently cut the top and bottom off a
  // portrait clip with no way to see the whole frame. The compositor has
  // always supported contain/stretch; nothing passed the value through.
  if (sourceId) layers.push(createLayer(`${id}-base`, sourceId, { fit }))
  // The scripture overlay is authored at frame size, so it must never be
  // refitted — stretching or cropping it would distort the type.
  if (withGraphic) layers.push(createLayer(`${id}-gfx`, GRAPHIC_SOURCE_ID))
  return createScene(id, name, layers)
}

/** Source fit → compositor fit. 'fill' is the engine's 'stretch'. */
function toFitMode(fit?: string): FitMode {
  return fit === 'contain' ? 'contain' : fit === 'fill' ? 'stretch' : 'cover'
}

export interface CompositorController {
  /** Perform a transition from program to preview. */
  take: (kind: TransitionKind, durationMs: number) => void
  /** Instant switch. */
  cut: () => void
  /** True while a transition is animating — TAKE should be disabled. */
  isTransitioning: () => boolean
}

/**
 * Mount the compositor for the Production page.
 *
 * Call once per page. Keeps textures, scenes and the scripture overlay in sync
 * with the media engine and the currently projected graphic.
 */
export function useCompositor(liveGraphic: ProgramGraphic | null): CompositorController {
  const sources   = useMediaEngine(s => s.sources)
  const programId = useMediaEngine(s => s.programId)
  const previewId = useMediaEngine(s => s.previewId)

  const graphicRef = useRef(liveGraphic)
  graphicRef.current = liveGraphic

  // ── Keep a texture registered for every source that has a live stream ─────
  useEffect(() => {
    const compositor = getCompositor()
    if (!compositor) return

    const liveIds = new Set<string>()

    for (const source of sources) {
      // Audio-only sources have no frame to texture. Registering one would
      // create a video element that never yields a frame, and switching to it
      // would put black on air.
      if (source.hasVideo === false) continue

      const video = ensureVideo(source.id)
      if (video) {
        liveIds.add(source.id)
        compositor.registerSource(source.id, video)
      }
    }

    // Drop textures for sources that have gone away, so the GPU isn't holding
    // frames from a camera that was unplugged mid-service.
    for (const id of [..._videos.keys()]) {
      if (!liveIds.has(id)) {
        compositor.unregisterSource(id)
        releaseVideo(id)
      }
    }
  }, [sources])

  // ── Render the scripture overlay into its texture ────────────────────────
  useEffect(() => {
    if (!_textRenderer) return

    if (!liveGraphic) {
      _textRenderer.clear()
      return
    }

    _textRenderer.render(
      {
        body: liveGraphic.text,
        attribution: liveGraphic.ref,
        badge: liveGraphic.translation,
      },
      { position: 'lower-third' },
    )
  }, [liveGraphic])

  // ── Mirror program/preview selection into scenes ─────────────────────────
  useEffect(() => {
    const compositor = getCompositor()
    if (!compositor) return

    const programLabel = sources.find(s => s.id === programId)?.label ?? 'Program'
    const previewLabel = sources.find(s => s.id === previewId)?.label ?? 'Preview'

    // A transition in flight owns the program scene; replacing it mid-flight
    // would tear the animation.
    const programFit = toFitMode(sources.find(s => s.id === programId)?.fit)
    const previewFit = toFitMode(sources.find(s => s.id === previewId)?.fit)

    if (!compositor.isTransitioning) {
      compositor.setProgramScene(
        buildScene('program', programLabel, programId, Boolean(liveGraphic), programFit),
      )
    }
    compositor.setPreviewScene(
      buildScene('preview', previewLabel, previewId, false, previewFit),
    )
  }, [programId, previewId, sources, liveGraphic])

  return {
    take: (kind, durationMs) => {
      const compositor = getCompositor()
      if (!compositor) return

      compositor.take({ kind, durationMs })
      // Keep the media engine's notion of program in step with the GPU, so the
      // rest of the UI (labels, source badges) follows the transition.
      const engine = useMediaEngine.getState()
      if (engine.previewId) engine.cutToProgram()
    },

    cut: () => {
      const compositor = getCompositor()
      compositor?.cut()
      const engine = useMediaEngine.getState()
      if (engine.previewId) engine.cutToProgram()
    },

    isTransitioning: () => getCompositor()?.isTransitioning ?? false,
  }
}

/** Mount the compositor's program canvas into `container`. */
export function useProgramCanvas(container: React.RefObject<HTMLDivElement>): void {
  useEffect(() => {
    const compositor = getCompositor()
    const host = container.current
    if (!compositor || !host) return

    const canvas = compositor.canvas
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.display = 'block'
    canvas.style.objectFit = 'contain'
    host.appendChild(canvas)

    return () => {
      // The canvas is a singleton; hand it back rather than destroying it.
      if (canvas.parentElement === host) host.removeChild(canvas)
    }
  }, [container])
}

/** Attach a 2D canvas that receives the composed preview scene. */
export function usePreviewCanvas(canvasRef: React.RefObject<HTMLCanvasElement>): void {
  useEffect(() => {
    const compositor = getCompositor()
    if (!compositor || !canvasRef.current) return

    compositor.attachPreviewCanvas(canvasRef.current)
    return () => { compositor.attachPreviewCanvas(null) }
  }, [canvasRef])
}
