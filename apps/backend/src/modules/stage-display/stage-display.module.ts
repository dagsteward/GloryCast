import { Module }                 from '@nestjs/common'
import { StageDisplayController } from './stage-display.controller'
import { StageDisplayService }    from './stage-display.service'

@Module({
  controllers: [StageDisplayController],
  providers:   [StageDisplayService],
  exports:     [StageDisplayService],
})
export class StageDisplayModule {}
