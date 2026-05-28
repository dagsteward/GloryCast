import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { MediaService }       from './media.service'
import { PresignUploadDto, ConfirmUploadDto } from './dto/media.dto'
import { JwtAuthGuard }       from '../../common/guards/jwt-auth.guard'
import { RolesGuard }         from '../../common/guards/roles.guard'
import { Roles }              from '../../common/decorators/roles.decorator'
import { CurrentUser, CurrentChurch, JwtPayload } from '../../common/decorators/current-user.decorator'

@ApiTags('media')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post('presign-upload')
  @ApiOperation({ summary: 'Get a presigned MinIO upload URL' })
  presignUpload(@CurrentChurch() churchId: string, @Body() dto: PresignUploadDto) {
    return this.media.presignUpload(churchId, dto)
  }

  @Post('confirm-upload')
  @ApiOperation({ summary: 'Confirm upload and create asset record' })
  confirmUpload(
    @CurrentChurch() churchId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ConfirmUploadDto,
  ) {
    return this.media.confirmUpload(churchId, user.sub, dto)
  }

  @Get()
  @ApiOperation({ summary: 'List media assets for the church' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'type', required: false, enum: ['VIDEO', 'AUDIO', 'IMAGE', 'DOCUMENT'] })
  list(
    @CurrentChurch() churchId: string,
    @Query('page')  page  = '1',
    @Query('limit') limit = '20',
    @Query('type')  type?: string,
  ) {
    return this.media.list(churchId, +page, +limit, type)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a media asset by ID' })
  findById(@CurrentChurch() churchId: string, @Param('id') id: string) {
    return this.media.findById(churchId, id)
  }

  @Get(':id/download-url')
  @ApiOperation({ summary: 'Get a presigned download URL for an asset' })
  presignDownload(@CurrentChurch() churchId: string, @Param('id') id: string) {
    return this.media.presignDownload(churchId, id)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a media asset' })
  @UseGuards(RolesGuard)
  @Roles('PRODUCER')
  delete(@CurrentChurch() churchId: string, @Param('id') id: string) {
    return this.media.delete(churchId, id)
  }
}
