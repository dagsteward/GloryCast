import { Module } from '@nestjs/common'
import { LicensingService } from './licensing.service'
import { LicensingController } from './licensing.controller'
import { PaddleWebhookController } from './paddle-webhook.controller'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [LicensingController, PaddleWebhookController],
  providers: [LicensingService],
  exports: [LicensingService],
})
export class LicensingModule {}
