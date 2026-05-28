import { Module }       from '@nestjs/common'
import { HttpModule }   from '@nestjs/axios'
import { BullModule }   from '@nestjs/bull'
import { AIEngineController }      from './ai-engine.controller'
import { AIEngineService }         from './ai-engine.service'
import { ScriptureDetectorService } from './scripture-detector/scripture-detector.service'

@Module({
  imports: [
    HttpModule,
    BullModule.registerQueue({ name: 'ai-processing' }),
  ],
  controllers: [AIEngineController],
  providers:   [AIEngineService, ScriptureDetectorService],
  exports:     [AIEngineService, ScriptureDetectorService],
})
export class AIEngineModule {}
