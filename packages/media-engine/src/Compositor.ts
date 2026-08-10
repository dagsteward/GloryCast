// ─────────────────────────────────────────────────────────────────────────────
// Compositor — the heart of GloryCast's program output.
//
// Owns a WebGL2 canvas that IS the program frame. Everything the audience sees
// is rendered here, which means:
//   • one canvas to captureStream() into the encoder,
//   • one place transitions happen,
//   • preview and program are guaranteed to look identical, because they run
//     through the same code path.
//
// Frame flow each tick:
//   1. upload every source texture referenced by the live scenes
//   2. render the program scene into target A
//   3. if a transition is running, render the incoming scene into target B
//      and blend A -> B by progress; otherwise copy A straight out
//   4. present to the canvas
// ─────────────────────────────────────────────────────────────────────────────

import {
  createProgram,
  createQuadVAO,
  Program,
  RenderTarget,
  SourceTexture,
} from './gl/GLContext.js'
import { BLEND_FRAG, COPY_FRAG, LAYER_FRAG, QUAD_VERT } from './gl/shaders.js'
import {
  DEFAULT_CONFIG,
  DEFAULT_TRANSITION,
  FULL_FRAME,
  type CompositorConfig,
  type CompositorStats,
  type FitMode,
  type Layer,
  type Rect,
  type Scene,
  type TextureSource,
  type TransitionSpec,
  type WipeDirection,
} from './types.js'

const MODE_INDEX: Record<TransitionSpec['kind'], number> = {
  cut: 0, fade: 0, dip: 1, wipe: 2, slide: 3,
}

const DIRECTION_INDEX: Record<WipeDirection, number> = {
  left: 0, right: 1, up: 2, down: 3,
}

/** Preview readback resolution. Small on purpose — see renderPreviewInto(). */
const PREVIEW_WIDTH = 480
const PREVIEW_HEIGHT = 270
const PREVIEW_INTERVAL_MS = 1000 / 15

export interface CompositorEvents {
  /** A take/auto-transition finished and program now shows the new scene. */
  transitionEnd: (sceneId: string) => void
  /** Fired once per second with fresh render statistics. */
  stats: (stats: CompositorStats) => void
  /** Unrecoverable GL failure — the app should fall back to a static slate. */
  error: (error: Error) => void
}

export class Compositor {
  readonly canvas: HTMLCanvasElement
  readonly config: CompositorConfig

  private gl: WebGL2RenderingContext
  private vao: WebGLVertexArrayObject
  private layerProgram: Program
  private blendProgram: Program
  private copyProgram: Program

  /** Ping-pong targets: `from` holds the outgoing scene, `to` the incoming. */
  private fromTarget: RenderTarget
  private toTarget: RenderTarget
  private previewTarget: RenderTarget

  private readonly sources = new Map<string, TextureSource>()
  private readonly textures = new Map<string, SourceTexture>()

  private programScene: Scene | null = null
  private previewScene: Scene | null = null

  /** Non-null only while a transition is animating. */
  private transition: {
    spec: TransitionSpec
    incoming: Scene
    startedAt: number
  } | null = null

  private rafHandle = 0
  private timerHandle: ReturnType<typeof setTimeout> | null = null
  private usingTimer = false
  private detachVisibility: (() => void) | null = null
  private running = false
  private lastFrameAt = 0
  private disposed = false

  // Statistics accumulators, flushed once a second.
  private framesThisSecond = 0
  private frameTimeAccum = 0
  private droppedFrames = 0
  private statsWindowStart = 0

  // Preview readback scratch, reused to avoid per-frame allocation.
  private previewPixels = new Uint8Array(PREVIEW_WIDTH * PREVIEW_HEIGHT * 4)
  private previewImage: ImageData | null = null
  private lastPreviewAt = 0

  private readonly listeners: {
    [K in keyof CompositorEvents]: Set<CompositorEvents[K]>
  } = { transitionEnd: new Set(), stats: new Set(), error: new Set() }

