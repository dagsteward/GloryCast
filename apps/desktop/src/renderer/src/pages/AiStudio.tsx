import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Sparkles, FileText, Instagram, Newspaper, BookOpen,
  MessageSquare, Mic2, Upload, Download, Copy, RefreshCw, Wand2
} from 'lucide-react'
import { cn } from '../lib/utils'

type ContentType = 'devotional' | 'newsletter' | 'social' | 'summary' | 'bible-study' | 'prayer'

const CONTENT_TYPES = [
  { id: 'devotional' as ContentType, icon: BookOpen, label: 'Devotional', description: 'Daily devotional from sermon', color: 'text-purple-400', bg: 'bg-purple-600/10 border-purple-500/20' },
  { id: 'newsletter' as ContentType, icon: Newspaper, label: 'Newsletter', description: 'Church newsletter article', color: 'text-blue-400', bg: 'bg-blue-600/10 border-blue-500/20' },
  { id: 'social' as ContentType, icon: Instagram, label: 'Social Media', description: 'Instagram, Facebook, X posts', color: 'text-orange-400', bg: 'bg-orange-600/10 border-orange-500/20' },
  { id: 'summary' as ContentType, icon: FileText, label: 'Sermon Summary', description: 'Key points & outline', color: 'text-emerald-400', bg: 'bg-emerald-600/10 border-emerald-500/20' },
  { id: 'bible-study' as ContentType, icon: BookOpen, label: 'Bible Study', description: 'Study guide with questions', color: 'text-cyan-400', bg: 'bg-cyan-600/10 border-cyan-500/20' },
  { id: 'prayer' as ContentType, icon: MessageSquare, label: 'Prayer Points', description: 'Intercession & prayer list', color: 'text-yellow-400', bg: 'bg-yellow-600/10 border-yellow-500/20' },
]

const SAMPLE_TRANSCRIPT = `Good morning, church! Turn with me to Romans chapter 8, verse 28. "And we know that in all things God works for the good of those who love him, who have been called according to his purpose."

This morning I want to talk about God's faithfulness. Even when life is hard, even when we face trials, God is working behind the scenes. The storm you're going through right now is not the end of your story.

Remember what Paul wrote in Philippians 4:13 — "I can do all this through him who gives me strength." This is not a promise that life will be easy. It's a promise that God will be with you through it all...`

