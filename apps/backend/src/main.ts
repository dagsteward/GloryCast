import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { ValidationPipe, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import fastifyHelmet from '@fastify/helmet'
import fastifyCompress from '@fastify/compress'
import fastifyStatic from '@fastify/static'
import { join } from 'path'
import { AppModule } from './app.module'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'
import { TransformInterceptor } from './common/interceptors/transform.interceptor'

async function bootstrap() {
  const logger = new Logger('GloryCast API')

  const adapter = new FastifyAdapter({
    logger: process.env.NODE_ENV === 'development',
    trustProxy: true,
  })

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
    // Payment webhooks are HMAC-signed over the EXACT bytes received. Fastify
    // parses JSON and discards the original text, and re-serialising the
    // parsed object produces different bytes — key order and whitespace both
    // differ — so a signature could never match. Nest's rawBody option keeps
    // the original buffer on request.rawBody without fighting Fastify's own
    // parser registration.
    { bufferLogs: true, rawBody: true },
  )

  const config = app.get(ConfigService)
  const port      = config.get<number>('port')!
  const prefix    = config.get<string>('apiPrefix')!
  const origins   = config.get<string[]>('corsOrigins')!
  const isDev     = config.get<string>('nodeEnv') === 'development'
  const swaggerOn = config.get<boolean>('swagger.enabled')!

  // ── Security ───────────────────────────────────────────────────────────────
  await app.register(fastifyHelmet as any, {
    contentSecurityPolicy: false, // handled at nginx level
  })
  await app.register(fastifyCompress as any)

  // Business console — a small static SPA served alongside the API, under a
  // path outside app.setGlobalPrefix() so it is reachable at /admin rather
  // than /api/v1/admin. It authenticates against the same /auth/login and
  // /admin/* endpoints as any other client; nothing here bypasses the JWT
  // guards on those routes.
  await app.register(fastifyStatic as any, {
    root: join(__dirname, '..', 'public', 'admin'),
    prefix: '/admin/',
    decorateReply: false,
  })

  app.enableCors({
    origin: origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })

  // ── Global middleware ──────────────────────────────────────────────────────
  app.setGlobalPrefix(prefix)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  )
  app.useGlobalFilters(new HttpExceptionFilter())
  app.useGlobalInterceptors(new TransformInterceptor())

  // ── Swagger ────────────────────────────────────────────────────────────────
  if (swaggerOn) {
    const doc = new DocumentBuilder()
      .setTitle('GloryCast AI API')
      .setDescription('AI-powered worship, broadcast & webinar platform API')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth',         'Authentication & authorization')
      .addTag('users',        'User management')
      .addTag('churches',     'Church management')
      .addTag('streams',      'Live streaming control')
      .addTag('webinars',     'Webinar management')
      .addTag('bible',        'Bible search & references')
      .addTag('ai',           'AI scripture detection & sermon tools')
      .addTag('quiz',         'Interactive quizzes')
      .addTag('polls',        'Live polls')
      .addTag('media',        'Media assets & uploads')
      .addTag('analytics',    'Stream & engagement analytics')
      .addTag('stage-display','Stage display management')
      .build()

    const document = SwaggerModule.createDocument(app, doc)
    SwaggerModule.setup(`${prefix}/docs`, app, document, {
      swaggerOptions: { persistAuthorization: true },
    })
    logger.log(`📚 Swagger docs: http://localhost:${port}/${prefix}/docs`)
  }

  await app.listen(port, '0.0.0.0')
  logger.log(`🚀 GloryCast API running on http://localhost:${port}/${prefix}`)
  logger.log(`🌍 Environment: ${config.get('nodeEnv')}`)
}

bootstrap()
