import { PrismaClient, Role } from '@prisma/client'
import * as bcrypt from 'bcryptjs'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const prisma = new PrismaClient()

// ── Canonical 66-book metadata (id = canonical order = BibleBook.id) ──────────
// Chapter counts are derived from the bundled assets at seed time; the static
// value here is a fallback used only if an asset is missing.
const BOOK_META: { id: number; name: string; abbreviation: string; testament: 'OT' | 'NT'; chapters: number }[] = [
  { id: 1,  name: 'Genesis',         abbreviation: 'Gen',   testament: 'OT', chapters: 50  },
  { id: 2,  name: 'Exodus',          abbreviation: 'Exo',   testament: 'OT', chapters: 40  },
  { id: 3,  name: 'Leviticus',       abbreviation: 'Lev',   testament: 'OT', chapters: 27  },
  { id: 4,  name: 'Numbers',         abbreviation: 'Num',   testament: 'OT', chapters: 36  },
  { id: 5,  name: 'Deuteronomy',     abbreviation: 'Deut',  testament: 'OT', chapters: 34  },
  { id: 6,  name: 'Joshua',          abbreviation: 'Josh',  testament: 'OT', chapters: 24  },
  { id: 7,  name: 'Judges',          abbreviation: 'Judg',  testament: 'OT', chapters: 21  },
  { id: 8,  name: 'Ruth',            abbreviation: 'Ruth',  testament: 'OT', chapters: 4   },
  { id: 9,  name: '1 Samuel',        abbreviation: '1Sam',  testament: 'OT', chapters: 31  },
  { id: 10, name: '2 Samuel',        abbreviation: '2Sam',  testament: 'OT', chapters: 24  },
  { id: 11, name: '1 Kings',         abbreviation: '1Kgs',  testament: 'OT', chapters: 22  },
  { id: 12, name: '2 Kings',         abbreviation: '2Kgs',  testament: 'OT', chapters: 25  },
  { id: 13, name: '1 Chronicles',    abbreviation: '1Chr',  testament: 'OT', chapters: 29  },
  { id: 14, name: '2 Chronicles',    abbreviation: '2Chr',  testament: 'OT', chapters: 36  },
  { id: 15, name: 'Ezra',            abbreviation: 'Ezra',  testament: 'OT', chapters: 10  },
  { id: 16, name: 'Nehemiah',        abbreviation: 'Neh',   testament: 'OT', chapters: 13  },
  { id: 17, name: 'Esther',          abbreviation: 'Esth',  testament: 'OT', chapters: 10  },
  { id: 18, name: 'Job',             abbreviation: 'Job',   testament: 'OT', chapters: 42  },
  { id: 19, name: 'Psalms',          abbreviation: 'Ps',    testament: 'OT', chapters: 150 },
  { id: 20, name: 'Proverbs',        abbreviation: 'Prov',  testament: 'OT', chapters: 31  },
  { id: 21, name: 'Ecclesiastes',    abbreviation: 'Eccl',  testament: 'OT', chapters: 12  },
  { id: 22, name: 'Song of Solomon', abbreviation: 'Song',  testament: 'OT', chapters: 8   },
  { id: 23, name: 'Isaiah',          abbreviation: 'Isa',   testament: 'OT', chapters: 66  },
  { id: 24, name: 'Jeremiah',        abbreviation: 'Jer',   testament: 'OT', chapters: 52  },
  { id: 25, name: 'Lamentations',    abbreviation: 'Lam',   testament: 'OT', chapters: 5   },
  { id: 26, name: 'Ezekiel',         abbreviation: 'Ezek',  testament: 'OT', chapters: 48  },
  { id: 27, name: 'Daniel',          abbreviation: 'Dan',   testament: 'OT', chapters: 12  },
  { id: 28, name: 'Hosea',           abbreviation: 'Hos',   testament: 'OT', chapters: 14  },
  { id: 29, name: 'Joel',            abbreviation: 'Joel',  testament: 'OT', chapters: 3   },
  { id: 30, name: 'Amos',            abbreviation: 'Amos',  testament: 'OT', chapters: 9   },
  { id: 31, name: 'Obadiah',         abbreviation: 'Obad',  testament: 'OT', chapters: 1   },
  { id: 32, name: 'Jonah',           abbreviation: 'Jonah', testament: 'OT', chapters: 4   },
  { id: 33, name: 'Micah',           abbreviation: 'Mic',   testament: 'OT', chapters: 7   },
  { id: 34, name: 'Nahum',           abbreviation: 'Nah',   testament: 'OT', chapters: 3   },
  { id: 35, name: 'Habakkuk',        abbreviation: 'Hab',   testament: 'OT', chapters: 3   },
  { id: 36, name: 'Zephaniah',       abbreviation: 'Zeph',  testament: 'OT', chapters: 3   },
  { id: 37, name: 'Haggai',          abbreviation: 'Hag',   testament: 'OT', chapters: 2   },
  { id: 38, name: 'Zechariah',       abbreviation: 'Zech',  testament: 'OT', chapters: 14  },
  { id: 39, name: 'Malachi',         abbreviation: 'Mal',   testament: 'OT', chapters: 4   },
  { id: 40, name: 'Matthew',         abbreviation: 'Matt',  testament: 'NT', chapters: 28  },
  { id: 41, name: 'Mark',            abbreviation: 'Mark',  testament: 'NT', chapters: 16  },
  { id: 42, name: 'Luke',            abbreviation: 'Luke',  testament: 'NT', chapters: 24  },
  { id: 43, name: 'John',            abbreviation: 'John',  testament: 'NT', chapters: 21  },
  { id: 44, name: 'Acts',            abbreviation: 'Acts',  testament: 'NT', chapters: 28  },
  { id: 45, name: 'Romans',          abbreviation: 'Rom',   testament: 'NT', chapters: 16  },
  { id: 46, name: '1 Corinthians',   abbreviation: '1Cor',  testament: 'NT', chapters: 16  },
  { id: 47, name: '2 Corinthians',   abbreviation: '2Cor',  testament: 'NT', chapters: 13  },
  { id: 48, name: 'Galatians',       abbreviation: 'Gal',   testament: 'NT', chapters: 6   },
  { id: 49, name: 'Ephesians',       abbreviation: 'Eph',   testament: 'NT', chapters: 6   },
  { id: 50, name: 'Philippians',     abbreviation: 'Phil',  testament: 'NT', chapters: 4   },
  { id: 51, name: 'Colossians',      abbreviation: 'Col',   testament: 'NT', chapters: 4   },
  { id: 52, name: '1 Thessalonians', abbreviation: '1Thes', testament: 'NT', chapters: 5   },
  { id: 53, name: '2 Thessalonians', abbreviation: '2Thes', testament: 'NT', chapters: 3   },
  { id: 54, name: '1 Timothy',       abbreviation: '1Tim',  testament: 'NT', chapters: 6   },
  { id: 55, name: '2 Timothy',       abbreviation: '2Tim',  testament: 'NT', chapters: 4   },
  { id: 56, name: 'Titus',           abbreviation: 'Titus', testament: 'NT', chapters: 3   },
  { id: 57, name: 'Philemon',        abbreviation: 'Phlm',  testament: 'NT', chapters: 1   },
  { id: 58, name: 'Hebrews',         abbreviation: 'Heb',   testament: 'NT', chapters: 13  },
  { id: 59, name: 'James',           abbreviation: 'Jas',   testament: 'NT', chapters: 5   },
  { id: 60, name: '1 Peter',         abbreviation: '1Pet',  testament: 'NT', chapters: 5   },
  { id: 61, name: '2 Peter',         abbreviation: '2Pet',  testament: 'NT', chapters: 3   },
  { id: 62, name: '1 John',          abbreviation: '1Jn',   testament: 'NT', chapters: 5   },
  { id: 63, name: '2 John',          abbreviation: '2Jn',   testament: 'NT', chapters: 1   },
  { id: 64, name: '3 John',          abbreviation: '3Jn',   testament: 'NT', chapters: 1   },
  { id: 65, name: 'Jude',            abbreviation: 'Jude',  testament: 'NT', chapters: 1   },
  { id: 66, name: 'Revelation',      abbreviation: 'Rev',   testament: 'NT', chapters: 22  },
]

