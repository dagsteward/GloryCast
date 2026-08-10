// GloryCast media-engine — public surface.
//
// The renderer app should import from here only; the gl/ internals are an
// implementation detail and may change without notice.

export {
  Compositor,
  fitTextureRect,
  type CompositorEvents,
} from './Compositor.js'

export {
  AudioMixer,
  MIN_DB,
  type ChannelLevels,
  type ChannelState,
} from './AudioMixer.js'

export {
  TextRenderer,
  DEFAULT_TEXT_STYLE,
  type Legibility,
  type RenderOptions,
  type SlideContent,
  type SlidePosition,
  type TextAlign,
  type TextStyle,
} from './TextRenderer.js'

export {
  createLayer,
  createScene,
  DEFAULT_CONFIG,
  DEFAULT_TRANSITION,
  FULL_FRAME,
  NEUTRAL_COLOR,
  type ColorAdjust,
  type CompositorConfig,
  type CompositorStats,
  type FitMode,
  type Layer,
  type Rect,
  type Scene,
  type TextureSource,
  type TransitionKind,
  type TransitionSpec,
  type WipeDirection,
} from './types.js'
