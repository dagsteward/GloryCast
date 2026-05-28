import { Injectable, Logger } from '@nestjs/common'
import { AccessToken }         from 'livekit-server-sdk'

@Injectable()
export class LiveKitService {
  private readonly logger   = new Logger(LiveKitService.name)
  private readonly apiKey   = process.env.LIVEKIT_API_KEY    ?? ''
  private readonly apiSecret = process.env.LIVEKIT_API_SECRET ?? ''
  private readonly url       = process.env.LIVEKIT_URL        ?? 'ws://localhost:7880'

  generateToken(roomName: string, participantName: string, isHost = false): string {
    const at = new AccessToken(this.apiKey, this.apiSecret, {
      identity: participantName,
      ttl:      '2h',
    })

    at.addGrant({
      roomJoin:        true,
      room:            roomName,
      canPublish:      isHost,
      canSubscribe:    true,
      canPublishData:  true,
    })

    return at.toJwt()
  }

  getRoomUrl() {
    return this.url
  }

  generateWebinarToken(webinarId: string, displayName: string, isHost = false) {
    const token = this.generateToken(`webinar:${webinarId}`, displayName, isHost)
    return { token, url: this.url }
  }
}
