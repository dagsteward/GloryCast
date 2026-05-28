import { Injectable, Logger } from '@nestjs/common'
import { InjectQueue }        from '@nestjs/bull'
import { Queue }              from 'bull'
import { exec }               from 'child_process'
import { promisify }          from 'util'
import * as path              from 'path'
import * as fs                from 'fs'

const execAsync = promisify(exec)

export interface TranscriptionResult {
  text:     string
  segments: { start: number; end: number; text: string }[]
  duration: number
  language: string
}

@Injectable()
export class WhisperService {
  private readonly logger      = new Logger(WhisperService.name)
  private readonly whisperBin  = process.env.WHISPER_BIN  ?? '/usr/local/bin/whisper'
  private readonly whisperModel = process.env.WHISPER_MODEL ?? 'base.en'
  private readonly tmpDir      = process.env.TMP_DIR ?? '/tmp/glorycast'

  constructor(@InjectQueue('transcription') private readonly queue: Queue) {
    fs.mkdirSync(this.tmpDir, { recursive: true })
  }

  async enqueueTranscription(audioUrl: string, language = 'en', callbackUrl?: string) {
    const job = await this.queue.add('transcribe', { audioUrl, language, callbackUrl })
    return { jobId: job.id, status: 'queued' }
  }

  async transcribe(audioUrl: string, language = 'en'): Promise<TranscriptionResult> {
    this.logger.log(`Transcribing: ${audioUrl}`)

    const tmpFile = path.join(this.tmpDir, `${Date.now()}.wav`)

    try {
      // Download audio
      await execAsync(`ffmpeg -y -i "${audioUrl}" -ar 16000 -ac 1 "${tmpFile}"`)

      // Run whisper.cpp
      const cmd = `"${this.whisperBin}" -m "${this.whisperModel}" -f "${tmpFile}" -l ${language} --output-json`
      const { stdout } = await execAsync(cmd, { timeout: 300_000 })

      const result = JSON.parse(stdout)
      return {
        text:     result.text?.trim() ?? '',
        segments: result.segments ?? [],
        duration: result.duration ?? 0,
        language: result.language ?? language,
      }
    } finally {
      try { fs.unlinkSync(tmpFile) } catch {}
    }
  }
}