  constructor(canvas?: HTMLCanvasElement, config: Partial<CompositorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.canvas = canvas ?? document.createElement('canvas')
    this.canvas.width = this.config.width
    this.canvas.height = this.config.height

    const gl = this.canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      // The encoder reads this canvas via captureStream, which samples after
      // compositing — without this the browser may clear before we're read.
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
      desynchronized: true,
    })
    if (!gl) {
      throw new Error(
        'WebGL2 is unavailable. GloryCast requires a GPU with WebGL2 support for program output.',
      )
    }
    this.gl = gl

    this.vao = createQuadVAO(gl)
    this.layerProgram = createProgram(gl, QUAD_VERT, LAYER_FRAG)
    this.blendProgram = createProgram(gl, QUAD_VERT, BLEND_FRAG)
    this.copyProgram = createProgram(gl, QUAD_VERT, COPY_FRAG)

    this.fromTarget = new RenderTarget(gl, this.config.width, this.config.height)
    this.toTarget = new RenderTarget(gl, this.config.width, this.config.height)
    this.previewTarget = new RenderTarget(gl, PREVIEW_WIDTH, PREVIEW_HEIGHT)

    // Layers are drawn premultiplied, so this is the correct blend function.
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
  }

  // ─── Events ────────────────────────────────────────────────────────────────

  on<K extends keyof CompositorEvents>(event: K, handler: CompositorEvents[K]): () => void {
    this.listeners[event].add(handler as never)
    return () => { this.listeners[event].delete(handler as never) }
  }

  private emit<K extends keyof CompositorEvents>(
    event: K,
    ...args: Parameters<CompositorEvents[K]>
  ): void {
    for (const handler of this.listeners[event]) {
      try {
        ;(handler as (...a: unknown[]) => void)(...args)
      } catch (err) {
        // A throwing listener must never take down the render loop.
        console.error(`[Compositor] listener for "${event}" threw:`, err)
      }
    }
  }

  // ─── Sources ───────────────────────────────────────────────────────────────

  /**
   * Register a live source under `id`. Layers reference sources by this id, so
   * a source can be swapped underneath a scene (e.g. a camera reconnecting)
   * without touching the scene graph.
   */
  registerSource(id: string, source: TextureSource): void {
    this.sources.set(id, source)
    if (!this.textures.has(id)) {
      this.textures.set(id, new SourceTexture(this.gl))
    }
  }

  unregisterSource(id: string): void {
    this.sources.delete(id)
    this.textures.get(id)?.dispose()
    this.textures.delete(id)
  }

  hasSource(id: string): boolean {
    return this.sources.has(id)
  }

  // ─── Scenes ────────────────────────────────────────────────────────────────

  /** Replace the program scene immediately, with no transition. */
  setProgramScene(scene: Scene | null): void {
    this.programScene = scene
  }

  setPreviewScene(scene: Scene | null): void {
    this.previewScene = scene
  }

  getProgramScene(): Scene | null {
    return this.programScene
  }

  getPreviewScene(): Scene | null {
    return this.previewScene
  }

  /** True while a transition is animating — the UI disables TAKE during this. */
  get isTransitioning(): boolean {
    return this.transition !== null
  }

  /**
   * Promote the preview scene to program using `spec`. This is the TAKE button.
   * A take requested mid-transition is ignored rather than queued: in a live
   * service, a double-punched take should do nothing, not fire twice.
   */
  take(spec: Partial<TransitionSpec> = {}): void {
    if (!this.previewScene || this.transition) return

    const full: TransitionSpec = { ...DEFAULT_TRANSITION, ...spec }
    const incoming = this.previewScene

    if (full.kind === 'cut' || full.durationMs <= 0) {
      this.cut()
      return
    }

    this.transition = { spec: full, incoming, startedAt: performance.now() }
  }

  /** Hard cut: preview becomes program instantly, and they swap places. */
  cut(): void {
    if (!this.previewScene) return
    const outgoing = this.programScene
    this.programScene = this.previewScene
    this.previewScene = outgoing
    this.transition = null
    this.emit('transitionEnd', this.programScene.id)
  }

  // ─── Render loop ───────────────────────────────────────────────────────────

  start(): void {
    if (this.running || this.disposed) return
    this.running = true
    this.statsWindowStart = performance.now()
    this.lastFrameAt = 0

    // A live switcher must keep compositing when its window is minimised, sent
    // to another desktop, or covered — the congregation and the stream are
    // still watching. requestAnimationFrame is suspended entirely while the
    // document is hidden, so we swap to a timer-driven loop in that case and
    // swap back when the window returns. (Electron must ALSO be configured
    // with webPreferences.backgroundThrottling = false, or its timers get
    // clamped to 1Hz for the same reason.)
    const onVisibilityChange = () => {
      if (!this.running) return
      this.selectDriver()
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibilityChange)
      this.detachVisibility = () =>
        document.removeEventListener('visibilitychange', onVisibilityChange)
    }

    this.selectDriver()
  }

  /** Start (or restart) the loop on whichever clock suits the current state. */
  private selectDriver(): void {
    const shouldUseTimer = typeof document !== 'undefined' && document.hidden

    if (shouldUseTimer === this.usingTimer && (this.rafHandle || this.timerHandle)) return

    this.clearDriver()
    this.usingTimer = shouldUseTimer

    if (shouldUseTimer) {
      const interval = 1000 / this.config.fps
      const tick = () => {
        if (!this.running) return
        this.timerHandle = setTimeout(tick, interval)
        this.frame()
      }
      this.timerHandle = setTimeout(tick, interval)
    } else {
      const tick = () => {
        if (!this.running) return
        this.rafHandle = requestAnimationFrame(tick)
        this.frame()
      }
      this.rafHandle = requestAnimationFrame(tick)
    }
  }

  private clearDriver(): void {
    if (this.rafHandle) cancelAnimationFrame(this.rafHandle)
    if (this.timerHandle) clearTimeout(this.timerHandle)
    this.rafHandle = 0
    this.timerHandle = null
  }

  stop(): void {
    this.running = false
    this.clearDriver()
    this.detachVisibility?.()
    this.detachVisibility = null
  }

  private frame(): void {
    const now = performance.now()

    // Frame pacing: rAF runs at display rate, which may exceed the configured
    // output rate (120Hz+ monitors are common). Rendering faster than the
    // encoder consumes is wasted GPU, so we gate on the frame interval.
    const interval = 1000 / this.config.fps
    if (this.lastFrameAt && now - this.lastFrameAt < interval - 0.5) return
    if (this.lastFrameAt && now - this.lastFrameAt > interval * 2) {
      this.droppedFrames += Math.floor((now - this.lastFrameAt) / interval) - 1
    }
    this.lastFrameAt = now

    try {
      this.uploadSources()
      this.renderProgram(now)
      this.renderPreview(now)
    } catch (err) {
      this.stop()
      this.emit('error', err instanceof Error ? err : new Error(String(err)))
      return
    }

    this.framesThisSecond++
    this.frameTimeAccum += performance.now() - now

    if (now - this.statsWindowStart >= 1000) {
      const elapsed = (now - this.statsWindowStart) / 1000
      this.emit('stats', {
        fps: Math.round(this.framesThisSecond / elapsed),
        frameTimeMs: this.framesThisSecond
          ? +(this.frameTimeAccum / this.framesThisSecond).toFixed(2)
          : 0,
        droppedFrames: this.droppedFrames,
        activeSources: this.sources.size,
      })
      this.framesThisSecond = 0
      this.frameTimeAccum = 0
      this.droppedFrames = 0
      this.statsWindowStart = now
    }
  }

  /**
   * Upload one frame per source per tick. Sources are uploaded once even if
   * several layers (program + preview + a PiP) reference them.
   */
  private uploadSources(): void {
    for (const [id, source] of this.sources) {
      this.textures.get(id)?.update(source)
    }
  }

  private renderProgram(now: number): void {
    const gl = this.gl
    gl.bindVertexArray(this.vao)

    // Outgoing (or steady-state) scene.
    this.drawScene(this.programScene, this.fromTarget)

    if (!this.transition) {
      this.present(this.fromTarget)
      return
    }

    const { spec, incoming, startedAt } = this.transition
    const raw = (now - startedAt) / spec.durationMs
    const progress = Math.min(1, Math.max(0, raw))

    this.drawScene(incoming, this.toTarget)
    this.presentBlend(spec, progress)

    if (progress >= 1) {
      // Swap: the scene that just arrived is program, and what was program
      // drops back to preview so the operator can cut back to it.
      const outgoing = this.programScene
      this.programScene = incoming
      if (this.previewScene === incoming) this.previewScene = outgoing
      this.transition = null
      this.emit('transitionEnd', incoming.id)
    }
  }

  /** Render one scene's layer stack into `target`. */
  private drawScene(scene: Scene | null, target: RenderTarget): void {
    const gl = this.gl
    target.bind()
    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)

    if (!scene) return

    this.layerProgram.use()

    for (const layer of scene.layers) {
      if (!layer.visible || layer.opacity <= 0) continue

      const texture = this.textures.get(layer.sourceId)
      if (!texture?.ready) continue

      this.drawLayer(layer, texture, target)
    }
  }

  private drawLayer(layer: Layer, texture: SourceTexture, target: RenderTarget): void {
    const p = this.layerProgram
    const rect = layer.rect

    p.setVec4('u_rect', rect.x, rect.y, rect.width, rect.height)

    const texRect = fitTextureRect(
      layer.fit,
      texture.width,
      texture.height,
      rect.width * target.width,
      rect.height * target.height,
    )
    p.setVec4('u_texRect', texRect.x, texRect.y, texRect.width, texRect.height)

    p.setBool('u_flipH', layer.flipH)
    p.setFloat('u_opacity', layer.opacity)
    p.setFloat('u_brightness', layer.color.brightness)
    p.setFloat('u_contrast', layer.color.contrast)
    p.setFloat('u_saturation', layer.color.saturation)
    p.setFloat('u_cornerRadius', layer.cornerRadius)
    p.setVec2('u_rectAspect', rect.width * target.width, rect.height * target.height)
    p.setTexture('u_tex', texture.texture, 0)

    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4)
  }

  /** Copy a finished scene target to the visible canvas. */
  private present(target: RenderTarget): void {
    const gl = this.gl
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, this.canvas.width, this.canvas.height)
    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)

    this.copyProgram.use()
    this.copyProgram.setVec4('u_rect', FULL_FRAME.x, FULL_FRAME.y, FULL_FRAME.width, FULL_FRAME.height)
    this.copyProgram.setVec4('u_texRect', 0, 0, 1, 1)
    this.copyProgram.setBool('u_flipH', false)
    this.copyProgram.setTexture('u_tex', target.texture, 0)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  /** Composite the two scene targets through the transition shader. */
  private presentBlend(spec: TransitionSpec, progress: number): void {
    const gl = this.gl
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, this.canvas.width, this.canvas.height)

    const p = this.blendProgram
    p.use()
    p.setVec4('u_rect', FULL_FRAME.x, FULL_FRAME.y, FULL_FRAME.width, FULL_FRAME.height)
    p.setVec4('u_texRect', 0, 0, 1, 1)
    p.setBool('u_flipH', false)
    p.setFloat('u_progress', progress)
    p.setInt('u_mode', MODE_INDEX[spec.kind])
    p.setInt('u_direction', DIRECTION_INDEX[spec.direction])
    p.setFloat('u_softness', Math.max(0.0001, spec.softness))
    p.setVec3('u_dipColor', spec.dipColor[0], spec.dipColor[1], spec.dipColor[2])
    p.setTexture('u_from', this.fromTarget.texture, 0)
    p.setTexture('u_to', this.toTarget.texture, 1)

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  // ─── Preview output ────────────────────────────────────────────────────────

  /**
   * Attach a 2D canvas that receives the composed *preview* scene.
   *
   * Preview is deliberately cheap: 480x270 at 15fps, read back with readPixels.
   * A GPU readback stalls the pipeline, so this trades preview smoothness for
   * program smoothness — the right call, since program is what the congregation
   * and the stream actually see. Pass null to detach.
   */
  private previewCanvas: HTMLCanvasElement | null = null

  attachPreviewCanvas(canvas: HTMLCanvasElement | null): void {
    this.previewCanvas = canvas
    if (canvas) {
      canvas.width = PREVIEW_WIDTH
      canvas.height = PREVIEW_HEIGHT
    }
  }

  private renderPreview(now: number): void {
    if (!this.previewCanvas) return
    if (now - this.lastPreviewAt < PREVIEW_INTERVAL_MS) return
    this.lastPreviewAt = now

    const gl = this.gl
    this.drawScene(this.previewScene, this.previewTarget)

    this.previewTarget.bind()
    gl.readPixels(
      0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT,
      gl.RGBA, gl.UNSIGNED_BYTE, this.previewPixels,
    )

    const ctx = this.previewCanvas.getContext('2d')
    if (!ctx) return

    if (!this.previewImage) {
      this.previewImage = ctx.createImageData(PREVIEW_WIDTH, PREVIEW_HEIGHT)
    }

    // readPixels returns rows bottom-up; flip into the ImageData buffer.
    const dst = this.previewImage.data
    const rowBytes = PREVIEW_WIDTH * 4
    for (let y = 0; y < PREVIEW_HEIGHT; y++) {
      const srcOffset = (PREVIEW_HEIGHT - 1 - y) * rowBytes
      dst.set(this.previewPixels.subarray(srcOffset, srcOffset + rowBytes), y * rowBytes)
    }
    ctx.putImageData(this.previewImage, 0, 0)
  }

  // ─── Output capture ────────────────────────────────────────────────────────

  /**
   * Capture the program canvas as a MediaStream for the encoder. Requested at
   * 0fps so frames are pushed by our render loop rather than pulled on an
   * independent clock — this keeps encoder timestamps aligned with composition.
   */
  captureProgramStream(fps = this.config.fps): MediaStream {
    return this.canvas.captureStream(fps)
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  /** Change output resolution. Scenes are normalised, so nothing else moves. */
  resize(width: number, height: number): void {
    this.config.width = width
    this.config.height = height
    this.canvas.width = width
    this.canvas.height = height
    this.fromTarget.resize(width, height)
    this.toTarget.resize(width, height)
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.stop()

    for (const texture of this.textures.values()) texture.dispose()
    this.textures.clear()
    this.sources.clear()

    this.fromTarget.dispose()
    this.toTarget.dispose()
    this.previewTarget.dispose()
    this.layerProgram.dispose()
    this.blendProgram.dispose()
    this.copyProgram.dispose()
    this.gl.deleteVertexArray(this.vao)

    for (const set of Object.values(this.listeners)) set.clear()

    // Free the GPU context eagerly rather than waiting for GC — Electron holds
    // onto WebGL contexts aggressively and the limit is low.
    this.gl.getExtension('WEBGL_lose_context')?.loseContext()
  }
}

