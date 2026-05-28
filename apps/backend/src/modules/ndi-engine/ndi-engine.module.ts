import { Module }              from '@nestjs/common'
import { NDIEngineController } from './ndi-engine.controller'
import { NDIEngineService }    from './ndi-engine.service'

@Module({
  controllers: [NDIEngineController],
  providers:   [NDIEngineService],
  exports:     [NDIEngineService],
})
export class NDIEngineModule {}
