import { Controller, Post, Body } from '@nestjs/common'
import { IsString, IsOptional, IsNumber } from 'class-validator'
import { SermonService }                  from './sermon.service'

class SermonDto {
  @IsString()  transcript:  string
  @IsOptional() @IsString() speakerName?: string
}

class QuizDto {
  @IsString()  transcript: string
  @IsOptional() @IsNumber() count?: number
}

@Controller('sermon')
export class SermonController {
  constructor(private readonly sermons: SermonService) {}

  @Post('summary')
  summary(@Body() dto: SermonDto) {
    return this.sermons.generateSummary(dto.transcript, dto.speakerName)
  }

  @Post('quiz')
  quiz(@Body() dto: QuizDto) {
    return this.sermons.generateQuiz(dto.transcript, dto.count ?? 5)
  }

  @Post('devotional')
  devotional(@Body() dto: SermonDto) {
    return this.sermons.generateDevotional(dto.transcript)
  }
}