export function AiStudioPage() {
  const [selectedType, setSelectedType] = useState<ContentType>('summary')
  const [transcript, setTranscript] = useState(SAMPLE_TRANSCRIPT)
  const [generatedContent, setGeneratedContent] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [tone, setTone] = useState<'formal' | 'conversational' | 'inspirational'>('conversational')

  const generate = async () => {
    setIsGenerating(true)
    setGeneratedContent('')

    // Simulate streaming generation
    const content = getMockContent(selectedType)
    for (let i = 0; i < content.length; i += 8) {
      await new Promise(r => setTimeout(r, 30))
      setGeneratedContent(content.slice(0, i + 8))
    }
    setIsGenerating(false)
  }

  const copy = () => {
    navigator.clipboard.writeText(generatedContent)
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/[0.06] bg-[#0a0a12] shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-orange-400" />
          <h2 className="text-sm font-semibold text-white/80">AI Content Studio</h2>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/40">
          <span>Model: GPT-4o / Claude 3.5</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Input + controls */}
        <div className="w-96 shrink-0 flex flex-col border-r border-white/[0.05] overflow-hidden">
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {/* Content type selector */}
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-widest block mb-2">
                Output Type
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {CONTENT_TYPES.map(type => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={cn(
                      'flex items-center gap-2 p-2 rounded-lg border text-left transition-all',
                      selectedType === type.id
                        ? type.bg
                        : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]',
                    )}
                  >
                    <type.icon size={12} className={selectedType === type.id ? type.color : 'text-white/30'} />
                    <span className={cn('text-[11px] font-medium', selectedType === type.id ? 'text-white/80' : 'text-white/40')}>
                      {type.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tone selector */}
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-widest block mb-2">
                Tone
              </label>
              <div className="flex gap-1.5">
                {(['formal', 'conversational', 'inspirational'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTone(t)}
                    className={cn(
                      'flex-1 py-1.5 rounded-lg text-[11px] font-medium capitalize transition-colors',
                      tone === t
                        ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                        : 'bg-white/[0.04] text-white/40 border border-white/[0.06] hover:text-white/60',
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Transcript input */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] text-white/40 uppercase tracking-widest">
                  Sermon Transcript
                </label>
                <div className="flex gap-1">
                  <button className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-colors">
                    <Mic2 size={10} />
                    Record
                  </button>
                  <button className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-colors">
                    <Upload size={10} />
                    Import
                  </button>
                </div>
              </div>
              <textarea
                value={transcript}
                onChange={e => setTranscript(e.target.value)}
                rows={12}
                className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-white/65 placeholder:text-white/25 outline-none focus:border-orange-500/40 resize-none transition-colors leading-relaxed"
                placeholder="Paste sermon transcript here..."
              />
            </div>
          </div>

          {/* Generate button */}
          <div className="p-4 border-t border-white/[0.05]">
            <button
              onClick={generate}
              disabled={isGenerating || !transcript.trim()}
              className={cn(
                'w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all',
                isGenerating
                  ? 'bg-orange-600/50 text-orange-300 cursor-not-allowed'
                  : 'bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-400 hover:to-purple-500 text-white glow-orange',
              )}
            >
              {isGenerating ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 size={14} />
                  Generate Content
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right: Generated output */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.05] shrink-0">
            <span className="text-xs font-medium text-white/50">
              {CONTENT_TYPES.find(t => t.id === selectedType)?.label ?? 'Output'}
            </span>
            {generatedContent && (
              <div className="flex items-center gap-2">
                <button
                  onClick={copy}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] text-white/50 hover:text-white/80 hover:bg-white/[0.05] transition-colors"
                >
                  <Copy size={11} />
                  Copy
                </button>
                <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] text-white/50 hover:text-white/80 hover:bg-white/[0.05] transition-colors">
                  <Download size={11} />
                  Export
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {generatedContent ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="prose prose-invert prose-sm max-w-none"
              >
                <div className="text-sm text-white/75 leading-relaxed whitespace-pre-wrap">
                  {generatedContent}
                  {isGenerating && (
                    <span className="inline-block w-0.5 h-4 bg-orange-400 ml-0.5 animate-pulse" />
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-purple-600/20 border border-white/10 flex items-center justify-center mb-4">
                  <Wand2 size={24} className="text-white/30" />
                </div>
                <p className="text-sm text-white/30 mb-1">Ready to generate</p>
                <p className="text-xs text-white/20">
                  Select a content type, paste your transcript, and click Generate
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function getMockContent(type: ContentType): string {
  const content: Record<ContentType, string> = {
    summary: `# Sermon Summary: God's Faithfulness in Every Season

**Scripture:** Romans 8:28, Philippians 4:13
**Speaker:** Pastor [Name]
**Date:** ${new Date().toLocaleDateString()}

## Main Theme
God's faithfulness is not conditional on our circumstances. He works in ALL things — both the good and the difficult — for the good of those who love Him.

## Key Points

**1. God's Promise is Universal**
Romans 8:28 doesn't say "some things" — it says ALL things. This includes our trials, our failures, our darkest moments. God is sovereignly working through everything.

**2. Strength Through Christ**
Paul's declaration in Philippians 4:13 wasn't written from a comfortable place — it was written from prison. The strength we have isn't our own; it flows from our relationship with Christ.

**3. Trusting in the Process**
Often we want to see the outcome before we trust the process. But faith means trusting God's character even when we can't see His plan.

## Application
- Identify one difficult area in your life where you need to trust God's sovereignty
- Memorize Romans 8:28 this week
- Share one testimony of God's faithfulness with someone this week

## Memory Verse
*"And we know that in all things God works for the good of those who love him, who have been called according to his purpose."* — Romans 8:28 (NIV)`,

    devotional: `# Daily Devotional: When God Works in All Things

**Scripture:** Romans 8:28
**Theme:** Trusting God's Plan

---

Have you ever been in a season where nothing seemed to make sense? Where the promises of God felt distant, and the trials felt overwhelming?

The Apostle Paul wrote to the church in Rome with a profound declaration: God works in **all** things. Not just the pleasant things. Not just the Sunday morning moments. All things.

**Today's Reflection**

Think about the last difficult season you walked through. Looking back now, can you see how God was working? Often, it's only in hindsight that we see the full tapestry of His purposes.

The word "know" in Romans 8:28 carries weight — it's not wishful thinking or blind optimism. It's a settled conviction rooted in the character of God. We *know* because we know *Him*.

**Prayer**

Father, help me to trust You in the seasons that don't make sense. Remind me today that You are working in all things — even now — for my good and Your glory. Give me eyes to see Your hand at work. In Jesus' name, Amen.

**Action Step**

Write down one thing in your current season that you're struggling to trust God with. Then write Romans 8:28 next to it as a declaration of faith.`,

    newsletter: `# From the Pastor's Desk

Dear Church Family,

What a powerful Sunday we had together! The presence of God was tangible as we worshipped and opened the Word together.

Our focus from Romans 8:28 continues to resonate with many of you — and rightfully so. The truth that God works in **all** things is not just a comforting thought; it's a foundational truth that should shape how we navigate every season of life.

**Ministry Updates**

Our midweek Bible study continues every Wednesday at 7PM. We're currently walking through the book of Romans, and the depth of Paul's theology is transforming lives.

The prayer team has also launched extended prayer hours every Friday from 6-8AM. We'd love to see you join us.

**Community Needs**

We're collecting non-perishable food items through the end of the month. Drop-off is at the welcome desk every Sunday.

**Coming Up**

Join us next Sunday as we continue in Romans 8, exploring what it means to be "more than conquerors." Bring a friend — we believe God has a word for them too.

In His Service,
Pastor [Name]`,

    social: `📖 **SUNDAY RECAP**

"And we know that in all things God works for the good of those who love him." — Romans 8:28

Today's message was a powerful reminder that God is ALWAYS at work — even when we can't see it. 🙏

Your trial is not your testimony... yet. But God is writing something beautiful through it.

Tag someone who needs this reminder today! ❤️

#FaithOverFear #RomansEight #GodIsGood #SundayService #ChurchFamily #BibleVerse #ChristianLiving

---

📸 Instagram Story Version:
"ALL things work together. Not some things. Not the easy things. ALL things. 🔥 Romans 8:28"

---

🐦 Twitter/X Version:
God doesn't waste anything. Your trials, your failures, your confusion — He's working through it ALL. Romans 8:28 hits different when you're in the middle of a storm. 🙌 #Faith`,

    'bible-study': `# Bible Study Guide: Romans 8:28 — God's Sovereignty in All Things

**Study Overview:** 4-week series
**Target Audience:** Small groups, Sunday school

---

## Week 1: Understanding "All Things"

**Opening Scripture:** Romans 8:28

**Discussion Questions:**
1. What does the phrase "all things" mean to you personally? Can you think of a time when God worked through a difficult situation?
2. How is Paul's use of "we know" different from "we hope" or "we think"?
3. What makes it difficult to believe that God is working in all things during hard seasons?

**Deep Dive:**
The Greek word *synergei* (works together) implies active cooperation — God is not passive but actively engaged in orchestrating all circumstances for His purposes.

**Application:**
- Read the full context: Romans 8:18-30
- Journal about one "all things" moment in your own life

---

## Week 2: Called According to His Purpose

**Focus:** The latter part of Romans 8:28 — "called according to his purpose"

**Discussion Questions:**
1. What does it mean to be "called according to His purpose"?
2. How does knowing we are called change how we face adversity?
3. Read Ephesians 1:11 alongside Romans 8:28. What do these verses say together about God's sovereignty?

**Memory Verse:** Jeremiah 29:11`,

    prayer: `# Prayer Points — Sunday, ${new Date().toLocaleDateString()}
**Based on: Romans 8:28 | "God Works in All Things"**

---

## Personal Prayer

🙏 **For Faith in the Storm**
Lord, we pray for every person in our congregation who is walking through a difficult season. Strengthen their faith to believe that You are working — even now — in all things for their good.

🙏 **For Trust in Your Timing**
Father, we confess our tendency to want instant answers. Teach us to trust Your process. Remind us that Your timing is perfect, even when we don't understand it.

🙏 **For Those Facing Health Challenges**
We lift up [names] and all who are facing illness or physical challenges. Let Romans 8:28 be their anchor — You are working in this too.

---

## Corporate Prayer

🙏 **For Our Church Community**
Lord, bind us together in love. Make us a community where people can bring their trials and find both truth and compassion.

🙏 **For Our City and Nation**
We pray for our leaders and our nation. In a time of division, let the Church be a beacon of Your peace and wisdom.

🙏 **For Our Missionaries**
We stand in prayer with our missionaries serving globally. Protect them, provide for them, and use them mightily.

---

## Declaration

*We declare today that NO circumstance in our lives is outside of God's sovereign care. He who began a good work in us will bring it to completion. (Philippians 1:6)*`,
  }
  return content[type]
}
