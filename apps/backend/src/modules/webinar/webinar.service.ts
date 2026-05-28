import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { ConfigService }    from '@nestjs/config'
import { PrismaService }    from '../prisma/prisma.service'
import { EventEmitter2 }    from '@nestjs/event-emitter'
import { CreateWebinarDto, UpdateWebinarDto, JoinWebinarDto } from './dto/webinar.dto'
import { randomBytes }      from 'crypto'

@Injectable()
export class WebinarService {
  constructor(
    private readonly prisma:   PrismaService,
    private readonly cfg:      ConfigService,
    private readonly emitter:  EventEmitter2,
  ) {}

  async create(churchId: string, hostId: string, dto: CreateWebinarDto) {
    const meetingId   = randomBytes(8).toString('hex')
    const joinUrl     = `${this.cfg.get('frontendUrl')}/webinar/${meetingId}`
    const passcode    = Math.random().toString().slice(2, 8)

    return this.prisma.webinar.create({
      data: {
        churchId,
        creatorId:       hostId,
        hostId,
        title:           dto.title,
        description:     dto.description,
        scheduledAt:     new Date(dto.scheduledAt),
        durationMinutes: dto.durationMinutes ?? 60,
        maxAttendees:    dto.maxAttendees ?? 100,
        isPublic:        dto.isPublic ?? false,
        meetingId,
        passcode,
        joinUrl,
        platform:        'livekit',
      },
    })
  }

  async findById(churchId: string, id: string) {
    const webinar = await this.prisma.webinar.findFirst({
      where: { id, churchId },
      include: { _count: { select: { attendees: true } } },
    })
    if (!webinar) throw new NotFoundException('Webinar not found')
    return webinar
  }

  async list(churchId: string, page = 1, limit = 10) {
    const [webinars, total] = await Promise.all([
      this.prisma.webinar.findMany({
        where:   { churchId },
        skip:    (page - 1) * limit,
        take:    limit,
        orderBy: { scheduledAt: 'desc' },
        include: { _count: { select: { attendees: true } } },
      }),
      this.prisma.webinar.count({ where: { churchId } }),
    ])
    return { webinars, total, page, limit }
  }

  async update(churchId: string, id: string, dto: UpdateWebinarDto) {
    await this.findById(churchId, id)
    return this.prisma.webinar.update({
      where: { id },
      data:  {
        ...dto,
        ...(dto.scheduledAt ? { scheduledAt: new Date(dto.scheduledAt) } : {}),
      },
    })
  }

  async start(churchId: string, id: string) {
    const webinar = await this.findById(churchId, id)
    if (webinar.status === 'LIVE') throw new BadRequestException('Webinar already live')

    const updated = await this.prisma.webinar.update({
      where: { id },
      data:  { status: 'LIVE', startedAt: new Date() },
    })
    this.emitter.emit('webinar.started', { webinarId: id, churchId })
    return updated
  }

  async end(churchId: string, id: string) {
    const webinar = await this.findById(churchId, id)
    const duration = webinar.startedAt
      ? Math.floor((Date.now() - webinar.startedAt.getTime()) / 1000)
      : 0

    const updated = await this.prisma.webinar.update({
      where: { id },
      data:  { status: 'ENDED', endedAt: new Date(), durationSeconds: duration },
    })
    this.emitter.emit('webinar.ended', { webinarId: id, churchId })
    return updated
  }

  async join(id: string, dto: JoinWebinarDto) {
    const webinar = await this.prisma.webinar.findUnique({ where: { id } })
    if (!webinar) throw new NotFoundException('Webinar not found')
    if (webinar.status === 'ENDED') throw new BadRequestException('Webinar has ended')

    const livekitUrl = this.cfg.get('livekit.url')
    const token = `lk_${randomBytes(16).toString('hex')}`

    await this.prisma.webinarAttendee.create({
      data: { webinarId: id, name: dto.displayName, email: dto.email, token },
    })
    this.emitter.emit('webinar.attendee.joined', { webinarId: id, displayName: dto.displayName })

    return { token, livekitUrl, webinar: { title: webinar.title, meetingId: webinar.meetingId } }
  }

  async getAttendees(churchId: string, id: string, page = 1, limit = 50) {
    await this.findById(churchId, id)
    const [attendees, total] = await Promise.all([
      this.prisma.webinarAttendee.findMany({
        where:   { webinarId: id },
        skip:    (page - 1) * limit,
        take:    limit,
        orderBy: { joinedAt: 'asc' },
      }),
      this.prisma.webinarAttendee.count({ where: { webinarId: id } }),
    ])
    return { attendees, total }
  }
}
