import type { StrongsEntry, WordStudyResult } from '../types/features.js'
import type { BibleVerse } from '../types/bible.js'

/** Sample Strong's entries — full dataset loaded from external JSON */
const BUILT_IN: Record<string, StrongsEntry> = {
  'G26': {
    number: 'G26', lemma: 'ἀγάπη', transliteration: 'agapē', phonetic: 'ag-ah-pay',
    partOfSpeech: 'noun feminine',
    definition: 'love, i.e. affection or benevolence; specially (plural) a love-feast',
    kjvUsage: 'charity (28), dear (1), love (86)',
    derivation: 'from G25 (ἀγαπάω)',
    occurrences: 116,
  },
  'G25': {
    number: 'G25', lemma: 'ἀγαπάω', transliteration: 'agapaō', phonetic: 'ag-ap-ah-o',
    partOfSpeech: 'verb',
    definition: 'to love (in a social or moral sense)',
    kjvUsage: 'love (135)',
    derivation: 'perhaps from agan (much)',
    occurrences: 135,
  },
  'G2316': {
    number: 'G2316', lemma: 'θεός', transliteration: 'theos', phonetic: 'theh-os',
    partOfSpeech: 'noun masculine',
    definition: 'a deity, especially the supreme Divinity',
    kjvUsage: 'God (1343), god (13), godly (3), God-ward + G4314 (2), misc (9)',
    derivation: 'of uncertain affinity',
    occurrences: 1317,
  },
  'G3056': {
    number: 'G3056', lemma: 'λόγος', transliteration: 'logos', phonetic: 'log-os',
    partOfSpeech: 'noun masculine',
    definition: 'something said (including the thought); by implication a topic (subject of discourse), also reasoning (the mental faculty) or motive',
    kjvUsage: 'word (218), saying (50), account (8), speech (8), Word (7), thing (5), misc (32)',
    derivation: 'from G3004 (λέγω)',
    occurrences: 330,
  },
  'G4102': {
    number: 'G4102', lemma: 'πίστις', transliteration: 'pistis', phonetic: 'pis-tis',
    partOfSpeech: 'noun feminine',
    definition: 'persuasion, i.e. credence; moral conviction (of religious truth, or the truthfulness of God or a religious teacher), especially reliance upon Christ for salvation; the system of religious (Gospel) truth itself',
    kjvUsage: 'faith (239), assurance (1), belief (1), believe + G1537 (1), fidelity (1)',
    derivation: 'from G3982',
    occurrences: 243,
  },
  'G5485': {
    number: 'G5485', lemma: 'χάρις', transliteration: 'charis', phonetic: 'khar-ece',
    partOfSpeech: 'noun feminine',
    definition: 'graciousness (as gratifying), of manner or act (abstract or concrete; literal, figurative or spiritual; especially the divine influence upon the heart, and its reflection in the life)',
    kjvUsage: 'grace (130), favour (6), thanks (4), thank (4), misc (12)',
    derivation: 'from G5463',
    occurrences: 156,
  },
  'H430': {
    number: 'H430', lemma: 'אֱלֹהִים', transliteration: 'elohim', phonetic: 'el-o-heem',
    partOfSpeech: 'noun masculine plural',
    definition: 'God (plural intensive — singular meaning), gods in the ordinary sense, angels, mighty, rulers',
    kjvUsage: 'God (2346), god (244), judge (5), GOD (1), goddess (2), godly (1), gods (45), misc (21)',
    derivation: 'plural of H433',
    occurrences: 2600,
  },
  'H3068': {
    number: 'H3068', lemma: 'יְהוָה', transliteration: 'Yhvh', phonetic: 'yeh-ho-vaw',
    partOfSpeech: 'proper noun masculine',
    definition: 'Jehovah, the self-Existent or Eternal; Jehovah, Jewish national name of God',
    kjvUsage: 'LORD (6399), GOD (4), JEHOVAH (4), variant (1)',
    derivation: 'from H1961',
    occurrences: 6519,
  },
  'H539': {
    number: 'H539', lemma: 'אָמַן', transliteration: 'aman', phonetic: 'aw-man',
    partOfSpeech: 'verb',
    definition: 'to build up or support; to foster as a parent or nurse; figuratively to render firm or faithful, to trust or believe',
    kjvUsage: 'believe (44), assurance (1), faithful (20), sure (11), established (7), trust (5), verified (3), steadfast (2), continuance (1), misc (13)',
    derivation: 'a primitive root',
    occurrences: 108,
  },
  'H7965': {
    number: 'H7965', lemma: 'שָׁלוֹם', transliteration: 'shalom', phonetic: 'shaw-lome',
    partOfSpeech: 'noun masculine',
    definition: 'safe, i.e. (figuratively) well, happy, friendly; also (abstractly) welfare, i.e. health, prosperity, peace',
    kjvUsage: 'peace (175), well (14), peaceably (9), welfare (5), salute + H7592 (4), prosperity (4), did (3), safe (3), misc (20)',
    derivation: 'from H7999',
    occurrences: 237,
  },
}

export class StrongsLexicon {
  private entries = new Map<string, StrongsEntry>(Object.entries(BUILT_IN))
  private externalPath?: string

  /** Load full lexicon from JSON (call once at startup) */
  async loadFromJson(jsonPath: string): Promise<void> {
    try {
      const { readFileSync } = await import('node:fs')
      const data = JSON.parse(readFileSync(jsonPath, 'utf-8'))
      for (const [key, entry] of Object.entries(data as Record<string, StrongsEntry>)) {
        this.entries.set(key, entry)
      }
      this.externalPath = jsonPath
    } catch {
      // Silently continue with built-in entries
    }
  }

  lookup(number: string): StrongsEntry | null {
    const normalized = number.toUpperCase().trim()
    return this.entries.get(normalized) ?? null
  }

  search(query: string): StrongsEntry[] {
    const q = query.toLowerCase()
    const results: StrongsEntry[] = []
    for (const entry of this.entries.values()) {
      if (
        entry.lemma.toLowerCase().includes(q) ||
        entry.transliteration.toLowerCase().includes(q) ||
        entry.definition.toLowerCase().includes(q) ||
        entry.number.toLowerCase().includes(q)
      ) {
        results.push(entry)
      }
    }
    return results.slice(0, 50)
  }

  getGreekEntries(): StrongsEntry[] {
    return [...this.entries.values()].filter(e => e.number.startsWith('G'))
  }

  getHebrewEntries(): StrongsEntry[] {
    return [...this.entries.values()].filter(e => e.number.startsWith('H'))
  }

  get totalLoaded(): number {
    return this.entries.size
  }
}
