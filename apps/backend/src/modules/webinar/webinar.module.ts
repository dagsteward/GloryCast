import { Module }            from '@nestjs/common'
import { WebinarController } from './webinar.controller'
import { WebinarService }    from './webinar.service'

@Module({
  controllers: [WebinarController],
  providers:   [WebinarService],
  exports:     [WebinarService],
})
export class WebinarModule {}
