/**
 * Compositor bench — a throwaway harness that exercises the GPU compositor
 * without needing cameras, Electron, or the full app. Used to verify layers,
 * fit modes, transitions and text rendering actually paint.
 */
import {
  Compositor,
  TextRenderer,
  createLayer,
  createScene,
  type TransitionKind,
} from '@glorycast/media-engine'

/** Animated colour-field source, so we can see motion and transitions clearly. */
function makeSource(label: string, hue: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = 1280
  canvas.height = 720
  const ctx = canvas.getContext('2d')!
  let t = 0

  const draw = () => {
    t += 0.01
    const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
    g.addColorStop(0, `hsl(${hue}, 65%, ${28 + Math.sin(t) * 8}%)`)
    g.addColorStop(1, `hsl(${hue + 40}, 70%, 16%)`)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Moving puck proves frames are actually updating on the GPU.
    const x = canvas.width / 2 + Math.cos(t * 2) * 380
    const y = canvas.height / 2 + Math.sin(t * 3) * 180
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.beginPath()
    ctx.arc(x, y, 40, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#fff'
    ctx.font = 'bold 72px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, canvas.width / 2, canvas.height / 2)

    requestAnimationFrame(draw)
  }
  draw()
  return canvas
}

const pgmCanvas = document.getElementById('pgm') as HTMLCanvasElement
const pvwCanvas = document.getElementById('pvw') as HTMLCanvasElement
const statsEl = document.getElementById('stats') as HTMLPreElement
const ctlEl = document.getElementById('ctl') as HTMLDivElement

const compositor = new Compositor(pgmCanvas, { width: 1920, height: 1080, fps: 60 })
compositor.attachPreviewCanvas(pvwCanvas)

compositor.registerSource('cam1', makeSource('CAM 1', 210))
compositor.registerSource('cam2', makeSource('CAM 2', 340))
compositor.registerSource('cam3', makeSource('CAM 3', 130))

// Scripture lower third, rendered through the text engine and composited as a
// normal layer over the camera.
const text = new TextRenderer(1920, 1080)
text.render(
  {
    body: 'And we know that in all things God works for the good of those who love him, who have been called according to his purpose.',
    attribution: 'Romans 8:28',
    badge: 'NIV',
  },
  { position: 'lower-third' },
)
compositor.registerSource('scripture', text.canvas)

const sceneA = createScene('a', 'Camera 1', [createLayer('l1', 'cam1')])
const sceneB = createScene('b', 'Camera 2', [createLayer('l1', 'cam2')])
const sceneC = createScene('c', 'Cam 1 + Scripture', [
  createLayer('l1', 'cam1'),
  createLayer('l2', 'scripture'),
])
const sceneD = createScene('d', 'Cam 2 + PiP', [
  createLayer('l1', 'cam2'),
  createLayer('l2', 'cam3', {
    rect: { x: 0.64, y: 0.06, width: 0.3, height: 0.3 * (9 / 16) },
    cornerRadius: 0.06,
  }),
])

compositor.setProgramScene(sceneA)
compositor.setPreviewScene(sceneB)
compositor.start()

compositor.on('stats', (s) => {
  statsEl.textContent = JSON.stringify(
    { ...s, program: compositor.getProgramScene()?.name, preview: compositor.getPreviewScene()?.name },
    null,
    2,
  )
})
compositor.on('error', (e) => {
  statsEl.textContent = `COMPOSITOR ERROR: ${e.message}`
})

function button(label: string, onClick: () => void) {
  const b = document.createElement('button')
  b.textContent = label
  b.onclick = onClick
  ctlEl.appendChild(b)
}

for (const scene of [sceneA, sceneB, sceneC, sceneD]) {
  button(`PVW → ${scene.name}`, () => compositor.setPreviewScene(scene))
}
button('CUT', () => compositor.cut())
for (const kind of ['fade', 'dip', 'wipe', 'slide'] as TransitionKind[]) {
  button(kind.toUpperCase(), () => compositor.take({ kind, durationMs: 900 }))
}

// Expose for scripted inspection from the browser tools.
;(window as unknown as Record<string, unknown>).__compositor = compositor
