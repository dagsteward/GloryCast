// ─────────────────────────────────────────────────────────────────────────────
// import-bibles.mjs — import Power Bible (.bib) translations into Postgres.
//
// The .bib files (packages/bible-engine/Bibles/*.bib) are Microsoft Access Jet4
// databases shipped with the user's licensed BibleShow / Power Bible install.
// Tables: Info (metadata), Structure (66 books), Bible (Book,Chapter,Verse,Scripture).
// `Bible.Book` uses canonical 1..66 numbering, which matches our BibleBook.id.
//
// This loads ALL .bib files found, upserts the 66 books, strips Power Bible
// markup from the verse text, and bulk-inserts into BibleVerse (one row per
// book/chapter/verse/translation). These translations come from the user's own
// licensed local copy and are imported into their own local database.
//
// Run from repo root:  node --env-file=apps/backend/.env import-bibles.mjs
// Optional: pass translation codes to import a subset, e.g.
//           node --env-file=apps/backend/.env import-bibles.mjs KJV NIV
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import MDBReaderMod from 'mdb-reader'
import { PrismaClient } from './node_modules/@prisma/client/index.js'

const MDBReader = MDBReaderMod.default ?? MDBReaderMod
const prisma = new PrismaClient()

const BIBLES_DIR = 'packages/bible-engine/Bibles'
const BATCH = 4000
const onlyCodes = process.argv.slice(2).map(s => s.toUpperCase()) // empty = all

// ── Markup / entity cleanup ──────────────────────────────────────────────────
function clean(raw) {
  return String(raw)
    .replace(/<[^>]+>/g, ' ')        // strip all tags (span/br/p/i/pb…)
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/\s+/g, ' ')
    .trim()
}

function testamentOf(bibPos) {
  return bibPos <= 39 ? 'OT' : 'NT'
}

async function ensureBooks(structure) {
  for (const b of structure) {
    const id = b.BibPosition
    await prisma.bibleBook.upsert({
      where:  { id },
      update: {}, // keep existing rows (incl. base seed names) untouched
      create: {
        id,
        name:         b.FullTitle,
        abbreviation: String(b.Abbreviation || b.FullTitle.slice(0, 3)).replace(/\.$/, ''),
        testament:    testamentOf(b.BibPosition),
        chapters:     b.Chapters ?? 0,
        order:        b.BibPosition,
      },
    })
  }
}

async function importFile(filePath) {
  const db   = new MDBReader(readFileSync(filePath))
  const info = Object.fromEntries(
    db.getTable('Info').getData()
      .filter(r => r.Parameter != null)
      .map(r => [r.Parameter, r.Value == null ? '' : String(r.Value)]),
  )
  const code = (info['BibleShortName'] || 'UNK').toUpperCase()
  const name = info['BibleFullName'] || code

  if (onlyCodes.length && !onlyCodes.includes(code)) {
    console.log(`  skip ${code} (not in requested subset)`)
    return
  }

  await ensureBooks(db.getTable('Structure').getData())

  const rows = db.getTable('Bible').getData()
  const records = []
  for (const r of rows) {
    if (!r.Book || !r.Chapter || !r.Verse || r.Scripture == null) continue
    const text = clean(r.Scripture)
    if (!text) continue
    records.push({
      bookId:      r.Book,
      chapter:     r.Chapter,
      verse:       r.Verse,
      translation: code,
      text,
      searchText:  text.toLowerCase(),
    })
  }

  // Replace any existing rows for this translation, then bulk insert.
  await prisma.bibleVerse.deleteMany({ where: { translation: code } })
  let inserted = 0
  for (let i = 0; i < records.length; i += BATCH) {
    const slice = records.slice(i, i + BATCH)
    const res = await prisma.bibleVerse.createMany({ data: slice, skipDuplicates: true })
    inserted += res.count
  }
  console.log(`  ${code.padEnd(5)} "${name}" — ${inserted} verses`)
}

async function main() {
  const files = readdirSync(BIBLES_DIR).filter(f => f.toLowerCase().endsWith('.bib'))
  if (!files.length) { console.error('No .bib files found in', BIBLES_DIR); process.exit(1) }
  console.log(`Importing ${files.length} Bible file(s)${onlyCodes.length ? ` (subset: ${onlyCodes.join(', ')})` : ''}...`)
  for (const f of files) {
    process.stdout.write(`• ${f}\n`)
    await importFile(join(BIBLES_DIR, f))
  }

  const total = await prisma.bibleVerse.count()
  const byT = await prisma.bibleVerse.groupBy({ by: ['translation'], _count: true })
  console.log('Done. Total verses in DB:', total)
  console.log('Per translation:', byT.map(t => `${t.translation}=${t._count}`).join(', '))
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
