import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { WebinarService }   from './webinar.service'
import { CreateWebinarDto, UpdateWebinarDto, JoinWebinarDto } from './dto/webinar.dto'
import { JwtAuthGuard }     from '../../common/guards/jwt-auth.guard'
import { RolesGuard }       from '../../common/guards/roles.guard'
import { Roles }            from '../../common/decorators/roles.decorator'
import { Public }           from '../../common/decorators/public.decorator'
import { CurrentUser, CurrentChurch, JwtPayload } from '../../common/decorators/current-user.decorator'

@ApiTags('webinars')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('webinars')
export class WebinarController {
  constructor(private readonly webinars: WebinarService) {}

  @Post()
  @ApiOperation({ summary: 'Create a webinar' })
  @UseGuards(RolesGuard)
  @Roles('PRODUCER')
  create(@CurrentChurch() churchId: string, @CurrentUser() u: JwtPayload, @Body() dto: CreateWebinarDto) {
    return this.webinars.create(churchId, u.sub, dto)
  }

  @Get()
  @ApiOperation({ summary: 'List webinars for the church' })
  list(
    @CurrentChurch() churchId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    return this.webinars.list(churchId, +page, +limit)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get webinar details' })
  findById(@CurrentChurch() churchId: string, @Param('id') id: string) {
    return this.webinars.findById(churchId, id)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update webinar' })
  @UseGuards(RolesGuard)
  @Roles('PRODUCER')
  update(@CurrentChurch() churchId: string, @Param('id') id: string, @Body() dto: UpdateWebinarDto) {
    return this.webinars.update(churchId, id, dto)
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Start a webinar' })
  @UseGuards(RolesGuard)
  @Roles('PRODUCER')
  start(@CurrentChurch() churchId: string, @Param('id') id: string) {
    return this.webinars.start(churchId, id)
  }

  @Post(':id/end')
  @ApiOperation({ summary: 'End a webinar' })
  @UseGuards(RolesGuard)
  @Roles('PRODUCER')
  end(@CurrentChurch() churchId: string, @Param('id') id: string) {
    return this.webinars.end(churchId, id)
  }

  @Public()
  @Post(':id/join')
  @ApiOperation({ summary: 'Join a webinar (public, no auth required)' })
  join(@Param('id') id: string, @Body() dto: JoinWebinarDto) {
    return this.webinars.join(id, dto)
  }

  @Get(':id/attendees')
  @ApiOperation({ summary: 'List webinar attendees' })
  @UseGuards(RolesGuard)
  @Roles('PRODUCER')
  getAttendees(
    @CurrentChurch() churchId: string,
    @Param('id') id: string,
    @Query('page') page = '1',
  ) {
    return this.webinars.getAttendees(churchId, id, +page)
  }
}
