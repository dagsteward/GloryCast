import { Controller, Post, Body } from '@nestjs/common'
import { LiveKitService }         from './livekit.service'

@Controller('livekit')
export class LiveKitController {
  constructor(private readonly livekit: LiveKitService) {}

  @Post('token')
  generateToken(@Body() body: { roomName: string; participantName: string; isHost?: boolean }) {
    const token = this.livekit.generateToken(body.roomName, body.participantName, body.isHost)
    return { token, url: this.livekit.getRoomUrl() }
  }

  @Post('webinar-token')
  generateWebinarToken(@Body() body: { webinarId: string; displayName: string; isHost?: boolean }) {
    return this.livekit.generateWebinarToken(body.webinarId, body.displayName, body.isHost)
  }
}
