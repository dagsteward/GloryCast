// ─── Bible book aliases and patterns ─────────────────────────────────────────
// Maps canonical IDs to arrays of aliases (canonical | abbreviation | spoken forms)

export const BIBLE_BOOKS: Record<string, {
  id:           number
  canonical:    string
  abbreviations: string[]
  spokenForms:  string[]
  testament:    'OT' | 'NT'
  chapters:     number
}> = {
  genesis:       { id: 1,  canonical: 'Genesis',       abbreviations: ['Gen','Gn'],            spokenForms: ['genesis'],                   testament: 'OT', chapters: 50  },
  exodus:        { id: 2,  canonical: 'Exodus',         abbreviations: ['Ex','Exo'],            spokenForms: ['exodus'],                    testament: 'OT', chapters: 40  },
  leviticus:     { id: 3,  canonical: 'Leviticus',      abbreviations: ['Lev'],                 spokenForms: ['leviticus'],                 testament: 'OT', chapters: 27  },
  numbers:       { id: 4,  canonical: 'Numbers',        abbreviations: ['Num'],                 spokenForms: ['numbers'],                   testament: 'OT', chapters: 36  },
  deuteronomy:   { id: 5,  canonical: 'Deuteronomy',    abbreviations: ['Deut','Dt'],           spokenForms: ['deuteronomy'],               testament: 'OT', chapters: 34  },
  psalms:        { id: 19, canonical: 'Psalms',         abbreviations: ['Ps','Psa'],            spokenForms: ['psalms','psalm','the psalms'], testament: 'OT', chapters: 150 },
  proverbs:      { id: 20, canonical: 'Proverbs',       abbreviations: ['Prov','Pr'],           spokenForms: ['proverbs'],                  testament: 'OT', chapters: 31  },
  isaiah:        { id: 23, canonical: 'Isaiah',         abbreviations: ['Isa'],                 spokenForms: ['isaiah'],                    testament: 'OT', chapters: 66  },
  jeremiah:      { id: 24, canonical: 'Jeremiah',       abbreviations: ['Jer'],                 spokenForms: ['jeremiah'],                  testament: 'OT', chapters: 52  },
  matthew:       { id: 40, canonical: 'Matthew',        abbreviations: ['Matt','Mt'],           spokenForms: ['matthew'],                   testament: 'NT', chapters: 28  },
  mark:          { id: 41, canonical: 'Mark',           abbreviations: ['Mk'],                  spokenForms: ['mark'],                      testament: 'NT', chapters: 16  },
  luke:          { id: 42, canonical: 'Luke',           abbreviations: ['Lk'],                  spokenForms: ['luke'],                      testament: 'NT', chapters: 24  },
  john:          { id: 43, canonical: 'John',           abbreviations: ['Jn'],                  spokenForms: ['john'],                      testament: 'NT', chapters: 21  },
  acts:          { id: 44, canonical: 'Acts',           abbreviations: ['Ac'],                  spokenForms: ['acts','acts of the apostles'], testament: 'NT', chapters: 28 },
  romans:        { id: 45, canonical: 'Romans',         abbreviations: ['Rom'],                 spokenForms: ['romans'],                    testament: 'NT', chapters: 16  },
  '1corinthians':{ id: 46, canonical: '1 Corinthians',  abbreviations: ['1Cor','1Co'],          spokenForms: ['first corinthians','one corinthians'], testament: 'NT', chapters: 16 },
  '2corinthians':{ id: 47, canonical: '2 Corinthians',  abbreviations: ['2Cor','2Co'],          spokenForms: ['second corinthians','two corinthians'], testament: 'NT', chapters: 13 },
  galatians:     { id: 48, canonical: 'Galatians',      abbreviations: ['Gal'],                 spokenForms: ['galatians'],                 testament: 'NT', chapters: 6   },
  ephesians:     { id: 49, canonical: 'Ephesians',      abbreviations: ['Eph'],                 spokenForms: ['ephesians'],                 testament: 'NT', chapters: 6   },
  philippians:   { id: 50, canonical: 'Philippians',    abbreviations: ['Phil'],                spokenForms: ['philippians'],               testament: 'NT', chapters: 4   },
  colossians:    { id: 51, canonical: 'Colossians',     abbreviations: ['Col'],                 spokenForms: ['colossians'],                testament: 'NT', chapters: 4   },
  '1thessalonians': { id: 52, canonical: '1 Thessalonians', abbreviations: ['1Thess','1Th'], spokenForms: ['first thessalonians'], testament: 'NT', chapters: 5 },
  '1timothy':    { id: 54, canonical: '1 Timothy',      abbreviations: ['1Tim','1Ti'],          spokenForms: ['first timothy'],             testament: 'NT', chapters: 6   },
  '2timothy':    { id: 55, canonical: '2 Timothy',      abbreviations: ['2Tim','2Ti'],          spokenForms: ['second timothy'],            testament: 'NT', chapters: 4   },
  hebrews:       { id: 58, canonical: 'Hebrews',        abbreviations: ['Heb'],                 spokenForms: ['hebrews'],                   testament: 'NT', chapters: 13  },
  james:         { id: 59, canonical: 'James',          abbreviations: ['Jas'],                 spokenForms: ['james'],                     testament: 'NT', chapters: 5   },
  '1peter':      { id: 60, canonical: '1 Peter',        abbreviations: ['1Pet','1Pe'],          spokenForms: ['first peter'],               testament: 'NT', chapters: 5   },
  '1john':       { id: 62, canonical: '1 John',         abbreviations: ['1Jn','1Jo'],           spokenForms: ['first john'],                testament: 'NT', chapters: 5   },
  revelation:    { id: 66, canonical: 'Revelation',     abbreviations: ['Rev'],                 spokenForms: ['revelation','the book of revelation','revelations'], testament: 'NT', chapters: 22 },
}

// ─── Number word mappings ─────────────────────────────────────────────────────

export const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
  'twenty-one': 21, 'twenty-two': 22, 'twenty-three': 23,
  thirty: 30, forty: 40, fifty: 50,
  'one hundred': 100, 'one hundred and one': 101,
  'one hundred and fifty': 150,
}

// ─── Compiled book name → key lookup ─────────────────────────────────────────

export function buildBookLookup(): Map<string, string> {
  const map = new Map<string, string>()
  for (const [key, book] of Object.entries(BIBLE_BOOKS)) {
    map.set(key,                          key)
    map.set(book.canonical.toLowerCase(), key)
    for (const abbr  of book.abbreviations) map.set(abbr.toLowerCase(),  key)
    for (const spoken of book.spokenForms)  map.set(spoken.toLowerCase(), key)
  }
  return map
}

// ─── Scripture detection patterns ────────────────────────────────────────────
// Ordered from most specific to least specific

export const SCRIPTURE_PATTERNS = [
  // "Romans 8:28-30"
  /\b([1-3]?\s?[A-Za-z]+(?:\s[A-Za-z]+)?)\s+(\d{1,3}):(\d{1,3})(?:[–\-](\d{1,3}))?\b/g,
  // "John chapter 3 verse 16"
  /\b([1-3]?\s?[A-Za-z]+(?:\s[A-Za-z]+)?)\s+chapter\s+(\d{1,3})\s+verse\s+(\d{1,3})\b/gi,
  // "Psalm twenty-three" (spoken)
  /\b(psalm[s]?)\s+([\w\s-]+)\b/gi,
  // "turn to John 3" (chapter only)
  /\b(?:turn to|open to|look at|read)\s+([1-3]?\s?[A-Za-z]+(?:\s[A-Za-z]+)?)\s+(\d{1,3})\b/gi,
]
