// ─────────────────────────────────────────────────────────────────────────────
// Thin WebGL2 wrapper: program compilation, a shared unit-quad VAO, ping-pong
// render targets, and video-frame texture upload.
//
// Everything here is stateless plumbing. The compositing *policy* lives in
// Compositor.ts.
// ─────────────────────────────────────────────────────────────────────────────

export class ShaderError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ShaderError'
  }
}

/** A compiled program plus a lazily-populated uniform location cache. */
export class Program {
  private readonly locations = new Map<string, WebGLUniformLocation | null>()

  constructor(
    private readonly gl: WebGL2RenderingContext,
    readonly handle: WebGLProgram,
  ) {}

  use(): void {
    this.gl.useProgram(this.handle)
  }

  /**
   * Uniform locations are looked up once and cached. A missing uniform returns
   * null and every setter below no-ops on it, so a shader that optimises away
   * an unused uniform doesn't throw at runtime.
   */
  private loc(name: string): WebGLUniformLocation | null {
    let l = this.locations.get(name)
    if (l === undefined) {
      l = this.gl.getUniformLocation(this.handle, name)
      this.locations.set(name, l)
    }
    return l
  }

  setFloat(name: string, v: number): void {
    const l = this.loc(name)
    if (l) this.gl.uniform1f(l, v)
  }

  setInt(name: string, v: number): void {
    const l = this.loc(name)
    if (l) this.gl.uniform1i(l, v)
  }

  setBool(name: string, v: boolean): void {
    const l = this.loc(name)
    if (l) this.gl.uniform1i(l, v ? 1 : 0)
  }

  setVec2(name: string, x: number, y: number): void {
    const l = this.loc(name)
    if (l) this.gl.uniform2f(l, x, y)
  }

  setVec3(name: string, x: number, y: number, z: number): void {
    const l = this.loc(name)
    if (l) this.gl.uniform3f(l, x, y, z)
  }

  setVec4(name: string, x: number, y: number, z: number, w: number): void {
    const l = this.loc(name)
    if (l) this.gl.uniform4f(l, x, y, z, w)
  }

  /** Bind `texture` to `unit` and point the sampler uniform at it. */
  setTexture(name: string, texture: WebGLTexture, unit: number): void {
    const l = this.loc(name)
    if (!l) return
    this.gl.activeTexture(this.gl.TEXTURE0 + unit)
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture)
    this.gl.uniform1i(l, unit)
  }

  dispose(): void {
    this.gl.deleteProgram(this.handle)
    this.locations.clear()
  }
}

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type)
  if (!shader) throw new ShaderError('Failed to allocate shader')

  gl.shaderSource(shader, source)
  gl.compileShader(shader)

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? 'unknown error'
    gl.deleteShader(shader)
    const kind = type === gl.VERTEX_SHADER ? 'vertex' : 'fragment'
    throw new ShaderError(`${kind} shader failed to compile: ${log}`)
  }
  return shader
}

export function createProgram(
  gl: WebGL2RenderingContext,
  vertSource: string,
  fragSource: string,
): Program {
  const vert = compileShader(gl, gl.VERTEX_SHADER, vertSource)
  const frag = compileShader(gl, gl.FRAGMENT_SHADER, fragSource)

  const handle = gl.createProgram()
  if (!handle) throw new ShaderError('Failed to allocate program')

  gl.attachShader(handle, vert)
  gl.attachShader(handle, frag)
  // a_pos is the only attribute in every program; bind it to slot 0 so a single
  // shared VAO works with all of them.
  gl.bindAttribLocation(handle, 0, 'a_pos')
  gl.linkProgram(handle)

  // Shaders are reference-counted by the program; detach immediately so they
  // are freed as soon as the program is deleted.
  gl.detachShader(handle, vert)
  gl.detachShader(handle, frag)
  gl.deleteShader(vert)
  gl.deleteShader(frag)

  if (!gl.getProgramParameter(handle, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(handle) ?? 'unknown error'
    gl.deleteProgram(handle)
    throw new ShaderError(`Program failed to link: ${log}`)
  }

  return new Program(gl, handle)
}

/**
 * A unit-square triangle strip shared by every draw call. Two triangles, four
 * vertices, one VAO — the compositor never allocates geometry per frame.
 */
export function createQuadVAO(gl: WebGL2RenderingContext): WebGLVertexArrayObject {
  const vao = gl.createVertexArray()
  if (!vao) throw new ShaderError('Failed to allocate VAO')

  const buffer = gl.createBuffer()
  gl.bindVertexArray(vao)
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]),
    gl.STATIC_DRAW,
  )
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
  gl.bindVertexArray(null)

  return vao
}

