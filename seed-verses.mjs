// ─────────────────────────────────────────────────────────────────────────────
// seed-verses.mjs — curated public-domain KJV verses for AI Copilot detection
//
// The base seed (apps/backend/prisma/seed.ts) only loads 20 book metadata rows,
// leaving BibleVerse empty — so the /bible/reference endpoint returns no text.
// This script upserts a set of commonly-spoken worship/sermon verses using the
// King James Version, which is PUBLIC DOMAIN (NIV/ESV/NKJV are copyrighted and
// must never be hardcoded).
//
// Run from repo root:  node seed-verses.mjs
// Requires the backend's @prisma/client (already installed under apps/backend).
// ─────────────────────────────────────────────────────────────────────────────

import { PrismaClient } from './node_modules/@prisma/client/index.js'

const prisma = new PrismaClient()

const TRANSLATION = 'KJV'

// bookId values match apps/backend/prisma/seed.ts (only these 20 are seeded).
const VERSES = [
  // ── Genesis (1) ──
  { bookId: 1,  chapter: 1,  verse: 1,  text: 'In the beginning God created the heaven and the earth.' },

  // ── Psalms (19) ──
  { bookId: 19, chapter: 23, verse: 1,  text: 'The LORD is my shepherd; I shall not want.' },
  { bookId: 19, chapter: 23, verse: 2,  text: 'He maketh me to lie down in green pastures: he leadeth me beside the still waters.' },
  { bookId: 19, chapter: 23, verse: 3,  text: 'He restoreth my soul: he leadeth me in the paths of righteousness for his name’s sake.' },
  { bookId: 19, chapter: 23, verse: 4,  text: 'Yea, though I walk through the valley of the shadow of death, I will fear no evil: for thou art with me; thy rod and thy staff they comfort me.' },
  { bookId: 19, chapter: 46, verse: 1,  text: 'God is our refuge and strength, a very present help in trouble.' },
  { bookId: 19, chapter: 46, verse: 10, text: 'Be still, and know that I am God: I will be exalted among the heathen, I will be exalted in the earth.' },
  { bookId: 19, chapter: 91, verse: 1,  text: 'He that dwelleth in the secret place of the most High shall abide under the shadow of the Almighty.' },
  { bookId: 19, chapter: 118, verse: 24, text: 'This is the day which the LORD hath made; we will rejoice and be glad in it.' },
  { bookId: 19, chapter: 119, verse: 105, text: 'Thy word is a lamp unto my feet, and a light unto my path.' },
  { bookId: 19, chapter: 121, verse: 1,  text: 'I will lift up mine eyes unto the hills, from whence cometh my help.' },
  { bookId: 19, chapter: 121, verse: 2,  text: 'My help cometh from the LORD, which made heaven and earth.' },

  // ── Proverbs (20) ──
  { bookId: 20, chapter: 3,  verse: 5,  text: 'Trust in the LORD with all thine heart; and lean not unto thine own understanding.' },
  { bookId: 20, chapter: 3,  verse: 6,  text: 'In all thy ways acknowledge him, and he shall direct thy paths.' },

  // ── Isaiah (23) ──
  { bookId: 23, chapter: 40, verse: 31, text: 'But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.' },
  { bookId: 23, chapter: 41, verse: 10, text: 'Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee; yea, I will uphold thee with the right hand of my righteousness.' },
  { bookId: 23, chapter: 53, verse: 5,  text: 'But he was wounded for our transgressions, he was bruised for our iniquities: the chastisement of our peace was upon him; and with his stripes we are healed.' },

  // ── Matthew (40) ──
  { bookId: 40, chapter: 6,  verse: 33, text: 'But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you.' },
  { bookId: 40, chapter: 11, verse: 28, text: 'Come unto me, all ye that labour and are heavy laden, and I will give you rest.' },
  { bookId: 40, chapter: 28, verse: 19, text: 'Go ye therefore, and teach all nations, baptizing them in the name of the Father, and of the Son, and of the Holy Ghost:' },
  { bookId: 40, chapter: 28, verse: 20, text: 'Teaching them to observe all things whatsoever I have commanded you: and, lo, I am with you alway, even unto the end of the world. Amen.' },

  // ── Mark (41) ──
  { bookId: 41, chapter: 16, verse: 15, text: 'And he said unto them, Go ye into all the world, and preach the gospel to every creature.' },

  // ── Luke (42) ──
  { bookId: 42, chapter: 1,  verse: 37, text: 'For with God nothing shall be impossible.' },

  // ── John (43) ──
  { bookId: 43, chapter: 1,  verse: 1,  text: 'In the beginning was the Word, and the Word was with God, and the Word was God.' },
  { bookId: 43, chapter: 3,  verse: 16, text: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.' },
  { bookId: 43, chapter: 3,  verse: 17, text: 'For God sent not his Son into the world to condemn the world; but that the world through him might be saved.' },
  { bookId: 43, chapter: 8,  verse: 12, text: 'Then spake Jesus again unto them, saying, I am the light of the world: he that followeth me shall not walk in darkness, but shall have the light of life.' },
  { bookId: 43, chapter: 14, verse: 6,  text: 'Jesus saith unto him, I am the way, the truth, and the life: no man cometh unto the Father, but by me.' },
  { bookId: 43, chapter: 14, verse: 27, text: 'Peace I leave with you, my peace I give unto you: not as the world giveth, give I unto you. Let not your heart be troubled, neither let it be afraid.' },

  // ── Acts (44) ──
  { bookId: 44, chapter: 1,  verse: 8,  text: 'But ye shall receive power, after that the Holy Ghost is come upon you: and ye shall be witnesses unto me both in Jerusalem, and in all Judaea, and in Samaria, and unto the uttermost part of the earth.' },
  { bookId: 44, chapter: 4,  verse: 12, text: 'Neither is there salvation in any other: for there is none other name under heaven given among men, whereby we must be saved.' },

  // ── Romans (45) ──
  { bookId: 45, chapter: 3,  verse: 23, text: 'For all have sinned, and come short of the glory of God;' },
  { bookId: 45, chapter: 5,  verse: 8,  text: 'But God commendeth his love toward us, in that, while we were yet sinners, Christ died for us.' },
  { bookId: 45, chapter: 6,  verse: 23, text: 'For the wages of sin is death; but the gift of God is eternal life through Jesus Christ our Lord.' },
  { bookId: 45, chapter: 8,  verse: 28, text: 'And we know that all things work together for good to them that love God, to them who are the called according to his purpose.' },
  { bookId: 45, chapter: 10, verse: 9,  text: 'That if thou shalt confess with thy mouth the Lord Jesus, and shalt believe in thine heart that God hath raised him from the dead, thou shalt be saved.' },
  { bookId: 45, chapter: 12, verse: 2,  text: 'And be not conformed to this world: but be ye transformed by the renewing of your mind, that ye may prove what is that good, and acceptable, and perfect, will of God.' },

  // ── 1 Corinthians (46) ──
  { bookId: 46, chapter: 13, verse: 4,  text: 'Charity suffereth long, and is kind; charity envieth not; charity vaunteth not itself, is not puffed up,' },
  { bookId: 46, chapter: 13, verse: 13, text: 'And now abideth faith, hope, charity, these three; but the greatest of these is charity.' },

  // ── 2 Corinthians (47) ──
  { bookId: 47, chapter: 5,  verse: 17, text: 'Therefore if any man be in Christ, he is a new creature: old things are passed away; behold, all things are become new.' },
  { bookId: 47, chapter: 12, verse: 9,  text: 'And he said unto me, My grace is sufficient for thee: for my strength is made perfect in weakness. Most gladly therefore will I rather glory in my infirmities, that the power of Christ may rest upon me.' },

  // ── Galatians (48) ──
  { bookId: 48, chapter: 2,  verse: 20, text: 'I am crucified with Christ: nevertheless I live; yet not I, but Christ liveth in me: and the life which I now live in the flesh I live by the faith of the Son of God, who loved me, and gave himself for me.' },
  { bookId: 48, chapter: 5,  verse: 22, text: 'But the fruit of the Spirit is love, joy, peace, longsuffering, gentleness, goodness, faith,' },
  { bookId: 48, chapter: 5,  verse: 23, text: 'Meekness, temperance: against such there is no law.' },

  // ── Ephesians (49) ──
  { bookId: 49, chapter: 2,  verse: 8,  text: 'For by grace are ye saved through faith; and that not of yourselves: it is the gift of God:' },
  { bookId: 49, chapter: 2,  verse: 9,  text: 'Not of works, lest any man should boast.' },

  // ── Philippians (50) ──
  { bookId: 50, chapter: 4,  verse: 6,  text: 'Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God.' },
  { bookId: 50, chapter: 4,  verse: 7,  text: 'And the peace of God, which passeth all understanding, shall keep your hearts and minds through Christ Jesus.' },
  { bookId: 50, chapter: 4,  verse: 13, text: 'I can do all things through Christ which strengtheneth me.' },

  // ── 1 Timothy (54) ──
  { bookId: 54, chapter: 2,  verse: 5,  text: 'For there is one God, and one mediator between God and men, the man Christ Jesus;' },

  // ── Hebrews (58) ──
  { bookId: 58, chapter: 11, verse: 1,  text: 'Now faith is the substance of things hoped for, the evidence of things not seen.' },
  { bookId: 58, chapter: 13, verse: 8,  text: 'Jesus Christ the same yesterday, and to day, and for ever.' },

  // ── 1 John (62) ──
  { bookId: 62, chapter: 1,  verse: 9,  text: 'If we confess our sins, he is faithful and just to forgive us our sins, and to cleanse us from all unrighteousness.' },
  { bookId: 62, chapter: 4,  verse: 8,  text: 'He that loveth not knoweth not God; for God is love.' },

  // ── Revelation (66) ──
  { bookId: 66, chapter: 3,  verse: 20, text: 'Behold, I stand at the door, and knock: if any man hear my voice, and open the door, I will come in to him, and will sup with him, and he with me.' },
  { bookId: 66, chapter: 21, verse: 4,  text: 'And God shall wipe away all tears from their eyes; and there shall be no more death, neither sorrow, nor crying, neither shall there be any more pain: for the former things are passed away.' },
]

async function main() {
  console.log(`Seeding ${VERSES.length} public-domain ${TRANSLATION} verses...`)
  let count = 0
  for (const v of VERSES) {
    await prisma.bibleVerse.upsert({
      where: {
        bookId_chapter_verse_translation: {
          bookId:      v.bookId,
          chapter:     v.chapter,
          verse:       v.verse,
          translation: TRANSLATION,
        },
      },
      update: { text: v.text, searchText: v.text.toLowerCase() },
      create: {
        bookId:      v.bookId,
        chapter:     v.chapter,
        verse:       v.verse,
        translation: TRANSLATION,
        text:        v.text,
        searchText:  v.text.toLowerCase(),
      },
    })
    count++
  }
  console.log(`Done — upserted ${count} ${TRANSLATION} verses.`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
