import { Controller, Post, Body, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { IsString, IsOptional, MinLength }      from 'class-validator'
import { ApiProperty, ApiPropertyOptional }     from '@nestjs/swagger'
import { AIEngineService }  from './ai-engine.service'
import { JwtAuthGuard }     from '../../common/guards/jwt-auth.guard'
import { CurrentChurch }    from '../../common/decorators/current-user.decorator'

class DetectScriptureDto {
  @ApiProperty({ example: 'Today we will look at Romans 8:28...' })
  @IsString() @MinLength(3)
  text: string

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  streamId?: string
}

class GenerateSermonDto {
  @ApiProperty()
  @IsString() @MinLength(100)
  transcript: string

  @ApiPropertyOptional({ example: 'Pastor James' })
  @IsOptional() @IsString()
  speakerName?: string
}

class TranscribeDto {
  @ApiProperty({ example: 'https://storage.glorycast.ai/recordings/sermon.mp3' })
  @IsString()
  audioUrl: string

  @ApiPropertyOptional({ default: 'en' })
  @IsOptional() @IsString()
  language?: string
}

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AIEngineController {
  constructor(private readonly aiService: AIEngineService) {}

  @Post('detect-scripture')
  @ApiOperation({ summary: 'Detect Bible references in free text' })
  detectScripture(@Body() dto: DetectScriptureDto, @CurrentChurch() church: string) {
    return this.aiService.detectAndSave(dto.text, dto.streamId, church)
  }

  @Post('generate-sermon-summary')
  @ApiOperation({ summary: 'Generate AI sermon summary, outline, devotional & social post' })
  generateSummary(@Body() dto: GenerateSermonDto) {
    return this.aiService.generateSermonSummary(dto.transcript, dto.speakerName)
  }

  @Post('transcribe')
  @ApiOperation({ summary: 'Transcribe audio via Whisper and detect scriptures' })
  transcribe(@Body() dto: TranscribeDto) {
    return this.aiService.transcribeAudio(dto.audioUrl, dto.language)
  }

  @Post('generate-quiz')
  @ApiOperation({ summary: 'Generate quiz questions from sermon transcript' })
  generateQuiz(@Body() dto: GenerateSermonDto) {
    return this.aiService.generateQuizFromSermon(dto.transcript)
  }
}
