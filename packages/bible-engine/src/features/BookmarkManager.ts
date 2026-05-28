import type { Bookmark, VerseNote, Highlight, HighlightColor, UserAnnotations } from '../types/features.js'
import type { VerseRef } from '../types/bible.js'
import { formatRef } from '../core/ReferenceParser.js'

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

export class BookmarkManager {
  private bookmarks = new Map<string, Bookmark>()
  private notes = new Map<string, VerseNote>()
  private highlights = new Map<string, Highlight>()

  // ─── Bookmarks ─────────────────────────────────────────────────────────

  addBookmark(ref: VerseRef, options: { note?: string; color?: HighlightColor; tags?: string[] } = {}): Bookmark {
    const id = uid()
    const now = Date.now()
    const bookmark: Bookmark = {
      id,
      ref,
      note: options.note,
      color: options.color ?? 'yellow',
      tags: options.tags ?? [],
      createdAt: now,
      updatedAt: now,
    }
    this.bookmarks.set(id, bookmark)
    return bookmark
  }

  updateBookmark(id: string, changes: Partial<Pick<Bookmark, 'note' | 'color' | 'tags' | 'isFavorite'>>): boolean {
    const bm = this.bookmarks.get(id)
    if (!bm) return false
    Object.assign(bm, changes, { updatedAt: Date.now() })
    return true
  }

  removeBookmark(id: string): boolean {
    return this.bookmarks.delete(id)
  }

  getBookmarks(ref?: VerseRef): Bookmark[] {
    const all = [...this.bookmarks.values()]
    if (!ref) return all
    return all.filter(b => b.ref.book === ref.book && b.ref.chapter === ref.chapter && b.ref.verse === ref.verse)
  }

  getBookmarksByTag(tag: string): Bookmark[] {
    return [...this.bookmarks.values()].filter(b => b.tags?.includes(tag))
  }

  getFavorites(): Bookmark[] {
    return [...this.bookmarks.values()].filter(b => b.isFavorite)
  }

  // ─── Notes ─────────────────────────────────────────────────────────────

  addNote(ref: VerseRef, text: string, options: { title?: string; type?: VerseNote['type']; tags?: string[] } = {}): VerseNote {
    const id = uid()
    const now = Date.now()
    const note: VerseNote = {
      id,
      ref,
      title: options.title,
      text,
      type: options.type ?? 'note',
      tags: options.tags ?? [],
      createdAt: now,
      updatedAt: now,
    }
    this.notes.set(id, note)
    return note
  }

  updateNote(id: string, changes: Partial<Pick<VerseNote, 'title' | 'text' | 'type' | 'tags'>>): boolean {
    const note = this.notes.get(id)
    if (!note) return false
    Object.assign(note, changes, { updatedAt: Date.now() })
    return true
  }

  removeNote(id: string): boolean {
    return this.notes.delete(id)
  }

  getNotes(ref?: VerseRef): VerseNote[] {
    const all = [...this.notes.values()]
    if (!ref) return all
    return all.filter(n => n.ref.book === ref.book && n.ref.chapter === ref.chapter && n.ref.verse === ref.verse)
  }

  searchNotes(query: string): VerseNote[] {
    const q = query.toLowerCase()
    return [...this.notes.values()].filter(n =>
      n.text.toLowerCase().includes(q) || n.title?.toLowerCase().includes(q)
    )
  }

  // ─── Highlights ────────────────────────────────────────────────────────

  addHighlight(ref: VerseRef, color: HighlightColor = 'yellow'): Highlight {
    // Remove existing highlight for this verse first
    for (const [id, h] of this.highlights) {
      if (h.ref.book === ref.book && h.ref.chapter === ref.chapter && h.ref.verse === ref.verse) {
        this.highlights.delete(id)
        break
      }
    }
    const id = uid()
    const highlight: Highlight = { id, ref, color, createdAt: Date.now() }
    this.highlights.set(id, highlight)
    return highlight
  }

  removeHighlight(ref: VerseRef): boolean {
    for (const [id, h] of this.highlights) {
      if (h.ref.book === ref.book && h.ref.chapter === ref.chapter && h.ref.verse === ref.verse) {
        this.highlights.delete(id)
        return true
      }
    }
    return false
  }

  getHighlight(ref: VerseRef): Highlight | undefined {
    return [...this.highlights.values()].find(
      h => h.ref.book === ref.book && h.ref.chapter === ref.chapter && h.ref.verse === ref.verse
    )
  }

  getHighlightsByColor(color: HighlightColor): Highlight[] {
    return [...this.highlights.values()].filter(h => h.color === color)
  }

  // ─── Export / Import ───────────────────────────────────────────────────

  exportAll(): UserAnnotations {
    return {
      bookmarks: [...this.bookmarks.values()],
      notes: [...this.notes.values()],
      highlights: [...this.highlights.values()],
    }
  }

  importAll(data: UserAnnotations): void {
    for (const bm of data.bookmarks) this.bookmarks.set(bm.id, bm)
    for (const note of data.notes) this.notes.set(note.id, note)
    for (const h of data.highlights) this.highlights.set(h.id, h)
  }

  get stats() {
    return {
      bookmarks: this.bookmarks.size,
      notes: this.notes.size,
      highlights: this.highlights.size,
      tags: [...new Set([...this.bookmarks.values()].flatMap(b => b.tags ?? []))],
    }
  }
}
