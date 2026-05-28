import type { ReadingPlan, ReadingDay } from '../types/features.js'
import type { VerseRef } from '../types/bible.js'

// Built-in reading plans
const PLAN_TEMPLATES: Omit<ReadingPlan, 'startDate' | 'currentDay' | 'completionPercent'>[] = [
  {
    id: 'bible-year',
    name: 'Through the Bible in a Year',
    description: 'Read the entire Bible in 365 days — OT once, NT & Psalms twice',
    duration: 365,
    schedule: generateBibleInYear(),
  },
  {
    id: 'nt-90',
    name: 'New Testament in 90 Days',
    description: 'Read the entire New Testament in 90 days',
    duration: 90,
    schedule: generateNT90(),
  },
  {
    id: 'psalms-proverbs',
    name: 'Psalms & Proverbs in 30 Days',
    description: 'Read 5 Psalms and 1 chapter of Proverbs daily',
    duration: 31,
    schedule: generatePsalmsProverbs(),
  },
  {
    id: 'gospels',
    name: 'The Four Gospels in 40 Days',
    description: 'Journey through Matthew, Mark, Luke, and John',
    duration: 40,
    schedule: generateGospels(),
  },
  {
    id: 'mcheyne',
    name: "M'Cheyne One-Year Plan",
    description: 'Read four passages daily: two OT, two NT (R.M. M\'Cheyne, 1842)',
    duration: 365,
    schedule: generateMcheyne(),
  },
]

export class ReadingPlanManager {
  private activePlans = new Map<string, ReadingPlan>()

  getAvailablePlans(): Omit<ReadingPlan, 'startDate' | 'currentDay' | 'completionPercent'>[] {
    return PLAN_TEMPLATES
  }

  startPlan(templateId: string, startDate = Date.now()): ReadingPlan | null {
    const template = PLAN_TEMPLATES.find(t => t.id === templateId)
    if (!template) return null

    const plan: ReadingPlan = {
      ...template,
      schedule: template.schedule.map(d => ({ ...d })),
      startDate,
      currentDay: 1,
      completionPercent: 0,
    }
    this.activePlans.set(plan.id, plan)
    return plan
  }

  getActivePlan(id: string): ReadingPlan | undefined {
    return this.activePlans.get(id)
  }

  getAllActivePlans(): ReadingPlan[] {
    return [...this.activePlans.values()]
  }

  getCurrentDay(planId: string): ReadingDay | null {
    const plan = this.activePlans.get(planId)
    if (!plan || !plan.startDate) return null
    const elapsed = Math.floor((Date.now() - plan.startDate) / 86_400_000) + 1
    const dayIndex = Math.min(elapsed, plan.duration) - 1
    return plan.schedule[dayIndex] ?? null
  }

  markDayComplete(planId: string, day: number): boolean {
    const plan = this.activePlans.get(planId)
    if (!plan) return false
    const d = plan.schedule.find(d => d.day === day)
    if (!d) return false
    d.completed = true
    d.completedAt = Date.now()
    const completed = plan.schedule.filter(d => d.completed).length
    plan.completionPercent = Math.round((completed / plan.duration) * 100)
    return true
  }

  getTodayPassages(planId: string) {
    return this.getCurrentDay(planId)?.passages ?? []
  }
}

// ─── Plan generators ────────────────────────────────────────────────────────

function makeDay(day: number, passages: ReadingDay['passages']): ReadingDay {
  return { day, passages }
}

function ref(book: number, chapter: number, verse = 1): VerseRef {
  return { book, chapter, verse }
}

function generateBibleInYear(): ReadingDay[] {
  // Simplified: Genesis-Malachi OT, Matthew-Revelation NT spread over 365 days
  const plan: ReadingDay[] = []
  // 3 chapters OT + 1 chapter NT per day (rough approximation)
  // OT: 929 chapters, NT: 260 chapters
  const otChapters = buildChapterSequence(1, 39)   // 929 OT chapters
  const ntChapters = buildChapterSequence(40, 66)  // 260 NT chapters
  for (let day = 1; day <= 365; day++) {
    const otIdx = ((day - 1) * 3) % otChapters.length
    const ntIdx = Math.floor((day - 1) * 260 / 365)
    const passages: ReadingDay['passages'] = []
    if (otChapters[otIdx]) {
      const [b, c] = otChapters[otIdx]
      passages.push({ start: ref(b, c, 1), end: ref(b, c, 176), label: 'Old Testament' })
    }
    if (ntChapters[ntIdx]) {
      const [b, c] = ntChapters[ntIdx]
      passages.push({ start: ref(b, c, 1), end: ref(b, c, 176), label: 'New Testament' })
    }
    plan.push(makeDay(day, passages))
  }
  return plan
}

