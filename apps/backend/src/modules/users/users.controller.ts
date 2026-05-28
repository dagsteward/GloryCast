import { Controller, Get, Patch, Body, Param, Delete, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { UsersService }   from './users.service'
import { UpdateUserDto }  from './dto/update-user.dto'
import { JwtAuthGuard }   from '../../common/guards/jwt-auth.guard'
import { RolesGuard }     from '../../common/guards/roles.guard'
import { Roles }          from '../../common/decorators/roles.decorator'
import { CurrentUser, CurrentChurch, JwtPayload } from '../../common/decorators/current-user.decorator'

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  getMe(@CurrentUser() user: JwtPayload) {
    return this.users.findById(user.sub)
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  updateMe(@CurrentUser() user: JwtPayload, @Body() dto: UpdateUserDto) {
    return this.users.update(user.sub, dto)
  }

  @Get('church-members')
  @ApiOperation({ summary: 'List all members of the current church' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @UseGuards(RolesGuard)
  @Roles('CHURCH_ADMIN')
  listMembers(
    @CurrentChurch() churchId: string,
    @Query('page')  page  = '1',
    @Query('limit') limit = '20',
  ) {
    return this.users.listByChurch(churchId, +page, +limit)
  }

  @Patch(':userId/role')
  @ApiOperation({ summary: 'Update a member role' })
  @UseGuards(RolesGuard)
  @Roles('CHURCH_ADMIN')
  updateRole(
    @CurrentChurch() churchId: string,
    @Param('userId') userId: string,
    @Body('role') role: string,
  ) {
    return this.users.updateRole(churchId, userId, role)
  }

  @Delete(':userId')
  @ApiOperation({ summary: 'Remove a member from the church' })
  @UseGuards(RolesGuard)
  @Roles('CHURCH_ADMIN')
  removeMember(
    @CurrentChurch() churchId: string,
    @Param('userId') userId: string,
  ) {
    return this.users.removeMember(churchId, userId)
  }
}
