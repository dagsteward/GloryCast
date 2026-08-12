// Converts the Open Scriptures Strong's dictionaries into the compact form the
// Bible page loads at runtime.
//
// Source: github.com/openscriptures/strongs  (Greek + Hebrew, CC-BY-SA)
// Strong's Concordance itself (James Strong, 1890) is public domain; the JSON
// compilation is CC-BY-SA, so the attribution in `license` must stay visible.
//
// Input  : `var strongsGreekDictionary = { "G26": {...} }; module.exports = …`
// Output : { license, entries: { "G26": { l, t, d, k } } }
//
// Field names are shortened because this is ~14k entries fetched at runtime:
//   l = lemma (original script)   t = transliteration
//   d = definition                k = KJV translations

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))

/** Pull the object literal out of the `var x = {...}; module.exports = x;` wrapper. */
function parseDictionary(source) {
  const start = source.indexOf('{', source.indexOf('='))
  const end = source.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('could not locate the dictionary object')
  return JSON.parse(source.slice(start, end + 1))
}

function tidy(value) {
  return (value ?? '').toString().replace(/\s+/g, ' ').trim()
}

const [greekPath, hebrewPath] = process.argv.slice(2)
if (!greekPath || !hebrewPath) {
  console.error('usage: node build-strongs.mjs <greek.js> <hebrew.js>')
  process.exit(1)
}

const entries = {}
let greekCount = 0
let hebrewCount = 0

for (const [path, isGreek] of [[greekPath, true], [hebrewPath, false]]) {
  const dict = parseDictionary(readFileSync(path, 'utf8'))
  for (const [id, raw] of Object.entries(dict)) {
    const definition = tidy(raw.strongs_def)
    // An entry with no definition is not worth the bytes — the UI would render
    // a heading with nothing under it.
    if (!definition) continue

    entries[id] = {
      l: tidy(raw.lemma),
      // Greek uses `translit`, Hebrew uses `xlit` — normalise to one field.
      t: tidy(raw.translit ?? raw.xlit),
      d: definition,
      k: tidy(raw.kjv_def),
    }
    if (isGreek) greekCount++; else hebrewCount++
  }
}

const out = {
  license: "Strong's data from Open Scriptures (openscriptures.org), CC-BY-SA 4.0",
  entries,
}

const dest = join(HERE, '..', 'src', 'renderer', 'public', 'data', 'strongs.json')
mkdirSync(dirname(dest), { recursive: true })
writeFileSync(dest, JSON.stringify(out))

console.log(`greek entries  : ${greekCount.toLocaleString()}`)
console.log(`hebrew entries : ${hebrewCount.toLocaleString()}`)
console.log(`total          : ${Object.keys(entries).length.toLocaleString()}`)
console.log(`written        : ${dest}`)
