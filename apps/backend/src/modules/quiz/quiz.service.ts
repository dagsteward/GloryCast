import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService }  from '../prisma/prisma.service'
import { EventEmitter2 }  from '@nestjs/event-emitter'

@Injectable()
export class QuizService {
  constructor(
    private readonly prisma:  PrismaService,
    private readonly emitter: EventEmitter2,
  ) {}

  async create(churchId: string, streamId: string | undefined, title: string, questions: {
    question: string
    options: { text: string; isCorrect: boolean }[]
    explanation?: string
    points?: number
    timeLimitSecs?: number
  }[]) {
    return this.prisma.quiz.create({
      data: {
        churchId,
        streamId,
        title,
        questions: {
          create: questions.map((q, idx) => ({
            order:       idx,
            text:        q.question,
            options:     q.options,
            explanation: q.explanation ?? '',
            points:      q.points ?? 10,
            timeoutSecs: q.timeLimitSecs ?? 30,
          })),
        },
      },
      include: { questions: { orderBy: { order: 'asc' } } },
    })
  }

  async findById(churchId: string, id: string) {
    const quiz = await this.prisma.quiz.findFirst({
      where:   { id, churchId },
      include: { questions: { orderBy: { order: 'asc' } } },
    })
    if (!quiz) throw new NotFoundException('Quiz not found')
    return quiz
  }

  async list(churchId: string, page = 1, limit = 10) {
    const [quizzes, total] = await Promise.all([
      this.prisma.quiz.findMany({
        where:   { churchId },
        skip:    (page - 1) * limit,
        take:    limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { questions: true, responses: true } } },
      }),
      this.prisma.quiz.count({ where: { churchId } }),
    ])
    return { quizzes, total, page, limit }
  }

  async activate(churchId: string, id: string) {
    await this.findById(churchId, id)
    const quiz = await this.prisma.quiz.update({
      where: { id },
      data:  { status: 'ACTIVE', startedAt: new Date() },
    })
    this.emitter.emit('quiz.activated', { quizId: id, churchId })
    return quiz
  }

  async submitResponse(quizId: string, questionId: string, participantId: string, answeredOption: number) {
    const question = await this.prisma.quizQuestion.findUnique({ where: { id: questionId } })
    if (!question) throw new NotFoundException('Question not found')

    const options = question.options as { text: string; isCorrect: boolean }[]
    if (answeredOption < 0 || answeredOption >= options.length)
      throw new BadRequestException('Invalid option index')

    const isCorrect    = options[answeredOption].isCorrect
    const pointsEarned = isCorrect ? (question.points ?? 10) : 0

    const response = await this.prisma.quizResponse.create({
      data: {
        quizId,
        questionId,
        sessionId:    participantId,
        answer:       String(answeredOption),
        isCorrect,
        pointsEarned,
      },
    })
    this.emitter.emit('quiz.response.submitted', { quizId, questionId, isCorrect })
    return response
  }

  async getLeaderboard(quizId: string) {
    const scores = await this.prisma.quizResponse.groupBy({
      by:      ['sessionId'],
      where:   { quizId, isCorrect: true },
      _sum:    { pointsEarned: true },
      orderBy: { _sum: { pointsEarned: 'desc' } },
      take:    10,
    })
    return scores.map((s, i) => ({
      rank:          i + 1,
      participantId: s.sessionId,
      totalPoints:   s._sum.pointsEarned ?? 0,
    }))
  }
}
