import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  OnGatewayConnection, OnGatewayDisconnect, ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets'
import { Server, Socket }   from 'socket.io'
import { OnEvent }          from '@nestjs/event-emitter'
import { JwtService }       from '@nestjs/jwt'
import { Logger }           from '@nestjs/common'

@WebSocketGateway({
  cors:      { origin: '*', credentials: true },
  namespace: '/ws',
  transports: ['websocket', 'polling'],
})
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server
  private readonly logger = new Logger(AppGateway.name)
  private readonly rooms  = new Map<string, Set<string>>() // churchId → socketIds

  constructor(private readonly jwt: JwtService) {}

  // ── Connection lifecycle ──────────────────────────────────────────────────

  async handleConnection(socket: Socket) {
    const token = socket.handshake.auth?.token ?? socket.handshake.headers.authorization?.split(' ')[1]
    try {
      const payload = this.jwt.verify<{ sub: string; churchId: string }>(token)
      socket.data.userId   = payload.sub
      socket.data.churchId = payload.churchId
      socket.join(`church:${payload.churchId}`)
      this.logger.debug(`Connected: ${payload.sub} → church:${payload.churchId}`)
    } catch {
      socket.disconnect()
    }
  }

  handleDisconnect(socket: Socket) {
    this.logger.debug(`Disconnected: ${socket.id}`)
  }

  // ── Client → Server messages ──────────────────────────────────────────────

  @SubscribeMessage('join:stream')
  joinStream(@ConnectedSocket() socket: Socket, @MessageBody() { streamId }: { streamId: string }) {
    socket.join(`stream:${streamId}`)
    return { joined: `stream:${streamId}` }
  }

  @SubscribeMessage('leave:stream')
  leaveStream(@ConnectedSocket() socket: Socket, @MessageBody() { streamId }: { streamId: string }) {
    socket.leave(`stream:${streamId}`)
  }

  @SubscribeMessage('join:webinar')
  joinWebinar(@ConnectedSocket() socket: Socket, @MessageBody() { webinarId }: { webinarId: string }) {
    socket.join(`webinar:${webinarId}`)
    return { joined: `webinar:${webinarId}` }
  }

  @SubscribeMessage('stage:display:subscribe')
  subscribeStage(@ConnectedSocket() socket: Socket) {
    const churchId = socket.data.churchId
    socket.join(`stage:${churchId}`)
    return { subscribed: true }
  }

  // ── Server → Client event bridges ────────────────────────────────────────

  @OnEvent('scripture.detected')
  onScriptureDetected({ scripture, sourceId }: any) {
    if (sourceId) {
      this.server.to(`stream:${sourceId}`).emit('scripture:detected', scripture)
    }
  }

  @OnEvent('stream.started')
  onStreamStarted({ streamId, churchId }: any) {
    this.server.to(`church:${churchId}`).emit('stream:started', { streamId })
  }

  @OnEvent('stream.stopped')
  onStreamStopped({ streamId, churchId }: any) {
    this.server.to(`church:${churchId}`).emit('stream:stopped', { streamId })
  }

  @OnEvent('poll.activated')
  onPollActivated({ pollId, churchId }: any) {
    this.server.to(`church:${churchId}`).emit('poll:activated', { pollId })
  }

  @OnEvent('poll.voted')
  onPollVoted({ pollId, options }: any) {
    this.server.emit(`poll:${pollId}:updated`, { options })
  }

  @OnEvent('poll.closed')
  onPollClosed({ pollId, churchId }: any) {
    this.server.to(`church:${churchId}`).emit('poll:closed', { pollId })
  }

  @OnEvent('quiz.activated')
  onQuizActivated({ quizId, churchId }: any) {
    this.server.to(`church:${churchId}`).emit('quiz:activated', { quizId })
  }

  @OnEvent('quiz.response.submitted')
  onQuizResponse({ quizId, questionId, isCorrect }: any) {
    this.server.emit(`quiz:${quizId}:response`, { questionId, isCorrect })
  }

  @OnEvent('qa.question.submitted')
  onQAQuestion({ question, churchId }: any) {
    this.server.to(`church:${churchId}`).emit('qa:question', question)
  }

  @OnEvent('qa.question.answered')
  onQAAnswered({ questionId, answer, churchId }: any) {
    this.server.to(`church:${churchId}`).emit('qa:answered', { questionId, answer })
  }

  @OnEvent('stage.updated')
  onStageUpdated({ churchId, content }: any) {
    this.server.to(`stage:${churchId}`).emit('stage:update', content)
  }

  @OnEvent('webinar.started')
  onWebinarStarted({ webinarId, churchId }: any) {
    this.server.to(`church:${churchId}`).emit('webinar:started', { webinarId })
  }

  @OnEvent('webinar.ended')
  onWebinarEnded({ webinarId, churchId }: any) {
    this.server.to(`church:${churchId}`).emit('webinar:ended', { webinarId })
  }

  @OnEvent('webinar.attendee.joined')
  onAttendeeJoined({ webinarId, displayName }: any) {
    this.server.to(`webinar:${webinarId}`).emit('webinar:attendee', { displayName })
  }

  @OnEvent('ndi.sources.updated')
  onNDIUpdated(sources: any[]) {
    this.server.emit('ndi:sources', sources)
  }

  @OnEvent('notification.broadcast')
  onBroadcastNotification({ notification, churchId }: any) {
    this.server.to(`church:${churchId}`).emit('notification', notification)
  }

  @OnEvent('notification.created')
  onNotification(notification: any) {
    if (notification.userId) {
      this.server.emit(`notification:${notification.userId}`, notification)
    }
  }

  @OnEvent('ai.scriptures.batch')
  onScripturesBatch({ streamId, scriptures }: any) {
    this.server.to(`stream:${streamId}`).emit('scriptures:batch', { streamId, scriptures })
  }
}
