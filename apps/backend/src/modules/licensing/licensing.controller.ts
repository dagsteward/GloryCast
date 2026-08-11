import {
  Controller, Post, Get, Body, Param, Ip, UseGuards, HttpCode, NotFoundException,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { LicensingService } from './licensing.service'
import { MailService } from '../mail/mail.service'
import { ActivateDto, RefreshDto, DeactivateDto, IssueLicenseDto } from './dto/licensing.dto'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { Public } from '../../common/decorators/public.decorator'
import { Role } from '@prisma/client'

// ─────────────────────────────────────────────────────────────────────────────
// Licence endpoints.
//
// The three device endpoints are public by design: the desktop app calls them
// before any user has signed in, and a licence key is itself the credential.
// They are rate limited because a public endpoint that takes a key is exactly
// where someone would try to brute-force one.
// ─────────────────────────────────────────────────────────────────────────────

@ApiTags('licensing')
@Controller('licence')
export class LicensingController {
  constructor(
    private readonly licensing: LicensingService,
    private readonly mail: MailService,
  ) {}

  @Public()
  // A real church activates a handful of times a year. Anything near this
  // ceiling is an attack, not an operator.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('activate')
  @HttpCode(200)
  @ApiOperation({ summary: 'Activate a licence on a machine and return a signed licence' })
  activate(@Body() dto: ActivateDto, @Ip() ip: string) {
    return this.licensing.activate({ ...dto, ip })
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Re-issue a signed licence for an activated machine' })
  refresh(@Body() dto: RefreshDto, @Ip() ip: string) {
    return this.licensing.refresh({ ...dto, ip })
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('deactivate')
  @HttpCode(200)
  @ApiOperation({ summary: 'Release this machine’s seat' })
  async deactivate(@Body() dto: DeactivateDto, @Ip() ip: string) {
    await this.licensing.deactivate({ ...dto, ip })
    return { ok: true }
  }

  // ── Administration ──────────────────────────────────────────────────────

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @Post('issue')
  @ApiOperation({ summary: 'Issue a licence manually (pilots, gifts, support)' })
  async issue(@Body() dto: IssueLicenseDto) {
    const { key, expiresAt, seats } = await this.licensing.issue(dto)
    await this.mail.sendLicenseKey({
      to: dto.email,
      organisation: dto.organisation,
      key,
      expiresAt,
      seats,
    })
    return { key, expiresAt, seats }
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @Get(':key')
  @ApiOperation({ summary: 'Look up a licence, its seats and recent activity' })
  lookup(@Param('key') key: string) {
    return this.licensing.lookup(key)
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @Post(':key/resend')
  @HttpCode(200)
  @ApiOperation({ summary: 'Re-send the licence key email — for a customer who lost it' })
  async resend(@Param('key') key: string) {
    const license = await this.licensing.lookup(key)
    if (!license) throw new NotFoundException('That licence key was not recognised.')

    const sent = await this.mail.sendLicenseKey({
      to: license.email,
      organisation: license.organisation,
      key: license.key,
      expiresAt: license.expiresAt,
      seats: license.seats,
    })
    return { sent }
  }
}
