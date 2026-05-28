import { Module }       from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { RTMPModule }   from './rtmp/rtmp.module'
import { LiveKitModule } from './livekit/livekit.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env.local', '.env'] }),
    RTMPModule,
    LiveKitModule,
  ],
})
export class AppModule {}
