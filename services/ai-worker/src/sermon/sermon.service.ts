import { Injectable, Logger } from '@nestjs/common'
import { HttpService }        from '@nestjs/axios'
import { firstValueFrom }     from 'rxjs'

@Injectable()
export class SermonService {
  private readonly logger      = new Logger(SermonService.name)
  private readonly ollamaUrl   = process.env.OLLAMA_URL   ?? 'http://localhost:11434'
  private readonly ollamaModel = process.env.OLLAMA_MODEL ?? 'mistral'

  constructor(private readonly http: HttpService) {}

  async generateSummary(transcript: string, speakerName?: string) {
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

    const { data } = await firstValueFrom(
      this.http.post(`${this.ollamaUrl}/api/generate`, {
        model:  this.ollamaModel,
        prompt,
        stream: false,
        options: { temperature: 0.7, num_predict: 800 },
      }),
    )

    return JSON.parse(data.response.trim())
  }

  async generateQuiz(transcript: string, count = 5) {
    const prompt = `Based on this sermon, generate ${count} multiple-choice quiz questions.
Sermon excerpt: "${transcript.slice(0, 3000)}"

Respond with JSON array:
[{"question":"...","options":[{"text":"...","isCorrect":true},{"text":"...","isCorrect":false},{"text":"...","isCorrect":false},{"text":"...","isCorrect":false}],"explanation":"..."}]`

    const { data } = await firstValueFrom(
      this.http.post(`${this.ollamaUrl}/api/generate`, {
        model: this.ollamaModel, prompt, stream: false,
        options: { temperature: 0.5, num_predict: 1200 },
      }),
    )

    return JSON.parse(data.response.trim())
  }

  async generateDevotional(transcript: string) {
    const prompt = `Based on this sermon excerpt, write a short daily devotional (3 paragraphs max):
"${transcript.slice(0, 2000)}"

Respond with JSON: {"title":"...","content":"...","scripture":"...","prayer":"..."}`

    const { data } = await firstValueFrom(
      this.http.post(`${this.ollamaUrl}/api/generate`, {
        model: this.ollamaModel, prompt, stream: false,
        options: { temperature: 0.8, num_predict: 600 },
      }),
    )

    return JSON.parse(data.response.trim())
  }
}
