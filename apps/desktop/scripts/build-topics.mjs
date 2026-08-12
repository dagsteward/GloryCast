// Converts OpenBible.info's topical index into the compact form the Bible page
// loads at runtime.
//
// Source: https://a.openbible.info/data/topic-scores.zip  (CC-BY)
// Attribution is required and travels in the output's `license` field — it must
// stay visible wherever topics are shown.
//
// NOTE ON NAMING: this is OpenBible's community-scored topical index, NOT
// Nave's Topical Bible. It serves the same purpose (topic → passages) and is
// larger and more current, but it is a different work and is labelled as such
// so nothing in the UI misattributes it.
//
// Input  : "Topic\tOSIS\tScore"   e.g.  faith  Heb.11.1  22
// Output : { license, topics: { "faith": "58.11.1,45.10.17,…" } }

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))

const OSIS = [
  'Gen','Exod','Lev','Num','Deut','Josh','Judg','Ruth','1Sam','2Sam','1Kgs','2Kgs',
  '1Chr','2Chr','Ezra','Neh','Esth','Job','Ps','Prov','Eccl','Song','Isa','Jer',
  'Lam','Ezek','Dan','Hos','Joel','Amos','Obad','Jonah','Mic','Nah','Hab','Zeph',
  'Hag','Zech','Mal','Matt','Mark','Luke','John','Acts','Rom','1Cor','2Cor','Gal',
  'Eph','Phil','Col','1Thess','2Thess','1Tim','2Tim','Titus','Phlm','Heb','Jas',
  '1Pet','2Pet','1John','2John','3John','Jude','Rev',
]
const BOOK_NUM = new Map(OSIS.map((n, i) => [n.toLowerCase(), i + 1]))

/** "Exod.20.1-Exod.20.26" → "2.20.1" (opening verse of the passage). */
function toKey(ref) {
  const parts = ref.split('-')[0].split('.')
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
  console.error('usage: node build-topics.mjs <topic-scores.txt>')
  process.exit(1)
}

const lines = readFileSync(input, 'utf8').split('\n')
const byTopic = new Map()
let skipped = 0

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trimEnd()
  if (!line) continue
  const [topic, osis, scoreRaw] = line.split('\t')
  const name = (topic ?? '').trim().toLowerCase()
  const key = toKey(osis ?? '')
  if (!name || !key) { skipped++; continue }

  const score = parseInt(scoreRaw ?? '0', 10) || 0
  if (!byTopic.has(name)) byTopic.set(name, [])
  byTopic.get(name).push([key, score])
}

// Best-scoring passages first, capped — a topic list is a starting point for a
// preacher, not an exhaustive concordance dump.
const MAX_PER_TOPIC = 20
const topics = {}
for (const [name, list] of byTopic) {
  list.sort((a, b) => b[1] - a[1])
  // De-duplicate: the source can list the same opening verse via overlapping
  // passage ranges.
  const seen = new Set()
  const refs = []
  for (const [key] of list) {
    if (seen.has(key)) continue
    seen.add(key)
    refs.push(key)
    if (refs.length >= MAX_PER_TOPIC) break
  }
  topics[name] = refs.join(',')
}

const out = {
  license: 'Topical index from openbible.info, CC-BY 4.0',
  topics,
}

const dest = join(HERE, '..', 'src', 'renderer', 'public', 'data', 'topics.json')
mkdirSync(dirname(dest), { recursive: true })
writeFileSync(dest, JSON.stringify(out))

console.log(`topics   : ${byTopic.size.toLocaleString()}`)
console.log(`skipped  : ${skipped.toLocaleString()}`)
console.log(`written  : ${dest}`)
