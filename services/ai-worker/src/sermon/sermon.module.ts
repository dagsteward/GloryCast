import { Module }           from '@nestjs/common'
import { HttpModule }       from '@nestjs/axios'
import { SermonController } from './sermon.controller'
import { SermonService }    from './sermon.service'

@Module({
  imports:     [HttpModule],
  controllers: [SermonController],
  providers:   [SermonService],
  exports:     [SermonService],
})
export class SermonModule {}
