import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { IsString, IsOptional, IsBoolean } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { QAService }    from './qa.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard }   from '../../common/guards/roles.guard'
import { Roles }        from '../../common/decorators/roles.decorator'
import { Public }       from '../../common/decorators/public.decorator'
import { CurrentChurch } from '../../common/decorators/current-user.decorator'

class SubmitQuestionDto {
  @ApiProperty() @IsString() streamId:   string
  @ApiProperty() @IsString() authorName: string
  @ApiProperty() @IsString() text:       string
  @ApiPropertyOptional() @IsOptional() @IsString() authorId?: string
}

class AnswerDto {
  @ApiPropertyOptional() @IsOptional() @IsString() answer?: string
}

@ApiTags('qa')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('qa')
export class QAController {
  constructor(private readonly qa: QAService) {}

  @Public()
  @Post('questions')
  @ApiOperation({ summary: 'Submit a Q&A question (public)' })
  submit(@CurrentChurch() churchId: string, @Body() dto: SubmitQuestionDto) {
    return this.qa.submitQuestion(dto.streamId, churchId, dto.authorName, dto.text, dto.authorId)
  }

  @Get('questions')
  @ApiOperation({ summary: 'List questions for a stream' })
  list(
    @CurrentChurch() churchId: string,
    @Query('streamId') streamId: string,
    @Query('onlyAnswered') onlyAnswered = 'false',
  ) {
    return this.qa.list(churchId, streamId, onlyAnswered === 'true')
  }

  @Post('questions/:id/upvote')
  @Public()
  upvote(@Param('id') id: string, @Body('participantId') participantId: string) {
    return this.qa.upvote(id, participantId)
  }

  @Patch('questions/:id/star')
  @UseGuards(RolesGuard) @Roles('PRODUCER')
  star(@CurrentChurch() churchId: string, @Param('id') id: string) {
    return this.qa.star(churchId, id)
  }

  @Patch('questions/:id/answer')
  @UseGuards(RolesGuard) @Roles('PRODUCER')
  answer(@CurrentChurch() churchId: string, @Param('id') id: string, @Body() dto: AnswerDto) {
    return this.qa.markAnswered(churchId, id, dto.answer)
  }

  @Delete('questions/:id')
  @UseGuards(RolesGuard) @Roles('PRODUCER')
  dismiss(@CurrentChurch() churchId: string, @Param('id') id: string) {
    return this.qa.dismiss(churchId, id)
  }
}
