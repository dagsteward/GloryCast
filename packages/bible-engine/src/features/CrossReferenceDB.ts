import type { CrossReference, CrossReferenceResult } from '../types/features.js'
import type { VerseRef } from '../types/bible.js'
import { formatRef } from '../core/ReferenceParser.js'

/**
 * Treasury of Scripture Knowledge (TSK) cross-reference database.
 * Key format: "Book:Chapter:Verse" → array of target refs.
 */

// Compact encoding: [book, chapter, verse, book2, chapter2, verse2?, ...]
// Each group of 3 = one cross-reference
const TSK_COMPACT: Record<string, number[]> = {
  // Genesis
  '1:1:1':  [43,1,1, 58,11,3, 19,33,6, 19,90,2, 19,102,25, 23,40,21, 23,44,24, 45,1,20],
  '1:1:2':  [23,45,18, 23,34,11, 24,4,23],
  '1:3:3':  [19,33,6, 19,33,9, 47,4,6],
  '1:26:1': [1,5,1, 9,17,43, 45,8,29, 47,3,18],
  // Psalms
  '19:1:1': [40,5,3, 42,11,28, 59,1,25],
  '19:22:1':[40,27,46, 41,15,34],
  '19:23:1':[43,10,11, 23,40,11],
  '19:23:2':[19,78,52, 19,100,3],
  '19:23:4':[45,8,38, 43,14,27],
  '19:46:1':[23,12,2, 45,8,31],
  '19:91:1':[19,31,20, 40,4,6, 42,4,10],
  '19:103:1':[19,34,1, 19,34,2, 19,34,3],
  '19:119:105':[20,6,23, 47,4,6, 61,1,19],
  // Proverbs
  '20:3:5':[19,37,3, 23,26,4],
  '20:3:6':[19,32,8, 40,6,33],
  // Isaiah
  '23:40:31':[19,84,7, 45,8,1, 47,4,13, 50,4,13],
  '23:53:5':[45,4,25, 61,2,24, 23,53,6],
  '23:53:6':[45,3,23, 19,119,176],
  // Jeremiah
  '24:29:11':[45,8,28, 19,40,5],
  // Matthew
  '40:5:14':[50,2,15, 43,8,12, 43,9,5],
  '40:6:33':[42,12,31, 19,37,4, 45,14,17],
  '40:11:28':[43,7,37, 45,5,6, 66,22,17],
  '40:28:19':[41,16,15, 42,24,47, 44,1,8],
  '40:28:20':[23,43,2, 58,13,5],
  // John
  '43:1:1': [42,1,2, 19,33,6, 1,1,1, 58,1,2],
  '43:3:16':[45,5,8, 62,4,9, 62,4,10, 40,20,28, 42,1,35, 45,8,32],
  '43:3:17':[42,9,56, 43,5,45, 43,12,47],
  '43:10:10':[58,2,14, 42,15,24],
  '43:14:6':[44,4,12, 54,2,5, 58,10,20],
  '43:15:13':[45,5,8, 62,3,16],
  '43:16:33':[45,8,37, 40,28,20, 54,6,12],
  // Romans
  '45:3:23':[45,5,12, 1,3,6, 62,1,8],
  '45:5:8': [43,3,16, 62,4,10, 62,4,9],
  '45:6:23':[45,5,12, 45,8,2, 58,9,15],
  '45:8:28':[19,37,23, 19,91,14, 19,31,8, 23,43,2, 24,29,11],
  '45:8:38':[19,23,4, 45,8,1, 43,10,28, 42,10,19],
  '45:10:9':[44,16,31, 54,2,11],
  // 1 Corinthians
  '46:13:4':[45,12,10, 62,4,8, 50,4,5],
  '46:13:13':[45,5,5, 45,12,9, 50,1,9],
  // Ephesians
  '49:6:10':[54,1,18, 50,4,13, 47,12,9],
  '49:6:11':[45,13,12, 54,6,12, 61,5,9],
  // Philippians
  '50:4:6': [60,5,7, 40,6,25, 19,37,5, 19,55,22],
  '50:4:7': [43,14,27, 45,15,33, 19,119,165],
  '50:4:13':[47,12,9, 47,12,10, 23,40,31, 19,84,11],
  // Colossians
  '51:3:23':[49,6,6, 42,17,10],
  // 2 Timothy
  '55:3:16':[61,1,20, 61,1,21, 45,15,4],
  '55:3:17':[19,119,98, 19,119,99],
  // Hebrews
  '58:11:1':[45,4,21, 47,5,7, 49,3,12],
  '58:12,1':[45,15,1, 50,3,13, 47,12,1],
  // James
  '59:1:2': [45,5,3, 60,1,6, 19,34,19],
  '59:1:5': [20,2,3, 20,2,6, 19,32,8, 62,5,14],
  // 1 Peter
  '60:5:7': [19,37,5, 19,55,22, 50,4,6, 40,6,25],
  // Revelation
  '66:3:20':[40,11,28, 43,14,23, 42,12,36],
  '66:21:4':[23,25,8, 19,84,1, 23,35,10],
}

function makeKey(book: number, chapter: number, verse: number): string {
  return `${book}:${chapter}:${verse}`
}

function decodeRefs(arr: number[]): CrossReference[] {
  const refs: CrossReference[] = []
  for (let i = 0; i < arr.length; i += 3) {
    if (arr[i] && arr[i + 1] && arr[i + 2]) {
      refs.push({
        source: { book: 0, chapter: 0, verse: 0 },
        target: { book: arr[i], chapter: arr[i + 1], verse: arr[i + 2] },
        weight: 5,
      })
    }
  }
  return refs
}

export class CrossReferenceDB {
  private extra = new Map<string, CrossReference[]>()

  get(ref: VerseRef): CrossReferenceResult {
    const key = makeKey(ref.book, ref.chapter, ref.verse)
    const built = decodeRefs(TSK_COMPACT[key] ?? [])
    const user = this.extra.get(key) ?? []
    const all = [...built, ...user]

    return {
      ref,
      reference: formatRef(ref),
      references: all.map(cr => ({
        ref: cr.target,
        reference: formatRef(cr.target),
        note: cr.note,
      })),
    }
  }

  /** Add a user-defined cross-reference */
  add(source: VerseRef, target: VerseRef, note?: string): void {
    const key = makeKey(source.book, source.chapter, source.verse)
    if (!this.extra.has(key)) this.extra.set(key, [])
    this.extra.get(key)!.push({ source, target, note })
  }

  /** Find all verses that reference the given verse */
  findReverseRefs(ref: VerseRef): VerseRef[] {
    const target = makeKey(ref.book, ref.chapter, ref.verse)
    const sources: VerseRef[] = []
    for (const [sourceKey, arr] of Object.entries(TSK_COMPACT)) {
      const refs = decodeRefs(arr)
      for (const cr of refs) {
        if (makeKey(cr.target.book, cr.target.chapter, cr.target.verse) === target) {
          const [b, c, v] = sourceKey.split(':').map(Number)
          sources.push({ book: b, chapter: c, verse: v })
        }
      }
    }
    return sources
  }

  get totalEntries(): number {
    return Object.keys(TSK_COMPACT).length
  }
}
