import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { IsString, IsArray, IsOptional, IsNumber, IsBoolean } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { QuizService }  from './quiz.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard }   from '../../common/guards/roles.guard'
import { Roles }        from '../../common/decorators/roles.decorator'
import { Public }       from '../../common/decorators/public.decorator'
import { CurrentChurch } from '../../common/decorators/current-user.decorator'

class CreateQuizDto {
  @ApiProperty() @IsString()  title: string
  @ApiPropertyOptional() @IsOptional() @IsString()  streamId?: string
  @ApiProperty() @IsArray()   questions: any[]
}

class SubmitResponseDto {
  @ApiProperty() @IsString()  participantId: string
  @ApiProperty() @IsNumber()  answeredOption: number
}

@ApiTags('quiz')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('quiz')
export class QuizController {
  constructor(private readonly quiz: QuizService) {}

  @Post()
  @UseGuards(RolesGuard) @Roles('PRODUCER')
  @ApiOperation({ summary: 'Create a quiz' })
  create(@CurrentChurch() churchId: string, @Body() dto: CreateQuizDto) {
    return this.quiz.create(churchId, dto.streamId, dto.title, dto.questions)
  }

  @Get()
  @ApiOperation({ summary: 'List quizzes' })
  list(@CurrentChurch() churchId: string, @Query('page') page = '1') {
    return this.quiz.list(churchId, +page)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get quiz with questions' })
  findById(@CurrentChurch() churchId: string, @Param('id') id: string) {
    return this.quiz.findById(churchId, id)
  }

  @Post(':id/activate')
  @UseGuards(RolesGuard) @Roles('PRODUCER')
  @ApiOperation({ summary: 'Activate quiz (makes it live)' })
  activate(@CurrentChurch() churchId: string, @Param('id') id: string) {
    return this.quiz.activate(churchId, id)
  }

  @Public()
  @Post(':quizId/questions/:questionId/respond')
  @ApiOperation({ summary: 'Submit a quiz answer (public)' })
  respond(
    @Param('quizId')     quizId:     string,
    @Param('questionId') questionId: string,
    @Body() dto: SubmitResponseDto,
  ) {
    return this.quiz.submitResponse(quizId, questionId, dto.participantId, dto.answeredOption)
  }

  @Get(':id/leaderboard')
  @ApiOperation({ summary: 'Get quiz leaderboard' })
  leaderboard(@Param('id') id: string) {
    return this.quiz.getLeaderboard(id)
  }
}
