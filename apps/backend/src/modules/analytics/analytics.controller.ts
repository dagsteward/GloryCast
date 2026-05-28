import { Controller, Get, Param, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { AnalyticsService } from './analytics.service'
import { JwtAuthGuard }     from '../../common/guards/jwt-auth.guard'
import { RolesGuard }       from '../../common/guards/roles.guard'
import { Roles }            from '../../common/decorators/roles.decorator'
import { CurrentChurch }    from '../../common/decorators/current-user.decorator'

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PRODUCER')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get church analytics dashboard' })
  dashboard(@CurrentChurch() churchId: string) {
    return this.analytics.getDashboard(churchId)
  }

  @Get('streams/:streamId')
  @ApiOperation({ summary: 'Get analytics for a specific stream' })
  streamAnalytics(@CurrentChurch() churchId: string, @Param('streamId') streamId: string) {
    return this.analytics.getStreamAnalytics(churchId, streamId)
  }
}
