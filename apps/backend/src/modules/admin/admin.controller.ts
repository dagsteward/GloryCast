import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { LicenseStatus } from '@prisma/client'
import { LicensingService } from '../licensing/licensing.service'
import { PrismaService } from '../prisma/prisma.service'
import { SetLicenseStatusDto } from './dto/admin.dto'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { Role } from '@prisma/client'

// ─────────────────────────────────────────────────────────────────────────────
// Business console API.
//
// Everything here is platform-wide (spans every church, every licence) rather
// than scoped to one church, so it is deliberately its own controller under
// /admin rather than folded into ChurchesController or LicensingController —
// mixing platform-operator routes into a customer-facing controller is how
// you eventually leak one into the other's auth assumptions.
//
// SUPER_ADMIN only, platform-wide. There is exactly one console; it is not
// per-church.
// ─────────────────────────────────────────────────────────────────────────────

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly licensing: LicensingService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('overview')
  @ApiOperation({ summary: 'Platform-wide licence counts and recent activity' })
  overview() {
    return this.licensing.overview()
  }

  @Get('licences')
  @ApiOperation({ summary: 'Search and paginate licences' })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'status', required: false, enum: LicenseStatus })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  licences(
    @Query('q') query?: string,
    @Query('status') status?: LicenseStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.licensing.list({
      query,
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    })
  }

  @Post('licences/:key/status')
  @ApiOperation({ summary: 'Revoke, cancel, or reactivate a licence' })
  async setStatus(@Param('key') key: string, @Body() dto: SetLicenseStatusDto) {
    await this.licensing.setStatusByKey(key, dto.status, dto.note)
    return { ok: true }
  }

  @Get('churches')
  @ApiOperation({ summary: 'List churches with member and stream counts' })
  async churches() {
    return this.prisma.church.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        name: true,
        slug: true,
        country: true,
        subscriptionTier: true,
        createdAt: true,
        _count: { select: { users: true, streams: true } },
      },
    })
  }
}