function generateNT90(): ReadingDay[] {
  const ntChapters = buildChapterSequence(40, 66) // 260 chapters
  const plan: ReadingDay[] = []
  for (let day = 1; day <= 90; day++) {
    const start = Math.floor((day - 1) * 260 / 90)
    const end = Math.floor(day * 260 / 90)
    const passages: ReadingDay['passages'] = []
    for (let i = start; i < end && i < ntChapters.length; i++) {
      const [b, c] = ntChapters[i]
      passages.push({ start: ref(b, c, 1), end: ref(b, c, 176) })
    }
    plan.push(makeDay(day, passages))
  }
  return plan
}

function generatePsalmsProverbs(): ReadingDay[] {
  const plan: ReadingDay[] = []
  for (let day = 1; day <= 31; day++) {
    const psalms: ReadingDay['passages'] = []
    for (let i = 0; i < 5; i++) {
      const ps = ((day - 1) * 5 + i) % 150 + 1
      psalms.push({ start: ref(19, ps), end: ref(19, ps, 176), label: `Psalm ${ps}` })
    }
    const prov = ((day - 1) % 31) + 1
    psalms.push({ start: ref(20, prov), end: ref(20, prov, 176), label: `Proverbs ${prov}` })
    plan.push(makeDay(day, psalms))
  }
  return plan
}

function generateGospels(): ReadingDay[] {
  const gospelChapters = buildChapterSequence(40, 43) // Matt, Mark, Luke, John = 89 chapters
  const plan: ReadingDay[] = []
  for (let day = 1; day <= 40; day++) {
    const start = Math.floor((day - 1) * gospelChapters.length / 40)
    const end = Math.floor(day * gospelChapters.length / 40)
    const passages: ReadingDay['passages'] = []
    for (let i = start; i < end; i++) {
      const [b, c] = gospelChapters[i]
      passages.push({ start: ref(b, c, 1), end: ref(b, c, 176) })
    }
    plan.push(makeDay(day, passages))
  }
  return plan
}

function generateMcheyne(): ReadingDay[] {
  // M'Cheyne: Family reading (OT) + Secret reading (NT + Psalms) — 4 chapters daily
  const otFamily = buildChapterSequence(1, 39)
  const ntSecret = buildChapterSequence(40, 66)
  const psalmsExtra = buildChapterSequence(19, 19)
  const plan: ReadingDay[] = []
  for (let day = 1; day <= 365; day++) {
    const i = day - 1
    const passages: ReadingDay['passages'] = []
    if (otFamily[i % otFamily.length]) {
      const [b, c] = otFamily[i % otFamily.length]
      passages.push({ start: ref(b, c, 1), end: ref(b, c, 176), label: 'OT Family' })
    }
    if (otFamily[(i + 182) % otFamily.length]) {
      const [b, c] = otFamily[(i + 182) % otFamily.length]
      passages.push({ start: ref(b, c, 1), end: ref(b, c, 176), label: 'OT Family (2)' })
    }
    if (ntSecret[i % ntSecret.length]) {
      const [b, c] = ntSecret[i % ntSecret.length]
      passages.push({ start: ref(b, c, 1), end: ref(b, c, 176), label: 'NT Secret' })
    }
    if (psalmsExtra[i % psalmsExtra.length]) {
      const [b, c] = psalmsExtra[i % psalmsExtra.length]
      passages.push({ start: ref(b, c, 1), end: ref(b, c, 176), label: 'Psalms' })
    }
    plan.push(makeDay(day, passages))
  }
  return plan
}

import { BIBLE_BOOKS } from '../data/books.js'
function buildChapterSequence(fromBook: number, toBook: number): [number, number][] {
  const seq: [number, number][] = []
  for (let b = fromBook; b <= toBook; b++) {
    const book = BIBLE_BOOKS.find(bk => bk.id === b)
    if (!book) continue
    for (let c = 1; c <= book.chapterCount; c++) seq.push([b, c])
  }
  return seq
}
