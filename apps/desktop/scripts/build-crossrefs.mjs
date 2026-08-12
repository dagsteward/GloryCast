// Converts OpenBible.info's cross-reference dataset into the compact form the
// Bible page loads at runtime.
//
// Source: https://a.openbible.info/data/cross-references.zip  (CC-BY)
// Attribution is required and is carried in the output's `license` field — it
// must stay visible in the UI.
//
// Input  : "From Verse\tTo Verse\tVotes"  e.g.  Gen.1.1  Jer.32.17  90
// Output : { license, refs: { "1.1.1": "24.32.17,23.44.24,…" } }
//
// Book names become 1-based canonical indexes and the target list becomes one
// comma-joined string per verse. The raw file is 8.3 MB; this lands far
// smaller, which matters because it is fetched at runtime.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))

// OSIS abbreviations as they appear in the source file → canonical book number.
const OSIS = [
  'Gen','Exod','Lev','Num','Deut','Josh','Judg','Ruth','1Sam','2Sam','1Kgs','2Kgs',
  '1Chr','2Chr','Ezra','Neh','Esth','Job','Ps','Prov','Eccl','Song','Isa','Jer',
  'Lam','Ezek','Dan','Hos','Joel','Amos','Obad','Jonah','Mic','Nah','Hab','Zeph',
  'Hag','Zech','Mal','Matt','Mark','Luke','John','Acts','Rom','1Cor','2Cor','Gal',
  'Eph','Phil','Col','1Thess','2Thess','1Tim','2Tim','Titus','Phlm','Heb','Jas',
  '1Pet','2Pet','1John','2John','3John','Jude','Rev',
]
const BOOK_NUM = new Map(OSIS.map((n, i) => [n.toLowerCase(), i + 1]))

/** "Gen.1.1" → "1.1.1", or null when the book is unrecognised. */
function toKey(ref) {
  // Ranges ("Gen.1.1-Gen.1.3") keep only the opening verse: the UI links to a
  // starting point, and the reader continues from there.
  const first = ref.split('-')[0]
  const parts = first.split('.')
  if (parts.length < 3) return null
  const book = BOOK_NUM.get(parts[0].toLowerCase())
  if (!book) return null
  const chapter = parseInt(parts[1], 10)
  const verse = parseInt(parts[2], 10)
  if (!Number.isFinite(chapter) || !Number.isFinite(verse)) return null
  return `${book}.${chapter}.${verse}`
}

const input = process.argv[2]
if (!input) {
  console.error('usage: node build-crossrefs.mjs <cross_references.txt>')
  process.exit(1)
}

const lines = readFileSync(input, 'utf8').split('\n')
const byVerse = new Map()
let skipped = 0

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim()
  if (!line) continue
  const [from, to, votesRaw] = line.split('\t')
  const fromKey = toKey(from ?? '')
  const toKey_ = toKey(to ?? '')
  if (!fromKey || !toKey_) { skipped++; continue }

  const votes = parseInt(votesRaw ?? '0', 10) || 0
  if (!byVerse.has(fromKey)) byVerse.set(fromKey, [])
  byVerse.get(fromKey).push([toKey_, votes])
}

// Highest-voted first, capped — a verse with 200 references is noise in a
// sidebar, and the top handful are what a preacher actually wants.
const MAX_PER_VERSE = 25
const refs = {}
for (const [key, list] of byVerse) {
  list.sort((a, b) => b[1] - a[1])
  refs[key] = list.slice(0, MAX_PER_VERSE).map(x => x[0]).join(',')
}

const out = {
  license: 'Cross-reference data from openbible.info, CC-BY 4.0',
  refs,
}

const dest = join(HERE, '..', 'src', 'renderer', 'public', 'data', 'cross-references.json')
mkdirSync(dirname(dest), { recursive: true })
writeFileSync(dest, JSON.stringify(out))

console.log(`verses with refs : ${byVerse.size.toLocaleString()}`)
console.log(`skipped lines    : ${skipped.toLocaleString()}`)
console.log(`written          : ${dest}`)
