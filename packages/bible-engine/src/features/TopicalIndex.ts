import type { TopicEntry, TopicSearchResult } from '../types/features.js'
import type { VerseRef } from '../types/bible.js'

function ref(book: number, chapter: number, verse: number): VerseRef {
  return { book, chapter, verse }
}

/** Nave's Topical Bible — core topics (public domain) */
const NAVE_TOPICS: TopicEntry[] = [
  {
    id: 'salvation', name: 'Salvation', description: 'God\'s plan of redemption through Jesus Christ',
    tags: ['gospel', 'redemption', 'grace'],
    references: [
      ref(43,3,16), ref(43,3,17), ref(45,10,9), ref(45,10,10), ref(44,4,12),
      ref(49,2,8), ref(49,2,9), ref(56,2,11), ref(61,3,15), ref(62,5,13),
    ],
  },
  {
    id: 'prayer', name: 'Prayer', description: 'Communication with God — petition, praise, thanksgiving',
    tags: ['worship', 'communion', 'petition'],
    references: [
      ref(50,4,6), ref(50,4,7), ref(40,6,9), ref(59,5,16), ref(62,5,14),
      ref(42,18,1), ref(45,8,26), ref(45,8,27), ref(60,3,12), ref(19,5,3),
    ],
  },
  {
    id: 'faith', name: 'Faith', description: 'Trust and belief in God and His promises',
    tags: ['belief', 'trust', 'assurance'],
    references: [
      ref(58,11,1), ref(58,11,6), ref(45,10,17), ref(59,2,17), ref(59,2,26),
      ref(40,17,20), ref(40,21,21), ref(41,11,22), ref(45,4,20), ref(47,5,7),
    ],
  },
  {
    id: 'love', name: 'Love', description: 'God\'s love and our love for one another',
    tags: ['agape', 'charity', 'compassion'],
    references: [
      ref(43,3,16), ref(62,4,8), ref(62,4,9), ref(62,4,10), ref(46,13,4),
      ref(46,13,13), ref(40,22,37), ref(40,22,39), ref(45,5,8), ref(43,15,13),
    ],
  },
  {
    id: 'grace', name: 'Grace', description: 'Unmerited favor and blessing from God',
    tags: ['mercy', 'favor', 'gift'],
    references: [
      ref(49,2,8), ref(49,2,9), ref(43,1,17), ref(45,5,15), ref(45,6,14),
      ref(47,12,9), ref(56,2,11), ref(58,4,16), ref(45,11,6),
    ],
  },
  {
    id: 'peace', name: 'Peace', description: 'Peace with God and the peace of God',
    tags: ['shalom', 'rest', 'tranquility'],
    references: [
      ref(50,4,7), ref(43,14,27), ref(43,16,33), ref(45,5,1), ref(45,8,6),
      ref(23,26,3), ref(19,119,165), ref(40,5,9), ref(62,1,7),
    ],
  },
  {
    id: 'worship', name: 'Worship', description: 'Honoring and glorifying God',
    tags: ['praise', 'adoration', 'reverence'],
    references: [
      ref(43,4,23), ref(43,4,24), ref(19,95,6), ref(19,100,2), ref(19,150,1),
      ref(45,12,1), ref(58,13,15), ref(66,4,10), ref(66,4,11),
    ],
  },
  {
    id: 'forgiveness', name: 'Forgiveness', description: 'God\'s forgiveness and forgiving others',
    tags: ['mercy', 'pardon', 'reconciliation'],
    references: [
      ref(62,1,9), ref(49,4,32), ref(51,3,13), ref(40,6,14), ref(40,18,21),
      ref(40,18,22), ref(42,17,3), ref(19,103,12), ref(23,43,25),
    ],
  },
  {
    id: 'holy-spirit', name: 'Holy Spirit', description: 'The person and work of the Holy Spirit',
    tags: ['Spirit', 'Comforter', 'Paraclete'],
    references: [
      ref(43,14,16), ref(43,14,26), ref(43,16,13), ref(44,2,38), ref(44,1,8),
      ref(45,8,26), ref(45,8,27), ref(46,12,13), ref(48,5,22), ref(48,5,23),
    ],
  },
  {
    id: 'eternal-life', name: 'Eternal Life', description: 'The gift of eternal life through Christ',
    tags: ['heaven', 'immortality', 'resurrection'],
    references: [
      ref(43,3,16), ref(43,3,36), ref(43,10,28), ref(43,17,3), ref(45,6,23),
      ref(62,5,11), ref(62,5,12), ref(62,5,13), ref(66,21,4),
    ],
  },
  {
    id: 'strength', name: 'Strength', description: 'God as our source of strength and power',
    tags: ['power', 'might', 'endurance'],
    references: [
      ref(50,4,13), ref(23,40,31), ref(19,46,1), ref(19,91,1), ref(49,6,10),
      ref(47,12,9), ref(47,12,10), ref(19,28,8), ref(42,10,19),
    ],
  },
  {
    id: 'trust', name: 'Trust in God', description: 'Trusting in God\'s providence and care',
    tags: ['faith', 'dependence', 'confidence'],
    references: [
      ref(20,3,5), ref(20,3,6), ref(19,37,3), ref(19,37,5), ref(24,29,11),
      ref(19,56,3), ref(23,26,4), ref(19,9,10), ref(19,112,7),
    ],
  },
  {
    id: 'wisdom', name: 'Wisdom', description: 'Divine wisdom and seeking understanding',
    tags: ['knowledge', 'understanding', 'discernment'],
    references: [
      ref(59,1,5), ref(20,2,6), ref(20,9,10), ref(20,1,7), ref(46,1,30),
      ref(51,2,3), ref(19,111,10), ref(59,3,17), ref(51,3,16),
    ],
  },
  {
    id: 'hope', name: 'Hope', description: 'The believer\'s hope in God and His promises',
    tags: ['expectation', 'promise', 'future'],
    references: [
      ref(45,15,4), ref(45,8,24), ref(45,8,25), ref(58,11,1), ref(60,1,3),
      ref(45,5,5), ref(58,6,19), ref(62,3,2), ref(62,3,3),
    ],
  },
  {
    id: 'joy', name: 'Joy', description: 'The joy of the Lord as our strength',
    tags: ['rejoicing', 'gladness', 'happiness'],
    references: [
      ref(16,8,10), ref(50,4,4), ref(43,15,11), ref(45,14,17), ref(19,16,11),
      ref(62,1,4), ref(48,5,22), ref(48,5,23), ref(23,61,10),
    ],
  },
  {
    id: 'second-coming', name: 'Second Coming of Christ', description: 'The return of Jesus Christ',
    tags: ['rapture', 'parousia', 'eschatology'],
    references: [
      ref(43,14,3), ref(44,1,11), ref(52,4,16), ref(52,4,17), ref(56,2,13),
      ref(41,13,32), ref(66,1,7), ref(66,22,20),
    ],
  },
  {
    id: 'resurrection', name: 'Resurrection', description: 'The resurrection of Christ and believers',
    tags: ['life', 'death', 'glorification'],
    references: [
      ref(46,15,20), ref(46,15,52), ref(43,11,25), ref(43,11,26), ref(45,6,5),
      ref(50,3,20), ref(50,3,21), ref(62,3,2), ref(52,4,16),
    ],
  },
  {
    id: 'scripture', name: 'Scripture / Word of God', description: 'The inspiration and authority of Scripture',
    tags: ['Bible', 'inspiration', 'authority'],
    references: [
      ref(55,3,16), ref(55,3,17), ref(61,1,20), ref(61,1,21), ref(19,119,105),
      ref(19,119,11), ref(58,4,12), ref(43,17,17), ref(45,15,4),
    ],
  },
]

export class TopicalIndex {
  private topics = new Map<string, TopicEntry>(NAVE_TOPICS.map(t => [t.id, t]))

  search(query: string): TopicSearchResult {
    if (!query.trim()) return { topics: NAVE_TOPICS, total: NAVE_TOPICS.length }
    const q = query.toLowerCase()
    const results = [...this.topics.values()].filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q) ||
      t.tags?.some(tag => tag.toLowerCase().includes(q))
    )
    return { topics: results, total: results.length }
  }

  get(id: string): TopicEntry | undefined {
    return this.topics.get(id)
  }

  getAll(): TopicEntry[] {
    return [...this.topics.values()]
  }

  getByTag(tag: string): TopicEntry[] {
    return [...this.topics.values()].filter(t => t.tags?.includes(tag))
  }

  getByRef(ref: VerseRef): TopicEntry[] {
    return [...this.topics.values()].filter(t =>
      t.references.some(r => r.book === ref.book && r.chapter === ref.chapter && r.verse === ref.verse)
    )
  }

  addTopic(topic: TopicEntry): void {
    this.topics.set(topic.id, topic)
  }

  get count(): number {
    return this.topics.size
  }
}
