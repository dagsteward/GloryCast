import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService }  from '../prisma/prisma.service'
import { EventEmitter2 }  from '@nestjs/event-emitter'

export interface StageContent {
  type:       'SCRIPTURE' | 'LYRICS' | 'MESSAGE' | 'COUNTDOWN' | 'BLANK'
  title?:     string
  body?:      string
  reference?: string
  countdown?: number
  style?:     Record<string, any>
}

@Injectable()
export class StageDisplayService {
  constructor(
    private readonly prisma:  PrismaService,
    private readonly emitter: EventEmitter2,
  ) {}

  async getForChurch(churchId: string) {
    let display = await this.prisma.stageDisplay.findFirst({ where: { churchId } })
    if (!display) {
      display = await this.prisma.stageDisplay.create({
        data: { churchId, content: { type: 'BLANK' }, isActive: false },
      })
    }
    return display
  }

  async updateContent(churchId: string, content: StageContent) {
    const display = await this.getForChurch(churchId)
    const updated = await this.prisma.stageDisplay.update({
      where: { id: display.id },
      data:  { content: content as any, isActive: content.type !== 'BLANK', updatedAt: new Date() },
    })
    this.emitter.emit('stage.updated', { churchId, content })
    return updated
  }

  async setBlank(churchId: string) {
    return this.updateContent(churchId, { type: 'BLANK' })
  }

  async setScripture(churchId: string, reference: string, body: string, style?: Record<string, any>) {
    return this.updateContent(churchId, { type: 'SCRIPTURE', reference, body, style })
  }

  async setLyrics(churchId: string, title: string, body: string) {
    return this.updateContent(churchId, { type: 'LYRICS', title, body })
  }

  async setMessage(churchId: string, title: string, body: string) {
    return this.updateContent(churchId, { type: 'MESSAGE', title, body })
  }

  async setCountdown(churchId: string, seconds: number) {
    return this.updateContent(churchId, { type: 'COUNTDOWN', countdown: seconds })
  }
}
