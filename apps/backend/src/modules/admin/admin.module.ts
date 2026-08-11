import { Module } from '@nestjs/common'
import { AdminController } from './admin.controller'
import { LicensingModule } from '../licensing/licensing.module'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [LicensingModule, PrismaModule],
  controllers: [AdminController],
})
export class AdminModule {}
