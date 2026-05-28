import {
  Injectable, NotFoundException, BadRequestException, Logger,
} from '@nestjs/common'
import { EventEmitter2 }   from '@nestjs/event-emitter'
import { PrismaService }   from '../prisma/prisma.service'
import { ConfigService }   from '@nestjs/config'
import { CreateStreamDto, UpdateStreamDto } from './dto/stream.dto'
import { nanoid }          from 'nanoid'

@Injectable()
export class StreamService {
  private readonly logger = new Logger(StreamService.name)

  constructor(
    private readonly prisma:        PrismaService,
    private readonly eventEmitter:  EventEmitter2,
    private readonly cfg:           ConfigService,
  ) {}

  async create(churchId: string, creatorId: string, dto: CreateStreamDto) {
    const streamKey = nanoid(24)
    const rtmpBase  = this.cfg.get<string>('streamService.rtmpUrl')

    const stream = await this.prisma.stream.create({
      data: {
        churchId,
        creatorId,
        eventId:      dto.eventId,
        title:        dto.title,
        description:  dto.description,
        streamKey,
        rtmpUrl:      `${rtmpBase}/live/${streamKey}`,
        isRecording:  dto.enableRecording ?? false,
        destinations: dto.destinations ?? [],
      },
    })

    this.logger.log(`Stream created: ${stream.id} (${stream.title})`)
    return stream
  }

  async findAll(churchId: string, status?: string) {
    return this.prisma.stream.findMany({
      where:   { churchId, ...(status ? { status: status as any } : {}) },
      orderBy: { createdAt: 'desc' },
      take:    50,
    })
  }

  async findOne(id: string, churchId: string) {
    const stream = await this.prisma.stream.findFirst({
      where:   { id, churchId },
      include: { scenes: { orderBy: { order: 'asc' } } },
    })
    if (!stream) throw new NotFoundException('Stream not found')
    return stream
  }

  async start(id: string, churchId: string) {
    const stream = await this.findOne(id, churchId)
    if (stream.status === 'LIVE') throw new BadRequestException('Stream is already live')

    const updated = await this.prisma.stream.update({
      where: { id },
      data:  { status: 'LIVE', startedAt: new Date() },
    })

    this.eventEmitter.emit('stream.started', {
      streamId:  id,
      churchId,
      title:     stream.title,
      rtmpUrl:   stream.rtmpUrl,
      streamKey: stream.streamKey,
    })

    this.logger.log(`Stream started: ${id}`)
    return updated
  }

  async stop(id: string, churchId: string) {
    const stream = await this.findOne(id, churchId)
    if (stream.status === 'ENDED') throw new BadRequestException('Stream already ended')

    const durationSecs = stream.startedAt
      ? Math.floor((Date.now() - stream.startedAt.getTime()) / 1000)
      : undefined

    const updated = await this.prisma.stream.update({
      where: { id },
      data:  { status: 'ENDED', endedAt: new Date(), durationSecs },
    })

    this.eventEmitter.emit('stream.stopped', { streamId: id, churchId, durationSecs })
    this.logger.log(`Stream stopped: ${id} (${durationSecs}s)`)
    return updated
  }

  async updateViewerCount(streamId: string, count: number) {
    await this.prisma.stream.update({
      where: { id: streamId },
      data:  {
        viewerCount: count,
        peakViewers: { set: Math.max(count, (await this.prisma.stream.findUnique({ where: { id: streamId }, select: { peakViewers: true } }))?.peakViewers ?? 0) },
      },
    })
  }

  async update(id: string, churchId: string, dto: UpdateStreamDto) {
    await this.findOne(id, churchId)
    return this.prisma.stream.update({
      where: { id },
      data:  dto,
    })
  }

  async getStreamKey(id: string, churchId: string) {
    const stream = await this.findOne(id, churchId)
    return {
      streamKey: stream.streamKey,
      rtmpUrl:   stream.rtmpUrl,
      ingestUrl: `${this.cfg.get('streamService.rtmpUrl')}/live/${stream.streamKey}`,
    }
  }

  async getLiveStreams(churchId: string) {
    return this.prisma.stream.findMany({
      where:   { churchId, status: 'LIVE' },
      orderBy: { startedAt: 'desc' },
    })
  }
}
