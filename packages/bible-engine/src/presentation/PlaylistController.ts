import type { VerseList, VerseListItem } from '../types/features.js'
import type { BibleVerse } from '../types/bible.js'
import type { BibDatabase } from '../readers/MdbReader.js'
import { getVerse } from '../readers/MdbReader.js'
import { ThemeManager } from './ThemeManager.js'

export type PlaylistEvent = 'slide' | 'next' | 'prev' | 'start' | 'stop' | 'loop' | 'end'
type EventCallback = (item: VerseListItem, verse: BibleVerse | null, index: number) => void

export class PlaylistController {
  private list: VerseList | null = null
  private currentIndex = 0
  private playing = false
  private timer: ReturnType<typeof setInterval> | null = null
  private order: number[] = []
  private callbacks = new Map<PlaylistEvent, EventCallback[]>()

  constructor(
    private databases: Map<string, BibDatabase>,
    private defaultTranslation = 'KJV',
    private themeManager: ThemeManager = new ThemeManager(),
  ) {}

  load(list: VerseList): void {
    this.stop()
    this.list = list
    this.currentIndex = 0
    this.order = this.buildOrder(list)
  }

  private buildOrder(list: VerseList): number[] {
    const indices = list.items.map((_, i) => i)
    if (list.random) {
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[indices[i], indices[j]] = [indices[j], indices[i]]
      }
    }
    return indices
  }

  play(): void {
    if (!this.list || this.playing) return
    this.playing = true
    this.emit('start')
    this.showCurrent()

    const interval = this.list.defaultDisplayTime ?? 15_000
    this.timer = setInterval(() => this.advance(), interval)
  }

  pause(): void {
    if (!this.playing) return
    this.playing = false
    if (this.timer) { clearInterval(this.timer); this.timer = null }
  }

  stop(): void {
    this.pause()
    this.currentIndex = 0
    this.emit('stop')
  }

  next(): void {
    this.advance()
  }

  prev(): void {
    if (!this.list) return
    if (this.currentIndex > 0) {
      this.currentIndex--
    } else if (this.list.loop) {
      this.currentIndex = this.order.length - 1
    }
    this.showCurrent()
    this.emit('prev')
  }

  jumpTo(index: number): void {
    if (!this.list || index < 0 || index >= this.list.items.length) return
    this.currentIndex = this.order.indexOf(index)
    if (this.currentIndex < 0) this.currentIndex = index
    this.showCurrent()
  }

  get isPlaying(): boolean { return this.playing }
  get currentItemIndex(): number { return this.order[this.currentIndex] ?? 0 }
  get currentItem(): VerseListItem | null { return this.list?.items[this.currentItemIndex] ?? null }
  get totalItems(): number { return this.list?.items.length ?? 0 }

  getCurrentVerse(): BibleVerse | null {
    const item = this.currentItem
    if (!item) return null
    const db = this.databases.get(this.defaultTranslation) ?? [...this.databases.values()][0]
    if (!db) return null
    return getVerse(db, item.ref.book, item.ref.chapter, item.ref.verse)
  }

  on(event: PlaylistEvent, cb: EventCallback): void {
    if (!this.callbacks.has(event)) this.callbacks.set(event, [])
    this.callbacks.get(event)!.push(cb)
  }

  off(event: PlaylistEvent, cb: EventCallback): void {
    const cbs = this.callbacks.get(event)
    if (cbs) {
      const i = cbs.indexOf(cb)
      if (i >= 0) cbs.splice(i, 1)
    }
  }

  private advance(): void {
    if (!this.list) return
    if (this.currentIndex < this.order.length - 1) {
      this.currentIndex++
      this.showCurrent()
      this.emit('next')
    } else if (this.list.loop) {
      this.currentIndex = 0
      if (this.list.random) this.order = this.buildOrder(this.list)
      this.showCurrent()
      this.emit('loop')
    } else {
      this.pause()
      this.emit('end')
    }
  }

  private showCurrent(): void {
    const item = this.currentItem
    if (!item) return
    const verse = this.getCurrentVerse()
    this.emit('slide', item, verse, this.currentItemIndex)
  }

  private emit(event: PlaylistEvent, item?: VerseListItem, verse?: BibleVerse | null, index?: number): void {
    const cbs = this.callbacks.get(event) ?? []
    for (const cb of cbs) cb(item ?? (this.currentItem ?? {} as VerseListItem), verse ?? null, index ?? this.currentItemIndex)
  }
}
