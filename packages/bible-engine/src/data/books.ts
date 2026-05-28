import type { BibleBook } from '../types/bible.js'

export const BIBLE_BOOKS: BibleBook[] = [
  // ─── Old Testament ──────────────────────────────────────────────────────
  { id: 1,  name: 'Genesis',          shortName: 'Gen',  abbreviations: ['Gen','Ge','Gn'],                    testament: 'OT', genre: 'Law',           chapterCount: 50,  verseCount: 1533, author: 'Moses',        period: '~1445–1405 BC' },
  { id: 2,  name: 'Exodus',           shortName: 'Exo',  abbreviations: ['Exo','Ex'],                         testament: 'OT', genre: 'Law',           chapterCount: 40,  verseCount: 1213, author: 'Moses',        period: '~1445–1405 BC' },
  { id: 3,  name: 'Leviticus',        shortName: 'Lev',  abbreviations: ['Lev','Le','Lv'],                    testament: 'OT', genre: 'Law',           chapterCount: 27,  verseCount: 859,  author: 'Moses',        period: '~1445–1405 BC' },
  { id: 4,  name: 'Numbers',          shortName: 'Num',  abbreviations: ['Num','Nu','Nm','Nb'],               testament: 'OT', genre: 'Law',           chapterCount: 36,  verseCount: 1288, author: 'Moses',        period: '~1445–1405 BC' },
  { id: 5,  name: 'Deuteronomy',      shortName: 'Deu',  abbreviations: ['Deu','Dt','De'],                    testament: 'OT', genre: 'Law',           chapterCount: 34,  verseCount: 959,  author: 'Moses',        period: '~1405 BC' },
  { id: 6,  name: 'Joshua',           shortName: 'Jos',  abbreviations: ['Jos','Josh','Jsh'],                 testament: 'OT', genre: 'History',       chapterCount: 24,  verseCount: 658,  author: 'Joshua',       period: '~1405–1380 BC' },
  { id: 7,  name: 'Judges',           shortName: 'Jdg',  abbreviations: ['Jdg','Jug','Judg'],                 testament: 'OT', genre: 'History',       chapterCount: 21,  verseCount: 618,  author: 'Samuel',       period: '~1380–1050 BC' },
  { id: 8,  name: 'Ruth',             shortName: 'Rut',  abbreviations: ['Rut','Ru'],                         testament: 'OT', genre: 'History',       chapterCount: 4,   verseCount: 85,   author: 'Samuel',       period: '~1100–1011 BC' },
  { id: 9,  name: '1 Samuel',         shortName: '1Sa',  abbreviations: ['1Sa','1Sam','1 Sam','1S'],          testament: 'OT', genre: 'History',       chapterCount: 31,  verseCount: 810,  author: 'Samuel',       period: '~1100–1010 BC' },
  { id: 10, name: '2 Samuel',         shortName: '2Sa',  abbreviations: ['2Sa','2Sam','2 Sam','2S'],          testament: 'OT', genre: 'History',       chapterCount: 24,  verseCount: 695,  author: 'Nathan/Gad',   period: '~1010–970 BC' },
  { id: 11, name: '1 Kings',          shortName: '1Ki',  abbreviations: ['1Ki','1Kin','1 Kgs','1K'],          testament: 'OT', genre: 'History',       chapterCount: 22,  verseCount: 816,  author: 'Jeremiah',     period: '~970–850 BC' },
  { id: 12, name: '2 Kings',          shortName: '2Ki',  abbreviations: ['2Ki','2Kin','2 Kgs','2K'],          testament: 'OT', genre: 'History',       chapterCount: 25,  verseCount: 719,  author: 'Jeremiah',     period: '~850–586 BC' },
  { id: 13, name: '1 Chronicles',     shortName: '1Ch',  abbreviations: ['1Ch','1Chr','1Chron','1 Chr'],      testament: 'OT', genre: 'History',       chapterCount: 29,  verseCount: 942,  author: 'Ezra',         period: '~450–425 BC' },
  { id: 14, name: '2 Chronicles',     shortName: '2Ch',  abbreviations: ['2Ch','2Chr','2Chron','2 Chr'],      testament: 'OT', genre: 'History',       chapterCount: 36,  verseCount: 822,  author: 'Ezra',         period: '~450–425 BC' },
  { id: 15, name: 'Ezra',             shortName: 'Ezr',  abbreviations: ['Ezr','Ez'],                         testament: 'OT', genre: 'History',       chapterCount: 10,  verseCount: 280,  author: 'Ezra',         period: '~457–444 BC' },
  { id: 16, name: 'Nehemiah',         shortName: 'Neh',  abbreviations: ['Neh','Ne'],                         testament: 'OT', genre: 'History',       chapterCount: 13,  verseCount: 406,  author: 'Nehemiah',     period: '~445–420 BC' },
  { id: 17, name: 'Esther',           shortName: 'Est',  abbreviations: ['Est','Esth'],                       testament: 'OT', genre: 'History',       chapterCount: 10,  verseCount: 167,  author: 'Mordecai',     period: '~483–474 BC' },
  { id: 18, name: 'Job',              shortName: 'Job',  abbreviations: ['Job','Jb'],                         testament: 'OT', genre: 'Wisdom',        chapterCount: 42,  verseCount: 1070, author: 'Job/Moses',    period: '~2000–1800 BC' },
  { id: 19, name: 'Psalms',           shortName: 'Psa',  abbreviations: ['Psa','Ps','Psalm'],                 testament: 'OT', genre: 'Wisdom',        chapterCount: 150, verseCount: 2461, author: 'Various',      period: '~1440–586 BC' },
  { id: 20, name: 'Proverbs',         shortName: 'Pro',  abbreviations: ['Pro','Prov','Pr'],                  testament: 'OT', genre: 'Wisdom',        chapterCount: 31,  verseCount: 915,  author: 'Solomon',      period: '~971–686 BC' },
  { id: 21, name: 'Ecclesiastes',     shortName: 'Ecc',  abbreviations: ['Ecc','Eccl','Ec','Qoh'],            testament: 'OT', genre: 'Wisdom',        chapterCount: 12,  verseCount: 222,  author: 'Solomon',      period: '~940–931 BC' },
  { id: 22, name: 'Song of Solomon',  shortName: 'Sol',  abbreviations: ['Sol','SoS','Song','SS','Sng'],      testament: 'OT', genre: 'Wisdom',        chapterCount: 8,   verseCount: 117,  author: 'Solomon',      period: '~971–965 BC' },
  { id: 23, name: 'Isaiah',           shortName: 'Isa',  abbreviations: ['Isa','Is'],                         testament: 'OT', genre: 'MajorProphets', chapterCount: 66,  verseCount: 1292, author: 'Isaiah',       period: '~740–700 BC' },
  { id: 24, name: 'Jeremiah',         shortName: 'Jer',  abbreviations: ['Jer','Je'],                         testament: 'OT', genre: 'MajorProphets', chapterCount: 52,  verseCount: 1364, author: 'Jeremiah',     period: '~627–586 BC' },
  { id: 25, name: 'Lamentations',     shortName: 'Lam',  abbreviations: ['Lam','La'],                         testament: 'OT', genre: 'MajorProphets', chapterCount: 5,   verseCount: 154,  author: 'Jeremiah',     period: '~586 BC' },
  { id: 26, name: 'Ezekiel',          shortName: 'Eze',  abbreviations: ['Eze','Ezek','Ezk'],                 testament: 'OT', genre: 'MajorProphets', chapterCount: 48,  verseCount: 1273, author: 'Ezekiel',      period: '~593–571 BC' },
  { id: 27, name: 'Daniel',           shortName: 'Dan',  abbreviations: ['Dan','Da','Dn'],                    testament: 'OT', genre: 'MajorProphets', chapterCount: 12,  verseCount: 357,  author: 'Daniel',       period: '~606–536 BC' },
  { id: 28, name: 'Hosea',            shortName: 'Hos',  abbreviations: ['Hos','Ho'],                         testament: 'OT', genre: 'MinorProphets', chapterCount: 14,  verseCount: 197,  author: 'Hosea',        period: '~755–710 BC' },
  { id: 29, name: 'Joel',             shortName: 'Joe',  abbreviations: ['Joe','Joel','Jl'],                  testament: 'OT', genre: 'MinorProphets', chapterCount: 3,   verseCount: 73,   author: 'Joel',         period: '~835–796 BC' },
  { id: 30, name: 'Amos',             shortName: 'Amo',  abbreviations: ['Amo','Am'],                         testament: 'OT', genre: 'MinorProphets', chapterCount: 9,   verseCount: 146,  author: 'Amos',         period: '~760–750 BC' },
  { id: 31, name: 'Obadiah',          shortName: 'Oba',  abbreviations: ['Oba','Ob','Obad'],                  testament: 'OT', genre: 'MinorProphets', chapterCount: 1,   verseCount: 21,   author: 'Obadiah',      period: '~848–841 BC' },
  { id: 32, name: 'Jonah',            shortName: 'Jon',  abbreviations: ['Jon','Jnh'],                        testament: 'OT', genre: 'MinorProphets', chapterCount: 4,   verseCount: 48,   author: 'Jonah',        period: '~785–760 BC' },
  { id: 33, name: 'Micah',            shortName: 'Mic',  abbreviations: ['Mic','Mi'],                         testament: 'OT', genre: 'MinorProphets', chapterCount: 7,   verseCount: 105,  author: 'Micah',        period: '~742–687 BC' },
  { id: 34, name: 'Nahum',            shortName: 'Nah',  abbreviations: ['Nah','Na'],                         testament: 'OT', genre: 'MinorProphets', chapterCount: 3,   verseCount: 47,   author: 'Nahum',        period: '~663–612 BC' },
  { id: 35, name: 'Habakkuk',         shortName: 'Hab',  abbreviations: ['Hab','Hb'],                         testament: 'OT', genre: 'MinorProphets', chapterCount: 3,   verseCount: 56,   author: 'Habakkuk',     period: '~608–598 BC' },
  { id: 36, name: 'Zephaniah',        shortName: 'Zep',  abbreviations: ['Zep','Zeph','Zp'],                  testament: 'OT', genre: 'MinorProphets', chapterCount: 3,   verseCount: 53,   author: 'Zephaniah',    period: '~640–621 BC' },
  { id: 37, name: 'Haggai',           shortName: 'Hag',  abbreviations: ['Hag','Hg'],                         testament: 'OT', genre: 'MinorProphets', chapterCount: 2,   verseCount: 38,   author: 'Haggai',       period: '~520 BC' },
  { id: 38, name: 'Zechariah',        shortName: 'Zec',  abbreviations: ['Zec','Zech','Zk'],                  testament: 'OT', genre: 'MinorProphets', chapterCount: 14,  verseCount: 211,  author: 'Zechariah',    period: '~520–480 BC' },
  { id: 39, name: 'Malachi',          shortName: 'Mal',  abbreviations: ['Mal','Ml'],                         testament: 'OT', genre: 'MinorProphets', chapterCount: 4,   verseCount: 55,   author: 'Malachi',      period: '~430–400 BC' },
  // ─── New Testament ──────────────────────────────────────────────────────
  { id: 40, name: 'Matthew',          shortName: 'Mat',  abbreviations: ['Mat','Matt','Mt'],                  testament: 'NT', genre: 'Gospels',       chapterCount: 28,  verseCount: 1071, author: 'Matthew',      period: '~50–70 AD' },
  { id: 41, name: 'Mark',             shortName: 'Mar',  abbreviations: ['Mar','Mark','Mk','Mrk'],            testament: 'NT', genre: 'Gospels',       chapterCount: 16,  verseCount: 678,  author: 'Mark',         period: '~55–65 AD' },
  { id: 42, name: 'Luke',             shortName: 'Luk',  abbreviations: ['Luk','Luke','Lk'],                  testament: 'NT', genre: 'Gospels',       chapterCount: 24,  verseCount: 1151, author: 'Luke',         period: '~60–62 AD' },
  { id: 43, name: 'John',             shortName: 'Joh',  abbreviations: ['Joh','John','Jn'],                  testament: 'NT', genre: 'Gospels',       chapterCount: 21,  verseCount: 879,  author: 'John',         period: '~85–90 AD' },
  { id: 44, name: 'Acts',             shortName: 'Act',  abbreviations: ['Act','Acts','Ac'],                  testament: 'NT', genre: 'Acts',          chapterCount: 28,  verseCount: 1007, author: 'Luke',         period: '~62–64 AD' },
  { id: 45, name: 'Romans',           shortName: 'Rom',  abbreviations: ['Rom','Ro','Rm'],                    testament: 'NT', genre: 'PaulEpistles',  chapterCount: 16,  verseCount: 433,  author: 'Paul',         period: '~57 AD' },
  { id: 46, name: '1 Corinthians',    shortName: '1Co',  abbreviations: ['1Co','1Cor','1 Cor'],               testament: 'NT', genre: 'PaulEpistles',  chapterCount: 16,  verseCount: 437,  author: 'Paul',         period: '~55 AD' },
  { id: 47, name: '2 Corinthians',    shortName: '2Co',  abbreviations: ['2Co','2Cor','2 Cor'],               testament: 'NT', genre: 'PaulEpistles',  chapterCount: 13,  verseCount: 257,  author: 'Paul',         period: '~56 AD' },
  { id: 48, name: 'Galatians',        shortName: 'Gal',  abbreviations: ['Gal','Ga'],                         testament: 'NT', genre: 'PaulEpistles',  chapterCount: 6,   verseCount: 149,  author: 'Paul',         period: '~48–55 AD' },
  { id: 49, name: 'Ephesians',        shortName: 'Eph',  abbreviations: ['Eph','Ep'],                         testament: 'NT', genre: 'PaulEpistles',  chapterCount: 6,   verseCount: 155,  author: 'Paul',         period: '~60–62 AD' },
  { id: 50, name: 'Philippians',      shortName: 'Phi',  abbreviations: ['Phi','Phil','Php'],                 testament: 'NT', genre: 'PaulEpistles',  chapterCount: 4,   verseCount: 104,  author: 'Paul',         period: '~61–62 AD' },
  { id: 51, name: 'Colossians',       shortName: 'Col',  abbreviations: ['Col','Co'],                         testament: 'NT', genre: 'PaulEpistles',  chapterCount: 4,   verseCount: 95,   author: 'Paul',         period: '~60–62 AD' },
  { id: 52, name: '1 Thessalonians',  shortName: '1Th',  abbreviations: ['1Th','1Thess','1 Thess'],           testament: 'NT', genre: 'PaulEpistles',  chapterCount: 5,   verseCount: 89,   author: 'Paul',         period: '~51 AD' },
  { id: 53, name: '2 Thessalonians',  shortName: '2Th',  abbreviations: ['2Th','2Thess','2 Thess'],           testament: 'NT', genre: 'PaulEpistles',  chapterCount: 3,   verseCount: 47,   author: 'Paul',         period: '~51–52 AD' },
  { id: 54, name: '1 Timothy',        shortName: '1Ti',  abbreviations: ['1Ti','1Tim','1 Tim'],               testament: 'NT', genre: 'PaulEpistles',  chapterCount: 6,   verseCount: 113,  author: 'Paul',         period: '~62–66 AD' },
  { id: 55, name: '2 Timothy',        shortName: '2Ti',  abbreviations: ['2Ti','2Tim','2 Tim'],               testament: 'NT', genre: 'PaulEpistles',  chapterCount: 4,   verseCount: 83,   author: 'Paul',         period: '~66–67 AD' },
  { id: 56, name: 'Titus',            shortName: 'Tit',  abbreviations: ['Tit','Ti'],                         testament: 'NT', genre: 'PaulEpistles',  chapterCount: 3,   verseCount: 46,   author: 'Paul',         period: '~62–66 AD' },
  { id: 57, name: 'Philemon',         shortName: 'Phm',  abbreviations: ['Phm','Phlm','Pm'],                  testament: 'NT', genre: 'PaulEpistles',  chapterCount: 1,   verseCount: 25,   author: 'Paul',         period: '~60–62 AD' },
  { id: 58, name: 'Hebrews',          shortName: 'Heb',  abbreviations: ['Heb','He'],                         testament: 'NT', genre: 'GeneralEpistles', chapterCount: 13, verseCount: 303,  author: 'Unknown',      period: '~60–70 AD' },
  { id: 59, name: 'James',            shortName: 'Jam',  abbreviations: ['Jam','Jas','Jm'],                   testament: 'NT', genre: 'GeneralEpistles', chapterCount: 5,  verseCount: 108,  author: 'James',        period: '~44–49 AD' },
  { id: 60, name: '1 Peter',          shortName: '1Pe',  abbreviations: ['1Pe','1Pet','1 Pet'],               testament: 'NT', genre: 'GeneralEpistles', chapterCount: 5,  verseCount: 105,  author: 'Peter',        period: '~64–65 AD' },
  { id: 61, name: '2 Peter',          shortName: '2Pe',  abbreviations: ['2Pe','2Pet','2 Pet'],               testament: 'NT', genre: 'GeneralEpistles', chapterCount: 3,  verseCount: 61,   author: 'Peter',        period: '~64–66 AD' },
  { id: 62, name: '1 John',           shortName: '1Jo',  abbreviations: ['1Jo','1Jn','1 John','1Joh'],        testament: 'NT', genre: 'GeneralEpistles', chapterCount: 5,  verseCount: 105,  author: 'John',         period: '~90–95 AD' },
  { id: 63, name: '2 John',           shortName: '2Jo',  abbreviations: ['2Jo','2Jn','2 John','2Joh'],        testament: 'NT', genre: 'GeneralEpistles', chapterCount: 1,  verseCount: 13,   author: 'John',         period: '~90–95 AD' },
  { id: 64, name: '3 John',           shortName: '3Jo',  abbreviations: ['3Jo','3Jn','3 John','3Joh'],        testament: 'NT', genre: 'GeneralEpistles', chapterCount: 1,  verseCount: 14,   author: 'John',         period: '~90–95 AD' },
  { id: 65, name: 'Jude',             shortName: 'Jud',  abbreviations: ['Jud','Jde'],                        testament: 'NT', genre: 'GeneralEpistles', chapterCount: 1,  verseCount: 25,   author: 'Jude',         period: '~65–80 AD' },
  { id: 66, name: 'Revelation',       shortName: 'Rev',  abbreviations: ['Rev','Re','Rv'],                    testament: 'NT', genre: 'Revelation',    chapterCount: 22,  verseCount: 404,  author: 'John',         period: '~95 AD' },
]

export const OT_BOOKS = BIBLE_BOOKS.filter(b => b.testament === 'OT')
export const NT_BOOKS = BIBLE_BOOKS.filter(b => b.testament === 'NT')

export const BOOK_BY_ID = new Map<number, BibleBook>(BIBLE_BOOKS.map(b => [b.id, b]))

const abbrevMap = new Map<string, number>()
for (const book of BIBLE_BOOKS) {
  abbrevMap.set(book.name.toLowerCase(), book.id)
  abbrevMap.set(book.shortName.toLowerCase(), book.id)
  for (const abbr of book.abbreviations) {
    abbrevMap.set(abbr.toLowerCase().replace(/\./g, ''), book.id)
  }
}
export const BOOK_BY_ABBREV = abbrevMap
