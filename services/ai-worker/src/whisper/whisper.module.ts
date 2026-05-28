import { Module }          from '@nestjs/common'
import { BullModule }      from '@nestjs/bull'
import { HttpModule }      from '@nestjs/axios'
import { WhisperService }  from './whisper.service'
import { WhisperConsumer } from './whisper.consumer'
import { WhisperController } from './whisper.controller'

@Module({
  imports: [
    HttpModule,
    BullModule.registerQueue({ name: 'transcription' }),
  ],
  controllers: [WhisperController],
  providers:   [WhisperService, WhisperConsumer],
  exports:     [WhisperService],
})
export class WhisperModule {}
