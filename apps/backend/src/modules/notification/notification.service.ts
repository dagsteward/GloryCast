import { Injectable, Logger } from '@nestjs/common'
import { OnEvent }            from '@nestjs/event-emitter'
import { PrismaService }      from '../prisma/prisma.service'
import { EventEmitter2 }      from '@nestjs/event-emitter'

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name)

  constructor(
    private readonly prisma:  PrismaService,
    private readonly emitter: EventEmitter2,
  ) {}

  async send(churchId: string, userId: string | null, type: string, title: string, body: string, data?: Record<string, any>) {
    const notification = await this.prisma.notification.create({
      data: { churchId, userId, type, title, body, data: data ?? {} },
    })
    this.emitter.emit('notification.created', notification)
    return notification
  }

  async broadcast(churchId: string, type: string, title: string, body: string, data?: Record<string, any>) {
    const notification = await this.prisma.notification.create({
      data: { churchId, userId: null, type, title, body, data: data ?? {}, isBroadcast: true },
    })
    this.emitter.emit('notification.broadcast', { notification, churchId })
    return notification
  }

  async list(userId: string, churchId: string, page = 1, limit = 20) {
    const where = { churchId, OR: [{ userId }, { isBroadcast: true }] }
    const [items, total, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip:    (page - 1) * limit,
        take:    limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { ...where, isRead: false } }),
    ])
    return { items, total, unread, page, limit }
  }

  async markRead(userId: string, ids: string[]) {
    await this.prisma.notification.updateMany({
      where: { id: { in: ids }, userId },
      data:  { isRead: true, readAt: new Date() },
    })
  }

  async markAllRead(userId: string, churchId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, churchId, isRead: false },
      data:  { isRead: true, readAt: new Date() },
    })
  }

  // ── Event listeners ────────────────────────────────────────────────────────

  @OnEvent('stream.started')
  async onStreamStarted({ streamId, churchId }: any) {
    await this.broadcast(churchId, 'STREAM_STARTED', 'Service is Live!',
      'The church service has started. Join now.', { streamId })
  }

  @OnEvent('webinar.started')
  async onWebinarStarted({ webinarId, churchId }: any) {
    await this.broadcast(churchId, 'WEBINAR_STARTED', 'Webinar Started',
      'A webinar has just started.', { webinarId })
  }

  @OnEvent('qa.question.answered')
  async onQuestionAnswered({ questionId, answer, churchId }: any) {
    this.logger.log(`Q&A answered: ${questionId} in church ${churchId}`)
  }
}
