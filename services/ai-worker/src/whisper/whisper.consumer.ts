import { Processor, Process } from '@nestjs/bull'
import { Job }                from 'bull'
import { Logger }             from '@nestjs/common'
import { HttpService }        from '@nestjs/axios'
import { WhisperService }     from './whisper.service'
import { firstValueFrom }     from 'rxjs'

@Processor('transcription')
export class WhisperConsumer {
  private readonly logger = new Logger(WhisperConsumer.name)

  constructor(
    private readonly whisper: WhisperService,
    private readonly http:    HttpService,
  ) {}

  @Process('transcribe')
  async handleTranscription(job: Job<{ audioUrl: string; language: string; callbackUrl?: string }>) {
    const { audioUrl, language, callbackUrl } = job.data
    this.logger.log(`Processing transcription job ${job.id}: ${audioUrl}`)

    try {
      const result = await this.whisper.transcribe(audioUrl, language)
      await job.progress(100)

      if (callbackUrl) {
        await firstValueFrom(this.http.post(callbackUrl, { jobId: job.id, result }))
      }

      return result
    } catch (err: any) {
      this.logger.error(`Transcription job ${job.id} failed: ${err.message}`)
      throw err
    }
  }
}
