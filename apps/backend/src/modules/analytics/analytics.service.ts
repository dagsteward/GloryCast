import { Injectable } from '@nestjs/common'
import { OnEvent }    from '@nestjs/event-emitter'
import { PrismaService } from '../prisma/prisma.service'
import { Cron }       from '@nestjs/schedule'

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(churchId: string) {
    const now       = new Date()
    const weekAgo   = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo  = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const [
      totalStreams, liveStreams, totalMembers, totalSermons,
      weeklyViews, monthlyViews, topScriptures,
    ] = await Promise.all([
      this.prisma.stream.count({ where: { churchId } }),
      this.prisma.stream.count({ where: { churchId, status: 'LIVE' } }),
      this.prisma.churchMember.count({ where: { churchId } }),
      this.prisma.sermon.count({ where: { churchId } }),
      this.prisma.viewerSession.count({ where: { churchId, createdAt: { gte: weekAgo } } }),
      this.prisma.viewerSession.count({ where: { churchId, createdAt: { gte: monthAgo } } }),
      this.prisma.bibleReference.groupBy({
        by:      ['bookId', 'chapter', 'verse'],
        where:   { churchId, createdAt: { gte: monthAgo } },
        _count:  { bookId: true },
        orderBy: { _count: { bookId: 'desc' } },
        take:    10,
      }),
    ])

    return {
      streams:   { total: totalStreams, live: liveStreams },
      members:   totalMembers,
      sermons:   totalSermons,
      viewers:   { weekly: weeklyViews, monthly: monthlyViews },
      topScriptures,
    }
  }

  async getStreamAnalytics(churchId: string, streamId: string) {
    const [sessions, peakConcurrent, avgWatchTime] = await Promise.all([
      this.prisma.viewerSession.count({ where: { churchId, streamId } }),
      this.prisma.viewerSession.aggregate({
        where: { churchId, streamId },
        _max:  { concurrentViewers: true },
      }),
      this.prisma.viewerSession.aggregate({
        where: { churchId, streamId, durationSecs: { gt: 0 } },
        _avg:  { durationSecs: true },
      }),
    ])

    return {
      totalSessions:   sessions,
      peakConcurrent:  peakConcurrent._max.concurrentViewers ?? 0,
      avgWatchTimeSecs: Math.round(avgWatchTime._avg.durationSecs ?? 0),
    }
  }

  async trackEvent(churchId: string, streamId: string | undefined, eventType: string, data: Record<string, any>) {
    await this.prisma.analytic.create({
      data: { churchId, streamId, eventType, metadata: data },
    })
  }

  @OnEvent('stream.started')
  async onStreamStarted({ streamId, churchId }: any) {
    await this.trackEvent(churchId, streamId, 'stream_started', {})
  }

  @OnEvent('stream.stopped')
  async onStreamStopped({ streamId, churchId, durationSecs }: any) {
    await this.trackEvent(churchId, streamId, 'stream_stopped', { durationSecs })
  }

  @OnEvent('webinar.attendee.joined')
  async onAttendeeJoined({ webinarId, displayName, churchId }: any) {
    if (churchId) await this.trackEvent(churchId, webinarId, 'webinar_attendee_joined', { displayName })
  }
}
