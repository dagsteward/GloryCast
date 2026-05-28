import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common'
import { RTMPService } from './rtmp.service'

@Controller('streams')
export class RTMPController {
  constructor(private readonly rtmp: RTMPService) {}

  @Get()
  getSessions() {
    return this.rtmp.getActiveSessions()
  }

  @Post(':key/destinations')
  addDestination(@Param('key') key: string, @Body('rtmpUrl') rtmpUrl: string) {
    const ok = this.rtmp.addDestination(key, rtmpUrl)
    return { added: ok }
  }

  @Delete(':key/destinations')
  stopRestream(@Param('key') key: string) {
    this.rtmp.stopRestream(key)
    return { stopped: true }
  }
}
