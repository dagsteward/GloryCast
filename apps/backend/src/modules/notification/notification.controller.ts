import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation }         from '@nestjs/swagger'
import { NotificationService } from './notification.service'
import { JwtAuthGuard }        from '../../common/guards/jwt-auth.guard'
import { CurrentUser, CurrentChurch, JwtPayload } from '../../common/decorators/current-user.decorator'

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notifications: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'List notifications for current user' })
  list(
    @CurrentUser() user: JwtPayload,
    @CurrentChurch() churchId: string,
    @Query('page') page = '1',
  ) {
    return this.notifications.list(user.sub, churchId, +page)
  }

  @Post('mark-read')
  @ApiOperation({ summary: 'Mark specific notifications as read' })
  markRead(@CurrentUser() user: JwtPayload, @Body('ids') ids: string[]) {
    return this.notifications.markRead(user.sub, ids)
  }

  @Post('mark-all-read')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllRead(@CurrentUser() user: JwtPayload, @CurrentChurch() churchId: string) {
    return this.notifications.markAllRead(user.sub, churchId)
  }
}