// Compact bundled-asset shape (see scripts/build-bible-data.mjs).
interface BibleAsset { t: string; name: string; books: Record<string, string[][]> }

/** Normalised, accent-free text used for fast substring search on the backend. */
const normalizeSearch = (s: string) =>
  s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim()

/** Load a bundled translation asset shared with the desktop renderer, or null. */
function loadBibleAsset(translation: 'kjv' | 'web'): BibleAsset | null {
  const path = resolve(__dirname, '../../desktop/src/renderer/public/bible', `${translation}.json`)
  if (!existsSync(path)) {
    console.warn(`  ⚠ Bible asset not found: ${path} — skipping ${translation.toUpperCase()}`)
    return null
  }
  return JSON.parse(readFileSync(path, 'utf8')) as BibleAsset
}

/** Seed every verse of a translation into BibleVerse using batched inserts. */
async function seedTranslation(asset: BibleAsset, nameToId: Map<string, number>) {
  const tx = asset.t.toUpperCase()
  const rows: { bookId: number; chapter: number; verse: number; translation: string; text: string; searchText: string }[] = []

  for (const [bookName, chapters] of Object.entries(asset.books)) {
    const bookId = nameToId.get(bookName)
    if (!bookId) { console.warn(`  ⚠ Unknown book "${bookName}" in ${tx} — skipped`); continue }
    chapters.forEach((verses, ci) => {
      verses.forEach((text, vi) => {
        rows.push({
          bookId, chapter: ci + 1, verse: vi + 1, translation: tx,
          text, searchText: normalizeSearch(text),
        })
      })
    })
  }

  // Wipe any prior copy of this translation so re-seeding is idempotent.
  await prisma.bibleVerse.deleteMany({ where: { translation: tx } })

  const BATCH = 2000
  for (let i = 0; i < rows.length; i += BATCH) {
    await prisma.bibleVerse.createMany({ data: rows.slice(i, i + BATCH), skipDuplicates: true })
  }
  console.log(`  ${tx}: ${rows.length} verses seeded`)
}

