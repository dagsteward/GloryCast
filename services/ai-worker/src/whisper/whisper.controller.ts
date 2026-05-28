import { Controller, Post, Body, Get, Param } from '@nestjs/common'
import { IsString, IsOptional }               from 'class-validator'
import { WhisperService }                     from './whisper.service'

class TranscribeDto {
  @IsString()  audioUrl:    string
  @IsOptional() @IsString() language?:   string
  @IsOptional() @IsString() callbackUrl?: string
}

@Controller('transcribe')
export class WhisperController {
  constructor(private readonly whisper: WhisperService) {}

  @Post()
  async transcribe(@Body() dto: TranscribeDto) {
    if (dto.callbackUrl) {
      return this.whisper.enqueueTranscription(dto.audioUrl, dto.language, dto.callbackUrl)
    }
    return this.whisper.transcribe(dto.audioUrl, dto.language ?? 'en')
  }
}
