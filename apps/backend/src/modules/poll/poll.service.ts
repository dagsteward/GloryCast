import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService }  from '../prisma/prisma.service'
import { EventEmitter2 }  from '@nestjs/event-emitter'

@Injectable()
export class PollService {
  constructor(
    private readonly prisma:  PrismaService,
    private readonly emitter: EventEmitter2,
  ) {}

  async create(churchId: string, streamId: string | undefined, question: string, options: string[], allowMultiple = false) {
    return this.prisma.poll.create({
      data: {
        churchId,
        streamId,
        question,
        options:       options.map((text, i) => ({ id: i, text, votes: 0 })),
        allowMultiple,
        status:        'DRAFT',
      },
    })
  }

  async list(churchId: string, page = 1, limit = 10) {
    const [polls, total] = await Promise.all([
      this.prisma.poll.findMany({
        where:   { churchId },
        skip:    (page - 1) * limit,
        take:    limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { votes: true } } },
      }),
      this.prisma.poll.count({ where: { churchId } }),
    ])
    return { polls, total, page, limit }
  }

  async activate(churchId: string, id: string) {
    await this.assertExists(churchId, id)
    const poll = await this.prisma.poll.update({
      where: { id },
      data:  { status: 'ACTIVE', startedAt: new Date() },
    })
    this.emitter.emit('poll.activated', { pollId: id, churchId })
    return poll
  }

  async close(churchId: string, id: string) {
    await this.assertExists(churchId, id)
    const poll = await this.prisma.poll.update({
      where: { id },
      data:  { status: 'CLOSED', closedAt: new Date() },
    })
    this.emitter.emit('poll.closed', { pollId: id, churchId })
    return poll
  }

  async vote(pollId: string, participantId: string, optionIds: number[]) {
    const poll = await this.prisma.poll.findUnique({ where: { id: pollId } })
    if (!poll)                  throw new NotFoundException('Poll not found')
    if (poll.status !== 'ACTIVE') throw new ConflictException('Poll is not active')

    const existing = await this.prisma.pollVote.findFirst({ where: { pollId, sessionId: participantId } })
    if (existing) throw new ConflictException('Already voted')

    await this.prisma.pollVote.create({ data: { pollId, sessionId: participantId, optionIds: optionIds.map(String) } })

    const options = poll.options as { id: number; text: string; votes: number }[]
    for (const oid of optionIds) {
      const opt = options.find(o => o.id === oid)
      if (opt) opt.votes++
    }
    const updated = await this.prisma.poll.update({ where: { id: pollId }, data: { options } })
    this.emitter.emit('poll.voted', { pollId, options: updated.options })
    return updated.options
  }

  async getResults(churchId: string, id: string) {
    await this.assertExists(churchId, id)
    const [poll, totalVotes] = await Promise.all([
      this.prisma.poll.findUnique({ where: { id } }),
      this.prisma.pollVote.count({ where: { pollId: id } }),
    ])
    return { options: poll!.options, totalVotes }
  }

  private async assertExists(churchId: string, id: string) {
    const poll = await this.prisma.poll.findFirst({ where: { id, churchId } })
    if (!poll) throw new NotFoundException('Poll not found')
    return poll
  }
}