/**
 * An offscreen colour buffer a scene renders into. Scenes are composited into
 * these so transitions can blend two complete frames.
 */
export class RenderTarget {
  readonly framebuffer: WebGLFramebuffer
  readonly texture: WebGLTexture

  constructor(
    private readonly gl: WebGL2RenderingContext,
    public width: number,
    public height: number,
  ) {
    const texture = gl.createTexture()
    const framebuffer = gl.createFramebuffer()
    if (!texture || !framebuffer) throw new ShaderError('Failed to allocate render target')

    this.texture = texture
    this.framebuffer = framebuffer

    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    // CLAMP_TO_EDGE matters for slide transitions: sampling past the edge must
    // not wrap the frame around.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)

    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      throw new ShaderError(`Render target incomplete (0x${status.toString(16)})`)
    }
  }

  bind(): void {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer)
    this.gl.viewport(0, 0, this.width, this.height)
  }

  resize(width: number, height: number): void {
    if (width === this.width && height === this.height) return
    this.width = width
    this.height = height
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture)
    this.gl.texImage2D(
      this.gl.TEXTURE_2D, 0, this.gl.RGBA8, width, height, 0,
      this.gl.RGBA, this.gl.UNSIGNED_BYTE, null,
    )
  }

  dispose(): void {
    this.gl.deleteFramebuffer(this.framebuffer)
    this.gl.deleteTexture(this.texture)
  }
}

/**
 * Wraps a live source (video/image/canvas) as a GPU texture, re-uploading only
 * when the source has actually produced a new frame.
 */
export class SourceTexture {
  readonly texture: WebGLTexture
  /** Natural pixel dimensions of the most recent upload; 0 until first frame. */
  width = 0
  height = 0

  private lastVideoTime = -1
  private uploaded = false

  constructor(private readonly gl: WebGL2RenderingContext) {
    const texture = gl.createTexture()
    if (!texture) throw new ShaderError('Failed to allocate texture')
    this.texture = texture

    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  }

  /** True once at least one frame has been uploaded and the texture is drawable. */
  get ready(): boolean {
    return this.uploaded && this.width > 0 && this.height > 0
  }

  /**
   * Upload the source's current frame. Returns false if the source has no new
   * pixels to give (not yet loaded, or the video hasn't advanced), letting the
   * caller reuse whatever is already on the GPU.
   */
  update(source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement | ImageBitmap): boolean {
    const gl = this.gl

    let w = 0
    let h = 0

    if (source instanceof HTMLVideoElement) {
      // HAVE_CURRENT_DATA — anything less and the frame is not yet decodable.
      if (source.readyState < 2) return false
      // Skip redundant uploads while the video is paused or between frames.
      if (source.currentTime === this.lastVideoTime && this.uploaded) return false
      this.lastVideoTime = source.currentTime
      w = source.videoWidth
      h = source.videoHeight
    } else if (source instanceof HTMLImageElement) {
      if (!source.complete) return false
      // A still image only needs one upload, ever.
      if (this.uploaded) return true
      w = source.naturalWidth
      h = source.naturalHeight
    } else {
      w = source.width
      h = source.height
    }

    if (w === 0 || h === 0) return false

    gl.bindTexture(gl.TEXTURE_2D, this.texture)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)

    this.width = w
    this.height = h
    this.uploaded = true
    return true
  }

  dispose(): void {
    this.gl.deleteTexture(this.texture)
  }
}
