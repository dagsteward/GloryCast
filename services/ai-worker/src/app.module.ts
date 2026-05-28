import { Module }         from '@nestjs/common'
import { ConfigModule }   from '@nestjs/config'
import { HttpModule }     from '@nestjs/axios'
import { BullModule }     from '@nestjs/bull'
import { WhisperModule }  from './whisper/whisper.module'
import { SermonModule }   from './sermon/sermon.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env.local', '.env'] }),
    HttpModule,
    BullModule.forRoot({ redis: { host: process.env.REDIS_HOST ?? 'localhost', port: 6379 } }),
    WhisperModule,
    SermonModule,
  ],
})
export class AppModule {}
