import { Module }       from '@nestjs/common'
import { RTMPService }  from './rtmp.service'
import { RTMPController } from './rtmp.controller'

@Module({
  controllers: [RTMPController],
  providers:   [RTMPService],
  exports:     [RTMPService],
})
export class RTMPModule {}
