// ─────────────────────────────────────────────────────────────────────────────
// GloryCast media-engine — core types
//
// The compositor is deliberately UI-agnostic: it knows nothing about React,
// Zustand, or Electron. It consumes *texture sources* (anything the GPU can
// sample: video elements, images, canvases) arranged into *scenes*, and renders
// a single program frame. The renderer app owns device acquisition; the
// compositor owns pixels.
// ─────────────────────────────────────────────────────────────────────────────

/** Anything WebGL can upload as a texture each frame. */
export type TextureSource =
  | HTMLVideoElement
  | HTMLImageElement
  | HTMLCanvasElement
  | ImageBitmap

/** How a layer's source is fitted into its destination rectangle. */
export type FitMode =
  /** Fill the rect, cropping overflow. The broadcast default. */
  | 'cover'
  /** Fit entirely inside the rect, pillar/letterboxing as needed. */
  | 'contain'
  /** Ignore aspect ratio and stretch to the rect. */
  | 'stretch'

/**
 * Layer geometry in *normalised* coordinates (0..1 of the program frame), so a
 * scene is resolution-independent — the same scene renders correctly at 720p
 * preview and 1080p program.
 */
export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export const FULL_FRAME: Rect = { x: 0, y: 0, width: 1, height: 1 }

/** Colour-correction applied per layer on the GPU. */
export interface ColorAdjust {
  /** -1..1, 0 = unchanged */
  brightness: number
  /** 0..2, 1 = unchanged */
  contrast: number
  /** 0..2, 1 = unchanged */
  saturation: number
}

export const NEUTRAL_COLOR: ColorAdjust = {
  brightness: 0,
  contrast: 1,
  saturation: 1,
}

/**
 * A single composited element. Layers render back-to-front in array order, so
 * index 0 is the bottom of the stack.
 */
export interface Layer {
  id: string
  /** Key into the compositor's registered source table. */
  sourceId: string
  /** Destination rectangle in normalised program space. */
  rect: Rect
  /** 0..1 */
  opacity: number
  fit: FitMode
  visible: boolean
  color: ColorAdjust
  /**
   * Rounds the layer's corners, in normalised units of the *frame height*.
   * Used for picture-in-picture boxes and lower-third plates.
   */
  cornerRadius: number
  /** Horizontal mirror — essential for presenter-facing camera confidence feeds. */
  flipH: boolean
}

export function createLayer(id: string, sourceId: string, patch: Partial<Layer> = {}): Layer {
  return {
    id,
    sourceId,
    rect: { ...FULL_FRAME },
    opacity: 1,
    fit: 'cover',
    visible: true,
    color: { ...NEUTRAL_COLOR },
    cornerRadius: 0,
    flipH: false,
    ...patch,
  }
}

/** An ordered layer stack that can be assigned to preview or program. */
export interface Scene {
  id: string
  name: string
  layers: Layer[]
}

export function createScene(id: string, name: string, layers: Layer[] = []): Scene {
  return { id, name, layers }
}

// ─── Transitions ─────────────────────────────────────────────────────────────

export type TransitionKind =
  /** Instant. No interpolation. */
  | 'cut'
  /** Cross-dissolve. */
  | 'fade'
  /** Fade through a solid colour (usually black) — the "dip". */
  | 'dip'
  /** Hard-edged directional wipe. */
  | 'wipe'
  /** Incoming scene slides over the outgoing one. */
  | 'slide'

export type WipeDirection = 'left' | 'right' | 'up' | 'down'

export interface TransitionSpec {
  kind: TransitionKind
  /** Milliseconds. Ignored for 'cut'. */
  durationMs: number
  direction: WipeDirection
  /** Softness of a wipe's edge, in normalised units. 0 = hard edge. */
  softness: number
  /** RGB 0..1 for 'dip'. */
  dipColor: [number, number, number]
}

export const DEFAULT_TRANSITION: TransitionSpec = {
  kind: 'fade',
  durationMs: 500,
  direction: 'right',
  softness: 0.02,
  dipColor: [0, 0, 0],
}

// ─── Compositor configuration ────────────────────────────────────────────────

export interface CompositorConfig {
  width: number
  height: number
  /** Target render rate. The compositor never renders faster than this. */
  fps: number
}

export const DEFAULT_CONFIG: CompositorConfig = {
  width: 1920,
  height: 1080,
  fps: 60,
}

/** Live render statistics — real numbers, surfaced to the UI health widgets. */
export interface CompositorStats {
  /** Frames actually rendered in the last second. */
  fps: number
  /** Mean GPU+CPU time per frame in ms over the last second. */
  frameTimeMs: number
  /** Frames skipped because the previous frame was still in flight. */
  droppedFrames: number
  /** Number of textures currently uploaded each frame. */
  activeSources: number
}
