import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService }                  from '../prisma/prisma.service'
import { CACHE_MANAGER }                  from '@nestjs/cache-manager'
import { Inject }                         from '@nestjs/common'
import type { Cache }                     from 'cache-manager'

@Injectable()
export class BibleService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async getBooks() {
    const cached = await this.cache.get<any[]>('bible:books')
    if (cached) return cached

    const books = await this.prisma.bibleBook.findMany({
      orderBy: { order: 'asc' },
    })
    await this.cache.set('bible:books', books, 3600_000)
    return books
  }

  async getReference(book: string, chapter: number, verse?: number, translation = 'NIV') {
    const bookRecord = await this.prisma.bibleBook.findFirst({
      where: {
        OR: [
          { name:         { equals: book, mode: 'insensitive' } },
          { abbreviation: { equals: book, mode: 'insensitive' } },
        ],
      },
    })
    if (!bookRecord) throw new NotFoundException(`Book "${book}" not found`)

    const cacheKey = `bible:ref:${bookRecord.id}:${chapter}:${verse ?? 'all'}:${translation}`
    const cached   = await this.cache.get<any>(cacheKey)
    if (cached) return cached

    const where: any = {
      bookId:      bookRecord.id,
      chapter,
      translation: translation.toUpperCase(),
    }
    if (verse) where.verse = verse

    const verses = await this.prisma.bibleVerse.findMany({
      where,
      orderBy: { verse: 'asc' },
    })

    const result = {
      book:        bookRecord,
      chapter,
      verse:       verse ?? null,
      translation,
      verses,
      reference:   `${bookRecord.name} ${chapter}${verse ? `:${verse}` : ''}`,
    }

    await this.cache.set(cacheKey, result, 3600_000)
    return result
  }

  async search(query: string, translation = 'NIV', limit = 20) {
    if (query.length < 3) return []

    const normalized = query.toLowerCase().trim()
    const cacheKey   = `bible:search:${normalized}:${translation}:${limit}`
    const cached     = await this.cache.get<any[]>(cacheKey)
    if (cached) return cached

    const results = await this.prisma.bibleVerse.findMany({
      where: {
        translation: translation.toUpperCase(),
        OR: [
          { searchText: { contains: normalized } },
          { text:       { contains: query,      mode: 'insensitive' } },
        ],
      },
      include: { book: true },
      take:    limit,
    })

    await this.cache.set(cacheKey, results, 60_000)
    return results
  }

  async parseReference(refString: string): Promise<{
    book: string; chapter: number; verse?: number; verseEnd?: number
  } | null> {
    // Handle: "Romans 8:28", "John 3:16-17", "Psalm 23", "Gen 1:1"
    const patterns = [
      /^(\d?\s?[A-Za-z]+(?:\s[A-Za-z]+)?)\s+(\d+):(\d+)(?:-(\d+))?$/,
      /^(\d?\s?[A-Za-z]+(?:\s[A-Za-z]+)?)\s+(\d+)$/,
    ]

    for (const pattern of patterns) {
      const match = refString.trim().match(pattern)
      if (match) {
        return {
          book:     match[1].trim(),
          chapter:  parseInt(match[2], 10),
          verse:    match[3] ? parseInt(match[3], 10) : undefined,
          verseEnd: match[4] ? parseInt(match[4], 10) : undefined,
        }
      }
    }
    return null
  }

  async getVerseOfTheDay(translation = 'NIV') {
    // Deterministic daily verse based on day of year
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000,
    )
    const popularVerses = [
      { bookId: 43, chapter: 3,  verse: 16 }, // John 3:16
      { bookId: 45, chapter: 8,  verse: 28 }, // Romans 8:28
      { bookId: 19, chapter: 23, verse: 1  }, // Psalm 23:1
      { bookId: 50, chapter: 4,  verse: 13 }, // Phil 4:13
      { bookId: 62, chapter: 4,  verse: 8  }, // 1 John 4:8
      { bookId: 49, chapter: 2,  verse: 8  }, // Eph 2:8
      { bookId: 50, chapter: 4,  verse: 6  }, // Phil 4:6
      { bookId: 45, chapter: 12, verse: 2  }, // Romans 12:2
    ]
    const ref = popularVerses[dayOfYear % popularVerses.length]
    const verse = await this.prisma.bibleVerse.findFirst({
      where: { bookId: ref.bookId, chapter: ref.chapter, verse: ref.verse, translation },
      include: { book: true },
    })
    return verse
  }
}
