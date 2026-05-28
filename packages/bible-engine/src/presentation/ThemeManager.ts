import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, basename } from 'node:path'
import type { BibleTheme } from '../types/presentation.js'

/** Parse BibleShow .thm theme config files */
function parseThmFile(content: string): Partial<BibleTheme> {
  const lines = content.split(/\r?\n/)
  const props: Record<string, string> = {}
  for (const line of lines) {
    const eq = line.indexOf('=')
    if (eq > 0) {
      props[line.slice(0, eq).trim()] = line.slice(eq + 1).trim()
    }
  }
  return {
    textColor:      props['FontColor']      ?? '#ffffff',
    referenceColor: props['ReferenceColor'] ?? '#cccccc',
    verseFont: {
      family: props['FontName']        ?? 'Inter',
      size:   parseInt(props['FontSize'] ?? '48', 10),
      weight: parseInt(props['FontBold'] === '1' ? '700' : '400'),
      style:  props['FontItalic'] === '1' ? 'italic' : 'normal',
    },
    referenceFont: {
      family: props['ReferenceFontName'] ?? 'Inter',
      size:   parseInt(props['ReferenceFontSize'] ?? '32', 10),
      weight: 600,
    },
    alignment:         (props['Alignment'] as BibleTheme['alignment']) ?? 'center',
    verticalAlignment: (props['VertAlign'] as BibleTheme['verticalAlignment']) ?? 'bottom',
    padding: parseInt(props['Padding'] ?? '48', 10),
    shadow: {
      enabled: props['ShadowEnabled'] === '1',
      color:   props['ShadowColor']  ?? '#000000',
      blur:    parseInt(props['ShadowBlur'] ?? '4', 10),
      offsetX: parseInt(props['ShadowX']    ?? '2', 10),
      offsetY: parseInt(props['ShadowY']    ?? '2', 10),
    },
    outline: {
      enabled: props['OutlineEnabled'] === '1',
      color:   props['OutlineColor']  ?? '#000000',
      width:   parseInt(props['OutlineWidth'] ?? '1', 10),
    },
    glow: {
      enabled: props['GlowEnabled'] === '1',
      color:   props['GlowColor']  ?? '#7c3aed',
      blur:    parseInt(props['GlowBlur'] ?? '8', 10),
    },
    background: props['BackgroundColor'] ? {
      type:  'color',
      value: props['BackgroundColor'],
    } : undefined,
  }
}

const DEFAULT_THEMES: BibleTheme[] = [
  {
    id: 'glorycast-dark',
    name: 'GloryCast Dark',
    textColor: '#ffffff',
    referenceColor: '#a78bfa',
    verseFont: { family: 'Inter', size: 52, weight: 600, lineHeight: 1.3 },
    referenceFont: { family: 'Inter', size: 28, weight: 500 },
    alignment: 'center',
    verticalAlignment: 'bottom',
    padding: 60,
    shadow: { enabled: true, color: '#000000', blur: 8, offsetX: 0, offsetY: 2 },
    glow: { enabled: true, color: '#7c3aed', blur: 20 },
    outline: { enabled: false, color: '#000000', width: 1 },
    background: { type: 'color', value: 'rgba(7,7,9,0.85)' },
  },
  {
    id: 'glorycast-purple',
    name: 'GloryCast Purple',
    textColor: '#ffffff',
    referenceColor: '#f97316',
    verseFont: { family: 'Inter', size: 52, weight: 700, style: 'italic' },
    referenceFont: { family: 'Inter', size: 28, weight: 600 },
    alignment: 'center',
    verticalAlignment: 'bottom',
    padding: 60,
    shadow: { enabled: true, color: '#1e0050', blur: 12, offsetX: 0, offsetY: 3 },
    glow: { enabled: true, color: '#a855f7', blur: 30 },
    outline: { enabled: false, color: '#000000', width: 1 },
    background: { type: 'gradient', value: 'linear-gradient(135deg, rgba(124,58,237,0.9), rgba(17,24,39,0.95))' },
  },
  {
    id: 'lower-third',
    name: 'Lower Third',
    textColor: '#ffffff',
    referenceColor: '#f59e0b',
    verseFont: { family: 'Inter', size: 36, weight: 600 },
    referenceFont: { family: 'Inter', size: 22, weight: 500 },
    alignment: 'left',
    verticalAlignment: 'bottom',
    padding: 40,
    shadow: { enabled: true, color: '#000000', blur: 4, offsetX: 1, offsetY: 1 },
    glow: { enabled: false, color: '#7c3aed', blur: 8 },
    outline: { enabled: false, color: '#000000', width: 1 },
    background: { type: 'color', value: 'rgba(0,0,0,0.75)' },
  },
  {
    id: 'clean-white',
    name: 'Clean White',
    textColor: '#1a1a2e',
    referenceColor: '#7c3aed',
    verseFont: { family: 'Georgia', size: 48, weight: 400, style: 'italic' },
    referenceFont: { family: 'Inter', size: 28, weight: 600 },
    alignment: 'center',
    verticalAlignment: 'middle',
    padding: 80,
    shadow: { enabled: false, color: '#000000', blur: 4, offsetX: 1, offsetY: 1 },
    glow: { enabled: false, color: '#7c3aed', blur: 8 },
    outline: { enabled: false, color: '#000000', width: 1 },
    background: { type: 'color', value: '#f8f8f8' },
  },
]

export class ThemeManager {
  private themes = new Map<string, BibleTheme>(DEFAULT_THEMES.map(t => [t.id, t]))

  /** Load all themes from a BibleShow Themes directory */
  loadFromDirectory(dirPath: string): number {
    if (!existsSync(dirPath)) return 0
    let loaded = 0
    try {
      const files = readdirSync(dirPath)
      for (const file of files) {
        if (!file.endsWith('.thm')) continue
        const id = basename(file, '.thm')
        const jpgPath = join(dirPath, id + '.jpg')
        try {
          const content = readFileSync(join(dirPath, file), 'utf-8')
          const partial = parseThmFile(content)
          const theme: BibleTheme = {
            id,
            name: id.replace(/_\d+$/, '').replace(/_/g, ' '),
            thumbnail: existsSync(jpgPath) ? jpgPath : undefined,
            textColor: '#ffffff',
            referenceColor: '#cccccc',
            verseFont: { family: 'Inter', size: 48 },
            referenceFont: { family: 'Inter', size: 28 },
            alignment: 'center',
            verticalAlignment: 'bottom',
            padding: 60,
            shadow: { enabled: true, color: '#000000', blur: 4, offsetX: 1, offsetY: 1 },
            glow: { enabled: false, color: '#7c3aed', blur: 8 },
            outline: { enabled: false, color: '#000000', width: 1 },
            ...partial,
          }
          this.themes.set(id, theme)
          loaded++
        } catch { /* skip malformed themes */ }
      }
    } catch { /* dir not accessible */ }
    return loaded
  }

  get(id: string): BibleTheme | undefined {
    return this.themes.get(id)
  }

  getAll(): BibleTheme[] {
    return [...this.themes.values()]
  }

  getBuiltIn(): BibleTheme[] {
    return DEFAULT_THEMES
  }

  add(theme: BibleTheme): void {
    this.themes.set(theme.id, theme)
  }

  getDefault(): BibleTheme {
    return DEFAULT_THEMES[0]
  }

  get count(): number {
    return this.themes.size
  }
}
