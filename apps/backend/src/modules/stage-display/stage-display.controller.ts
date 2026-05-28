import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation }   from '@nestjs/swagger'
import { IsString, IsOptional, IsNumber, IsEnum, IsObject } from 'class-validator'
import { ApiProperty, ApiPropertyOptional }       from '@nestjs/swagger'
import { StageDisplayService, StageContent }      from './stage-display.service'
import { JwtAuthGuard }  from '../../common/guards/jwt-auth.guard'
import { RolesGuard }    from '../../common/guards/roles.guard'
import { Roles }         from '../../common/decorators/roles.decorator'
import { Public }        from '../../common/decorators/public.decorator'
import { CurrentChurch } from '../../common/decorators/current-user.decorator'

class UpdateStageDto implements StageContent {
  @ApiProperty({ enum: ['SCRIPTURE', 'LYRICS', 'MESSAGE', 'COUNTDOWN', 'BLANK'] })
  @IsEnum(['SCRIPTURE', 'LYRICS', 'MESSAGE', 'COUNTDOWN', 'BLANK'])
  type: 'SCRIPTURE' | 'LYRICS' | 'MESSAGE' | 'COUNTDOWN' | 'BLANK'

  @ApiPropertyOptional() @IsOptional() @IsString()  title?:     string
  @ApiPropertyOptional() @IsOptional() @IsString()  body?:      string
  @ApiPropertyOptional() @IsOptional() @IsString()  reference?: string
  @ApiPropertyOptional() @IsOptional() @IsNumber()  countdown?: number
  @ApiPropertyOptional() @IsOptional() @IsObject()  style?:     Record<string, any>
}

@ApiTags('stage-display')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('stage-display')
export class StageDisplayController {
  constructor(private readonly stage: StageDisplayService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get current stage display content (public — used by display screen)' })
  get(@CurrentChurch() churchId: string) {
    return this.stage.getForChurch(churchId)
  }

  @Post()
  @ApiOperation({ summary: 'Update stage display content' })
  @UseGuards(RolesGuard)
  @Roles('LYRICS_OPERATOR')
  update(@CurrentChurch() churchId: string, @Body() dto: UpdateStageDto) {
    return this.stage.updateContent(churchId, dto)
  }

  @Post('blank')
  @ApiOperation({ summary: 'Blank the stage display' })
  @UseGuards(RolesGuard)
  @Roles('LYRICS_OPERATOR')
  blank(@CurrentChurch() churchId: string) {
    return this.stage.setBlank(churchId)
  }

  @Post('countdown')
  @ApiOperation({ summary: 'Start a countdown on stage display' })
  @UseGuards(RolesGuard)
  @Roles('LYRICS_OPERATOR')
  countdown(@CurrentChurch() churchId: string, @Body('seconds') seconds: number) {
    return this.stage.setCountdown(churchId, seconds)
  }
}
