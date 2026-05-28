import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService }  from '../prisma/prisma.service'
import { EventEmitter2 }  from '@nestjs/event-emitter'

@Injectable()
export class QAService {
  constructor(
    private readonly prisma:  PrismaService,
    private readonly emitter: EventEmitter2,
  ) {}

  async submitQuestion(streamId: string, churchId: string, authorName: string, text: string, authorId?: string) {
    const question = await this.prisma.qAQuestion.create({
      data: { streamId, churchId, authorId, authorName, text },
    })
    this.emitter.emit('qa.question.submitted', { question, churchId })
    return question
  }

  async list(churchId: string, streamId: string, onlyAnswered = false) {
    return this.prisma.qAQuestion.findMany({
      where:   { churchId, streamId, ...(onlyAnswered ? { isAnswered: true } : {}) },
      orderBy: [{ isStarred: 'desc' }, { upvotes: 'desc' }, { createdAt: 'asc' }],
    })
  }

  async upvote(id: string, participantId: string) {
    const q = await this.prisma.qAQuestion.findUnique({ where: { id } })
    if (!q) throw new NotFoundException('Question not found')
    return this.prisma.qAQuestion.update({
      where: { id },
      data:  { upvotes: q.upvotes + 1 },
    })
  }

  async star(churchId: string, id: string) {
    return this.prisma.qAQuestion.updateMany({
      where: { id, churchId },
      data:  { isStarred: true },
    })
  }

  async markAnswered(churchId: string, id: string, answer?: string) {
    const q = await this.prisma.qAQuestion.updateMany({
      where: { id, churchId },
      data:  { isAnswered: true, answer },
    })
    this.emitter.emit('qa.question.answered', { questionId: id, answer, churchId })
    return q
  }

  async dismiss(churchId: string, id: string) {
    return this.prisma.qAQuestion.deleteMany({ where: { id, churchId } })
  }
}
