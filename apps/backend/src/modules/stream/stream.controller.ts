import {
  Controller, Get, Post, Patch, Param, Body,
  UseGuards, Query,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { StreamService }    from './stream.service'
import { CreateStreamDto, UpdateStreamDto } from './dto/stream.dto'
import { JwtAuthGuard }     from '../../common/guards/jwt-auth.guard'
import { RolesGuard }       from '../../common/guards/roles.guard'
import { Roles }            from '../../common/decorators/roles.decorator'
import { CurrentUser, CurrentChurch, JwtPayload } from '../../common/decorators/current-user.decorator'

@ApiTags('streams')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('streams')
export class StreamController {
  constructor(private readonly streamService: StreamService) {}

  @Post()
  @Roles('PRODUCER', 'CHURCH_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Create a new stream session' })
  create(
    @Body() dto:             CreateStreamDto,
    @CurrentUser() user:     JwtPayload,
    @CurrentChurch() church: string,
  ) {
    return this.streamService.create(church, user.sub, dto)
  }

  @Get()
  @ApiOperation({ summary: 'List all streams for the current church' })
  findAll(
    @CurrentChurch() church: string,
    @Query('status')  status?: string,
  ) {
    return this.streamService.findAll(church, status)
  }

  @Get('live')
  @ApiOperation({ summary: 'Get currently live streams' })
  getLive(@CurrentChurch() church: string) {
    return this.streamService.getLiveStreams(church)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single stream by ID' })
  findOne(@Param('id') id: string, @CurrentChurch() church: string) {
    return this.streamService.findOne(id, church)
  }

  @Get(':id/key')
  @Roles('PRODUCER', 'CHURCH_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get stream ingest key and RTMP URL' })
  getKey(@Param('id') id: string, @CurrentChurch() church: string) {
    return this.streamService.getStreamKey(id, church)
  }

  @Post(':id/start')
  @Roles('PRODUCER', 'CHURCH_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Start the stream (go live)' })
  start(@Param('id') id: string, @CurrentChurch() church: string) {
    return this.streamService.start(id, church)
  }

  @Post(':id/stop')
  @Roles('PRODUCER', 'CHURCH_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Stop the stream' })
  stop(@Param('id') id: string, @CurrentChurch() church: string) {
    return this.streamService.stop(id, church)
  }

  @Patch(':id')
  @Roles('PRODUCER', 'CHURCH_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Update stream settings' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateStreamDto,
    @CurrentChurch() church: string,
  ) {
    return this.streamService.update(id, church, dto)
  }
}