/**
 * Compute the sub-rectangle of the source texture to sample so the image fills
 * the destination according to `fit`.
 *
 * For 'cover' we shrink the sampled region (crop). For 'contain' we expand it
 * past 0..1, and the fragment shader discards those out-of-range samples,
 * producing letterbox bars that show the layers beneath.
 */
export function fitTextureRect(
  fit: FitMode,
  texWidth: number,
  texHeight: number,
  destWidth: number,
  destHeight: number,
): Rect {
  if (fit === 'stretch' || texWidth === 0 || texHeight === 0 || destWidth === 0 || destHeight === 0) {
    return { x: 0, y: 0, width: 1, height: 1 }
  }

  const texAspect = texWidth / texHeight
  const destAspect = destWidth / destHeight
  // >1 means the source is wider than the destination.
  const ratio = texAspect / destAspect

  if (fit === 'cover') {
    if (ratio > 1) {
      // Source too wide — sample a narrower horizontal slice.
      const w = 1 / ratio
      return { x: (1 - w) / 2, y: 0, width: w, height: 1 }
    }
    const h = ratio
    return { x: 0, y: (1 - h) / 2, width: 1, height: h }
  }

  // contain
  if (ratio > 1) {
    // Source too wide — it must shrink vertically, so sample beyond the edges.
    const h = ratio
    return { x: 0, y: (1 - h) / 2, width: 1, height: h }
  }
  const w = 1 / ratio
  return { x: (1 - w) / 2, y: 0, width: w, height: 1 }
}
