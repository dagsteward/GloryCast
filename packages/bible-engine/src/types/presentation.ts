import type { VerseRef } from './bible.js'

export interface BackgroundConfig {
  type: 'color' | 'image' | 'video' | 'gradient'
  value: string
  brightness?: number      // 0–200, default 100
  contrast?: number
  saturation?: number
  blur?: number
  opacity?: number
  animation?: 'none' | 'pan' | 'zoom' | 'fade'
}

export interface FontConfig {
  family: string
  size: number
  weight?: number          // 100–900
  style?: 'normal' | 'italic'
  lineHeight?: number
  letterSpacing?: number
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize'
}

export interface ShadowConfig {
  enabled: boolean
  color: string
  blur: number
  offsetX: number
  offsetY: number
}

export interface GlowConfig {
  enabled: boolean
  color: string
  blur: number
  spread?: number
}

export interface OutlineConfig {
  enabled: boolean
  color: string
  width: number
}

export interface BibleTheme {
  id: string
  name: string
  thumbnail?: string       // path to .jpg preview
  verseFont: FontConfig
  referenceFont: FontConfig
  background?: BackgroundConfig
  textColor: string
  referenceColor: string
  shadow?: ShadowConfig
  glow?: GlowConfig
  outline?: OutlineConfig
  padding?: number
  alignment?: 'left' | 'center' | 'right'
  verticalAlignment?: 'top' | 'middle' | 'bottom'
  maxLines?: number
  autoFontSize?: boolean
  animationIn?: string
  animationOut?: string
}

export interface VerseSlide {
  id: string
  ref: VerseRef
  text: string
  reference: string        // "John 3:16 (KJV)"
  translation: string
  theme: BibleTheme
  background?: BackgroundConfig
  duration?: number        // ms to display
  lowerThirdOnly?: boolean // show as lower-third instead of full screen
}

export interface LowerThird {
  ref: VerseRef
  text: string
  reference: string
  style?: 'standard' | 'minimal' | 'cinematic' | 'broadcast'
  position?: 'bottom' | 'top'
  backgroundColor?: string
  textColor?: string
  accentColor?: string
  showAnimation?: boolean
}

export interface DisplayTarget {
  id: number
  name: string
  enabled: boolean
  resolution: { width: number; height: number }
  theme?: string
  background?: BackgroundConfig
  isNDI?: boolean
  ndiName?: string
}

export interface PresentationState {
  activeSlide: VerseSlide | null
  nextSlide: VerseSlide | null
  isLive: boolean
  isBlack: boolean
  isClear: boolean
  currentTheme: string
  targets: DisplayTarget[]
}
