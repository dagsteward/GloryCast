import 'reflect-metadata'
import { NestFactory }    from '@nestjs/core'
import { AppModule }      from './app.module'
import { Logger }         from '@nestjs/common'

const logger = new Logger('AIWorker')

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const port = process.env.PORT ?? 3002
  await app.listen(port)
  logger.log(`AI Worker running on :${port}`)
}

bootstrap().catch(err => {
  logger.error('Failed to start', err)
  process.exit(1)
})
