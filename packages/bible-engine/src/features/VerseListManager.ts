import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import type { VerseList, VerseListItem } from '../types/features.js'
import type { VerseRef } from '../types/bible.js'

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

export class VerseListManager {
  private lists = new Map<string, VerseList>()

  create(name: string, items: VerseListItem[] = []): VerseList {
    const list: VerseList = {
      id: uid(),
      name,
      items,
      loop: false,
      random: false,
      defaultDisplayTime: 15000,
      createdAt: Date.now(),
    }
    this.lists.set(list.id, list)
    return list
  }

  get(id: string): VerseList | undefined {
    return this.lists.get(id)
  }

  getAll(): VerseList[] {
    return [...this.lists.values()]
  }

  addItem(listId: string, item: VerseListItem): boolean {
    const list = this.lists.get(listId)
    if (!list) return false
    list.items.push(item)
    return true
  }

  removeItem(listId: string, index: number): boolean {
    const list = this.lists.get(listId)
    if (!list || index < 0 || index >= list.items.length) return false
    list.items.splice(index, 1)
    return true
  }

  reorder(listId: string, fromIndex: number, toIndex: number): boolean {
    const list = this.lists.get(listId)
    if (!list) return false
    const [item] = list.items.splice(fromIndex, 1)
    list.items.splice(toIndex, 0, item)
    return true
  }

  delete(id: string): boolean {
    return this.lists.delete(id)
  }

  /** Parse a BibleShow .vls verse list file */
  importVls(filePath: string, name?: string): VerseList {
    const content = readFileSync(filePath, 'utf-8')
    const lines = content.split(/\r?\n/).filter(l => l.trim())
    const items: VerseListItem[] = []

    for (const line of lines) {
      // Format: "Book:Chapter:Verse" e.g. "43:4:24"
      const parts = line.trim().split(':')
      if (parts.length >= 3) {
        const [b, c, v] = parts.map(Number)
        if (b && c && v) {
          items.push({ ref: { book: b, chapter: c, verse: v } })
        }
      }
    }

    const listName = name ?? filePath.split(/[\\/]/).pop()?.replace(/\.vls$/i, '') ?? 'Imported List'
    return this.create(listName, items)
  }

  /** Parse a BibleShow .pls playlist file */
  importPls(filePath: string, name?: string): VerseList {
    const content = readFileSync(filePath, 'utf-8')
    const lines = content.split(/\r?\n/)
    const items: VerseListItem[] = []
    let displayTime = 15000
    let loop = false
    let random = false

    for (const line of lines) {
      const trimmed = line.trim()
      // Settings lines
      if (trimmed.includes('=')) {
        const [key, val] = trimmed.split('=').map(s => s.trim())
        if (key === 'DisplayTime') displayTime = parseInt(val, 10) * 1000
        if (key === 'Loop') loop = val === '1'
        if (key === 'Random') random = val === '1'
        continue
      }
      // Reference lines: "Book:Chapter:Verse"
      const parts = trimmed.split(':').map(Number)
      if (parts.length >= 3 && parts[0] && parts[1] && parts[2]) {
        items.push({ ref: { book: parts[0], chapter: parts[1], verse: parts[2] } })
      }
    }

    const listName = name ?? filePath.split(/[\\/]/).pop()?.replace(/\.pls$/i, '') ?? 'Playlist'
    const list = this.create(listName, items)
    list.loop = loop
    list.random = random
    list.defaultDisplayTime = displayTime
    return list
  }

  /** Parse a BibleShow .prg program file */
  importPrg(filePath: string, name?: string): VerseList {
    const content = readFileSync(filePath, 'utf-8')
    const lines = content.split(/\r?\n/)
    const items: VerseListItem[] = []

    for (const line of lines) {
      // Format: "Bm0=44:4:12" or similar
      const match = /=(\d+):(\d+):(\d+)/.exec(line)
      if (match) {
        const [, b, c, v] = match.map(Number)
        if (b && c && v) items.push({ ref: { book: b, chapter: c, verse: v } })
      }
    }

    const listName = name ?? filePath.split(/[\\/]/).pop()?.replace(/\.prg$/i, '') ?? 'Program'
    return this.create(listName, items)
  }

  /** Export to JSON */
  toJSON(): object {
    return Object.fromEntries(this.lists)
  }

  /** Import from JSON */
  fromJSON(data: Record<string, VerseList>): void {
    for (const [id, list] of Object.entries(data)) {
      this.lists.set(id, list)
    }
  }
}
