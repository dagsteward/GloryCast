import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common'
import { ConfigService }             from '@nestjs/config'
import { HttpService }               from '@nestjs/axios'
import { firstValueFrom }            from 'rxjs'
import { ScriptureDetectorService, DetectedScripture } from './scripture-detector/scripture-detector.service'
import { PrismaService }             from '../prisma/prisma.service'

export interface SermonSummaryResult {
  title:       string
  summary:     string
  keyPoints:   string[]
  scriptures:  string[]
  devotional:  string
  prayer:      string
  socialPost:  string
}

@Injectable()
export class AIEngineService {
  private readonly logger = new Logger(AIEngineService.name)

  constructor(
    private readonly cfg:        ConfigService,
    private readonly prisma:     PrismaService,
    private readonly detector:   ScriptureDetectorService,
    private readonly http:       HttpService,
  ) {}

  // ── Scripture detection from text ─────────────────────────────────────────

  detectScripture(text: string): DetectedScripture[] {
    return this.detector.detectAll(text)
  }

  async detectAndSave(text: string, streamId?: string, churchId?: string) {
    const scriptures = this.detector.detectAll(text, streamId)

    if (scriptures.length && churchId) {
      await Promise.all(
        scriptures.map(s =>
          this.prisma.bibleReference.create({
            data: {
              churchId,
              streamId,
              bookId:      s.bookId,
              chapter:     s.chapter,
              verse:       s.verse,
              verseEnd:    s.verseEnd,
              detectedText: s.raw,
              confidence:  s.confidence,
            },
          }),
        ),
      )
    }
    return scriptures
  }

  // ── Whisper transcription via AI service ──────────────────────────────────

  async transcribeAudio(audioUrl: string, language = 'en'): Promise<{
    text: string; segments: any[]; scriptures: DetectedScripture[]
  }> {
    const aiUrl = this.cfg.get<string>('aiService.url')

    try {
      const { data } = await firstValueFrom(
        this.http.post(`${aiUrl}/transcribe`, { audioUrl, language }),
      )

      const scriptures = this.detector.detectAll(data.text)
      return { text: data.text, segments: data.segments ?? [], scriptures }
    } catch (err: any) {
      this.logger.error('Transcription failed', err.message)
      throw new InternalServerErrorException('Transcription service unavailable')
    }
  }

  // ── Sermon summary via Ollama (local LLM) ─────────────────────────────────

  async generateSermonSummary(transcript: string, speakerName?: string): Promise<SermonSummaryResult> {
    const ollamaUrl   = this.cfg.get<string>('aiService.ollamaUrl')
    const ollamaModel = this.cfg.get<string>('aiService.ollamaModel')

    const prompt = `You are a church content assistant. Analyze this sermon transcript and respond ONLY with valid JSON.

Sermon${speakerName ? ` by ${speakerName}` : ''}:
"""
${transcript.slice(0, 6000)}
"""

Respond with this exact JSON structure:
{
  "title": "Short compelling sermon title",
  "summary": "2-3 sentence summary of the sermon",
  "keyPoints": ["Point 1", "Point 2", "Point 3"],
  "scriptures": ["John 3:16", "Romans 8:28"],
  "devotional": "Short 3-4 sentence devotional thought based on the sermon",
  "prayer": "A short closing prayer inspired by the sermon",
  "socialPost": "An engaging social media post (max 280 chars)"
}`

    try {
      const { data } = await firstValueFrom(
        this.http.post(`${ollamaUrl}/api/generate`, {
          model:  ollamaModel,
          prompt,
          stream: false,
          options: { temperature: 0.7, num_predict: 800 },
        }),
      )

      const json = JSON.parse(data.response.trim())
      return json as SermonSummaryResult
    } catch (err: any) {
      this.logger.error('Ollama generation failed', err.message)
      // Return graceful fallback
      const detected = this.detector.detectAll(transcript)
      return {
        title:      `Sermon${speakerName ? ` by ${speakerName}` : ''}`,
        summary:    transcript.slice(0, 300) + '...',
        keyPoints:  [],
        scriptures: detected.map(s => s.reference),
        devotional: '',
        prayer:     '',
        socialPost: '',
      }
    }
  }

  // ── Audience engagement AI ────────────────────────────────────────────────

  async generateQuizFromSermon(transcript: string, count = 5): Promise<{
    question:    string
    options:     { text: string; isCorrect: boolean }[]
    explanation: string
  }[]> {
    const ollamaUrl   = this.cfg.get<string>('aiService.ollamaUrl')
    const ollamaModel = this.cfg.get<string>('aiService.ollamaModel')

    const prompt = `Based on this sermon, generate ${count} multiple-choice quiz questions.
Sermon excerpt: "${transcript.slice(0, 3000)}"

Respond with JSON array:
[{"question":"...","options":[{"text":"...","isCorrect":true},{"text":"...","isCorrect":false},{"text":"...","isCorrect":false},{"text":"...","isCorrect":false}],"explanation":"..."}]`

    try {
      const { data } = await firstValueFrom(
        this.http.post(`${ollamaUrl}/api/generate`, {
          model: ollamaModel, prompt, stream: false,
          options: { temperature: 0.5, num_predict: 1200 },
        }),
      )
      return JSON.parse(data.response.trim())
    } catch {
      return []
    }
  }
}
