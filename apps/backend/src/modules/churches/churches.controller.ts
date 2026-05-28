import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { ChurchesService }  from './churches.service'
import { CreateChurchDto, UpdateChurchDto } from './dto/church.dto'
import { JwtAuthGuard }     from '../../common/guards/jwt-auth.guard'
import { RolesGuard }       from '../../common/guards/roles.guard'
import { Roles }            from '../../common/decorators/roles.decorator'
import { CurrentUser, CurrentChurch, JwtPayload } from '../../common/decorators/current-user.decorator'

@ApiTags('churches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('churches')
export class ChurchesController {
  constructor(private readonly churches: ChurchesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new church (admin creates and is auto-joined)' })
  create(@Body() dto: CreateChurchDto, @CurrentUser() user: JwtPayload) {
    return this.churches.create(dto, user.sub)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get church details by ID' })
  findById(@Param('id') id: string) {
    return this.churches.findById(id)
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get church by slug (public lookup)' })
  findBySlug(@Param('slug') slug: string) {
    return this.churches.findBySlug(slug)
  }

  @Patch()
  @ApiOperation({ summary: 'Update current church settings' })
  @UseGuards(RolesGuard)
  @Roles('CHURCH_ADMIN')
  update(@CurrentChurch() churchId: string, @Body() dto: UpdateChurchDto) {
    return this.churches.update(churchId, dto)
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get church statistics' })
  @UseGuards(RolesGuard)
  @Roles('PRODUCER')
  getStats(@CurrentChurch() churchId: string) {
    return this.churches.getStats(churchId)
  }

  @Get('api-keys')
  @ApiOperation({ summary: 'List API keys for this church' })
  @UseGuards(RolesGuard)
  @Roles('CHURCH_ADMIN')
  listApiKeys(@CurrentChurch() churchId: string) {
    return this.churches.getApiKeys(churchId)
  }

  @Post('api-keys')
  @ApiOperation({ summary: 'Generate a new API key' })
  @UseGuards(RolesGuard)
  @Roles('CHURCH_ADMIN')
  createApiKey(
    @CurrentChurch() churchId: string,
    @Body('name') name: string,
    @Body('scopes') scopes: string[],
  ) {
    return this.churches.createApiKey(churchId, name, scopes)
  }

  @Delete('api-keys/:keyId')
  @ApiOperation({ summary: 'Revoke an API key' })
  @UseGuards(RolesGuard)
  @Roles('CHURCH_ADMIN')
  revokeApiKey(@CurrentChurch() churchId: string, @Param('keyId') keyId: string) {
    return this.churches.revokeApiKey(churchId, keyId)
  }
}
