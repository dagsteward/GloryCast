import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { IsString, IsBoolean, IsNumber }        from 'class-validator'
import { ApiProperty }                          from '@nestjs/swagger'
import { NDIEngineService }  from './ndi-engine.service'
import { JwtAuthGuard }      from '../../common/guards/jwt-auth.guard'
import { RolesGuard }        from '../../common/guards/roles.guard'
import { Roles }             from '../../common/decorators/roles.decorator'

class AddSourceDto {
  @ApiProperty() @IsString()  name:   string
  @ApiProperty() @IsString()  url:    string
  @ApiProperty() @IsBoolean() online: boolean
  @ApiProperty() @IsNumber()  latency: number
}

@ApiTags('ndi')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ndi')
export class NDIEngineController {
  constructor(private readonly ndi: NDIEngineService) {}

  @Get('sources')
  @ApiOperation({ summary: 'List discovered NDI sources' })
  getSources() {
    return this.ndi.getSources()
  }

  @Post('sources')
  @ApiOperation({ summary: 'Manually add an NDI source' })
  @UseGuards(RolesGuard) @Roles('CAMERA_OPERATOR')
  addSource(@Body() dto: AddSourceDto) {
    return this.ndi.addSource(dto)
  }

  @Delete('sources/:url')
  @ApiOperation({ summary: 'Remove an NDI source' })
  @UseGuards(RolesGuard) @Roles('CAMERA_OPERATOR')
  removeSource(@Param('url') url: string) {
    this.ndi.removeSource(decodeURIComponent(url))
    return { removed: true }
  }
}
