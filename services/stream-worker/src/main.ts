import 'reflect-metadata'
import { NestFactory }   from '@nestjs/core'
import { AppModule }     from './app.module'
import { Logger }        from '@nestjs/common'
import { RTMPService }   from './rtmp/rtmp.service'

const logger = new Logger('StreamWorker')

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const port = process.env.PORT ?? 3003

  // Start RTMP server
  const rtmp = app.get(RTMPService)
  rtmp.start()

  await app.listen(port)
  logger.log(`Stream Worker HTTP on :${port}`)
  logger.log(`RTMP server on :${process.env.RTMP_PORT ?? 1935}`)
}

bootstrap().catch(err => {
  logger.error('Failed to start', err)
  process.exit(1)
})
