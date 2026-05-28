import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { IsString, IsArray, IsOptional, IsBoolean, IsNumber } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { PollService }  from './poll.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard }   from '../../common/guards/roles.guard'
import { Roles }        from '../../common/decorators/roles.decorator'
import { Public }       from '../../common/decorators/public.decorator'
import { CurrentChurch } from '../../common/decorators/current-user.decorator'

class CreatePollDto {
  @ApiProperty() @IsString()  question: string
  @ApiProperty() @IsArray()   options: string[]
  @ApiPropertyOptional() @IsOptional() @IsString() streamId?: string
  @ApiPropertyOptional() @IsOptional() @IsBoolean() allowMultiple?: boolean
}

class VoteDto {
  @ApiProperty() @IsString()  participantId: string
  @ApiProperty() @IsArray()   optionIds: number[]
}

@ApiTags('polls')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('polls')
export class PollController {
  constructor(private readonly polls: PollService) {}

  @Post()
  @UseGuards(RolesGuard) @Roles('PRODUCER')
  @ApiOperation({ summary: 'Create a poll' })
  create(@CurrentChurch() churchId: string, @Body() dto: CreatePollDto) {
    return this.polls.create(churchId, dto.streamId, dto.question, dto.options, dto.allowMultiple)
  }

  @Get()
  @ApiOperation({ summary: 'List polls' })
  list(@CurrentChurch() churchId: string, @Query('page') page = '1') {
    return this.polls.list(churchId, +page)
  }

  @Post(':id/activate')
  @UseGuards(RolesGuard) @Roles('PRODUCER')
  activate(@CurrentChurch() churchId: string, @Param('id') id: string) {
    return this.polls.activate(churchId, id)
  }

  @Post(':id/close')
  @UseGuards(RolesGuard) @Roles('PRODUCER')
  close(@CurrentChurch() churchId: string, @Param('id') id: string) {
    return this.polls.close(churchId, id)
  }

  @Public()
  @Post(':id/vote')
  @ApiOperation({ summary: 'Cast a vote (public)' })
  vote(@Param('id') id: string, @Body() dto: VoteDto) {
    return this.polls.vote(id, dto.participantId, dto.optionIds)
  }

  @Get(':id/results')
  @ApiOperation({ summary: 'Get poll results' })
  results(@CurrentChurch() churchId: string, @Param('id') id: string) {
    return this.polls.getResults(churchId, id)
  }
}
