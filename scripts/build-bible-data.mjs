// Build compact, offline Bible assets from getBible.net v2 dumps.
//
// Input  : .bible-src/{kjv,web}.json   (getBible v2 format — public domain text)
// Output : apps/desktop/src/renderer/public/bible/{kjv,web}.json
//
// Compact shape (≈45% smaller — drops per-verse name/number, implied by index):
//   { "t": "KJV", "name": "King James Version",
//     "books": { "Genesis": [ ["v1 text","v2 text", …], …chapters ], … } }
//
// Chapter c → books[name][c-1];  verse v → books[name][c-1][v-1].
// Keyed by the renderer's canonical book names (so "Song of Solomon", not "Songs").

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// Canonical 66-book names, in order, exactly as the renderer's BOOKS list uses them.
const CANON = [
  'Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth',
  '1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra',
  'Nehemiah','Esther','Job','Psalms','Proverbs','Ecclesiastes','Song of Solomon',
  'Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel','Hosea','Joel','Amos','Obadiah',
  'Jonah','Micah','Nahum','Habakkuk','Zephaniah','Haggai','Zechariah','Malachi',
  'Matthew','Mark','Luke','John','Acts','Romans','1 Corinthians','2 Corinthians',
  'Galatians','Ephesians','Philippians','Colossians','1 Thessalonians','2 Thessalonians',
  '1 Timothy','2 Timothy','Titus','Philemon','Hebrews','James','1 Peter','2 Peter',
  '1 John','2 John','3 John','Jude','Revelation',
]

function compact(srcFile, t, name) {
  const raw = JSON.parse(readFileSync(resolve(ROOT, srcFile), 'utf8'))
  const books = {}
  for (const b of raw.books) {
    const canonName = CANON[b.nr - 1]          // map by canonical order (1-based nr)
    const chapters = b.chapters
      .slice()
      .sort((a, c) => a.chapter - c.chapter)
      .map(ch =>
        ch.verses
          .slice()
          .sort((a, c) => a.verse - c.verse)
          .map(v => v.text.replace(/\s+/g, ' ').trim()),
      )
    books[canonName] = chapters
  }
  const out = { t, name, books }
  const dest = resolve(ROOT, 'apps/desktop/src/renderer/public/bible', `${t.toLowerCase()}.json`)
  mkdirSync(dirname(dest), { recursive: true })
  writeFileSync(dest, JSON.stringify(out))
  const verses = Object.values(books).reduce((a, ch) => a + ch.reduce((s, c) => s + c.length, 0), 0)
  console.log(`${t}: ${Object.keys(books).length} books, ${verses} verses → ${dest}`)
}

compact('.bible-src/kjv.json', 'KJV', 'King James Version')
compact('.bible-src/web.json', 'WEB', 'World English Bible')
console.log('Done.')
