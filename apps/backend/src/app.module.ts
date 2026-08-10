import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { ThrottlerModule } from '@nestjs/throttler'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { ScheduleModule } from '@nestjs/schedule'
import { CacheModule } from '@nestjs/cache-manager'
import { BullModule } from '@nestjs/bull'
import { createKeyv } from '@keyv/redis'
import configuration from './config/configuration'

// ── Feature modules ───────────────────────────────────────────────────────────
import { PrismaModule }       from './modules/prisma/prisma.module'
import { AuthModule }         from './modules/auth/auth.module'
import { UsersModule }        from './modules/users/users.module'
import { ChurchesModule }     from './modules/churches/churches.module'
import { StreamModule }       from './modules/stream/stream.module'
import { WebinarModule }      from './modules/webinar/webinar.module'
import { BibleModule }        from './modules/bible/bible.module'
import { MediaModule }        from './modules/media/media.module'
import { AIEngineModule }     from './modules/ai-engine/ai-engine.module'
import { QuizModule }         from './modules/quiz/quiz.module'
import { PollModule }         from './modules/poll/poll.module'
import { QAModule }           from './modules/qa/qa.module'
import { NotificationModule } from './modules/notification/notification.module'
import { AnalyticsModule }    from './modules/analytics/analytics.module'
import { StageDisplayModule } from './modules/stage-display/stage-display.module'
import { NDIEngineModule }    from './modules/ndi-engine/ndi-engine.module'
import { LicensingModule } from './modules/licensing/licensing.module'

// ── WebSocket gateways ────────────────────────────────────────────────────────
import { AppGateway }    from './gateways/app.gateway'
import { AppController } from './app.controller'

@Module({
  imports: [
    // ── Config ──────────────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),

    // ── Throttling ───────────────────────────────────────────────────────────
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => [{
        ttl:   cfg.get<number>('throttle.ttl')!   * 1000,
        limit: cfg.get<number>('throttle.limit')!,
      }],
    }),

    // ── Cache (Redis) ─────────────────────────────────────────────────────────
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        store: createKeyv(cfg.get<string>('redis.url')!) as any,
        ttl: 60_000,
      }),
    }),

    // ── Bull Queue (Redis) ────────────────────────────────────────────────────
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        redis: cfg.get<string>('redis.url')!,
      }),
    }),

    // ── Events ────────────────────────────────────────────────────────────────
    EventEmitterModule.forRoot({ wildcard: true, delimiter: '.' }),
    ScheduleModule.forRoot(),

    // ── Feature modules ───────────────────────────────────────────────────────
    PrismaModule,
    AuthModule,
    UsersModule,
    ChurchesModule,
    StreamModule,
    WebinarModule,
    BibleModule,
    MediaModule,
    AIEngineModule,
    QuizModule,
    PollModule,
    QAModule,
    NotificationModule,
    AnalyticsModule,
    StageDisplayModule,
    NDIEngineModule,
    LicensingModule,
  ],
  controllers: [AppController],
  providers:   [AppGateway],
})
export class AppModule {}