async function main() {
  console.log('🌱 Seeding GloryCast database...')

  // ── Create demo church ───────────────────────────────────────────────────
  const church = await prisma.church.upsert({
    where: { slug: 'grace-community-church' },
    update: {},
    create: {
      name: 'Grace Community Church',
      slug: 'grace-community-church',
      description: 'A spirit-filled church community',
      timezone: 'America/New_York',
      country: 'US',
      subscriptionTier: 'PROFESSIONAL',
      settings: {
        defaultBibleTranslation: 'NIV',
        streamingEnabled: true,
        aiEnabled: true,
      },
    },
  })

  // ── Create super admin ───────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('Admin@123', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@glorycast.ai' },
    update: {},
    create: {
      email: 'admin@glorycast.ai',
      passwordHash,
      firstName: 'GloryCast',
      lastName: 'Admin',
      emailVerified: true,
    },
  })

  await prisma.churchMember.upsert({
    where: { userId_churchId: { userId: admin.id, churchId: church.id } },
    update: {},
    create: {
      userId: admin.id,
      churchId: church.id,
      role: Role.CHURCH_ADMIN,
      isDefault: true,
    },
  })

  // ── Create demo producer user ────────────────────────────────────────────
  const producerHash = await bcrypt.hash('Producer@123', 12)
  const producer = await prisma.user.upsert({
    where: { email: 'producer@glorycast.ai' },
    update: {},
    create: {
      email: 'producer@glorycast.ai',
      passwordHash: producerHash,
      firstName: 'Demo',
      lastName: 'Producer',
      emailVerified: true,
    },
  })

  await prisma.churchMember.upsert({
    where: { userId_churchId: { userId: producer.id, churchId: church.id } },
    update: {},
    create: {
      userId: producer.id,
      churchId: church.id,
      role: Role.PRODUCER,
      isDefault: true,
    },
  })

  // ── Bible books (all 66) ─────────────────────────────────────────────────
  // Prefer chapter counts derived from the bundled assets; fall back to static.
  const webAsset = loadBibleAsset('web')
  const kjvAsset = loadBibleAsset('kjv')
  const chapterCountFor = (name: string) =>
    webAsset?.books[name]?.length ?? kjvAsset?.books[name]?.length

  const nameToId = new Map<string, number>()
  for (const book of BOOK_META) {
    nameToId.set(book.name, book.id)
    const chapters = chapterCountFor(book.name) ?? book.chapters
    const data = { id: book.id, name: book.name, abbreviation: book.abbreviation, testament: book.testament, chapters, order: book.id }
    await prisma.bibleBook.upsert({ where: { id: book.id }, update: data, create: data })
  }
  console.log(`  ${BOOK_META.length} Bible books upserted`)

  // ── Bible verses (full public-domain text: WEB + KJV) ─────────────────────
  if (webAsset) await seedTranslation(webAsset, nameToId)
  if (kjvAsset) await seedTranslation(kjvAsset, nameToId)

  // ── Demo quiz ────────────────────────────────────────────────────────────
  const quiz = await prisma.quiz.create({
    data: {
      churchId: church.id,
      title: 'Sunday Scripture Challenge',
      description: 'Test your knowledge of this week\'s scriptures',
      status: 'DRAFT',
      timeLimitSecs: 30,
      shuffleQuestions: true,
      questions: {
        create: [
          {
            text: 'What does Romans 8:28 say about God working for the good?',
            options: [
              { id: 'a', text: 'For those who love Him', isCorrect: true  },
              { id: 'b', text: 'For everyone equally',   isCorrect: false },
              { id: 'c', text: 'For the righteous only', isCorrect: false },
              { id: 'd', text: 'For the church leaders', isCorrect: false },
            ],
            explanation: 'Romans 8:28 — "And we know that in all things God works for the good of those who love him"',
            points: 10,
            order: 1,
          },
          {
            text: 'In John 3:16, what does God give as an expression of His love?',
            options: [
              { id: 'a', text: 'His only Son',   isCorrect: true  },
              { id: 'b', text: 'Eternal wisdom', isCorrect: false },
              { id: 'c', text: 'The Holy Spirit', isCorrect: false },
              { id: 'd', text: 'The Scriptures', isCorrect: false },
            ],
            explanation: 'John 3:16 — "For God so loved the world that he gave his one and only Son"',
            points: 10,
            order: 2,
          },
        ],
      },
    },
  })

  console.log('✅ Seeding complete!')
  console.log(`  Church: ${church.name} (${church.slug})`)
  console.log(`  Admin: admin@glorycast.ai / Admin@123`)
  console.log(`  Producer: producer@glorycast.ai / Producer@123`)
  console.log(`  Quiz: ${quiz.title}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
