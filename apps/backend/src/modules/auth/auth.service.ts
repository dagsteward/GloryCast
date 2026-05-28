import {
  Injectable, UnauthorizedException, ConflictException,
  BadRequestException, Logger,
} from '@nestjs/common'
import { JwtService }       from '@nestjs/jwt'
import { ConfigService }    from '@nestjs/config'
import { PrismaService }    from '../prisma/prisma.service'
import * as bcrypt          from 'bcryptjs'
import { randomBytes }      from 'crypto'
import { RegisterDto }      from './dto/register.dto'
import { LoginDto }         from './dto/login.dto'
import { Role }             from '@prisma/client'

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt:    JwtService,
    private readonly cfg:    ConfigService,
  ) {}

  // ── Register ───────────────────────────────────────────────────────────────

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } })
    if (existing) throw new ConflictException('Email already registered')

    const passwordHash = await bcrypt.hash(dto.password, 12)

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName:  dto.lastName,
      },
    })

    // If churchSlug provided, join that church; otherwise no church membership
    if (dto.churchSlug) {
      const church = await this.prisma.church.findUnique({ where: { slug: dto.churchSlug } })
      if (church) {
        await this.prisma.churchMember.create({
          data: {
            userId:    user.id,
            churchId:  church.id,
            role:      Role.VIEWER,
            isDefault: true,
          },
        })
      }
    }

    this.logger.log(`New user registered: ${user.email}`)
    return this.generateTokenPair(user.id, user.email)
  }

  // ── Login ──────────────────────────────────────────────────────────────────

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where:  { email: dto.email },
      include: {
        churchMemberships: {
          where:   { isDefault: true },
          include: { church: { select: { id: true, slug: true } } },
        },
      },
    })

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials')
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash)
    if (!valid) throw new UnauthorizedException('Invalid credentials')
    if (!user.isActive) throw new UnauthorizedException('Account is deactivated')

    await this.prisma.user.update({
      where: { id: user.id },
      data:  { lastLoginAt: new Date() },
    })

    const membership = user.churchMemberships[0]
    return this.generateTokenPair(
      user.id,
      user.email,
      membership?.churchId,
      membership?.role,
    )
  }

  // ── OAuth upsert (Google / Microsoft) ─────────────────────────────────────

  async oauthLogin(profile: {
    googleId?:    string
    microsoftId?: string
    email:        string
    firstName:    string
    lastName:     string
    avatarUrl?:   string
  }) {
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [
          profile.googleId    ? { googleId:    profile.googleId }    : undefined,
          profile.microsoftId ? { microsoftId: profile.microsoftId } : undefined,
          { email: profile.email },
        ].filter(Boolean) as any,
      },
      include: {
        churchMemberships: {
          where: { isDefault: true },
        },
      },
    })

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email:       profile.email,
          firstName:   profile.firstName,
          lastName:    profile.lastName,
          avatarUrl:   profile.avatarUrl,
          googleId:    profile.googleId,
          microsoftId: profile.microsoftId,
          emailVerified: true,
        },
        include: { churchMemberships: { where: { isDefault: true } } },
      })
    } else {
      // Update OAuth ID if not yet set
      await this.prisma.user.update({
        where: { id: user.id },
        data:  {
          googleId:    profile.googleId    ?? user.googleId,
          microsoftId: profile.microsoftId ?? user.microsoftId,
          avatarUrl:   profile.avatarUrl   ?? user.avatarUrl,
          lastLoginAt: new Date(),
        },
      })
    }

    const membership = user.churchMemberships[0]
    return this.generateTokenPair(user.id, user.email, membership?.churchId, membership?.role)
  }

  // ── Refresh tokens ─────────────────────────────────────────────────────────

  async refresh(refreshToken: string) {
    const record = await this.prisma.refreshToken.findUnique({
      where:   { token: refreshToken },
      include: { user: true },
    })

    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token')
    }

    // Rotate token
    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data:  { revokedAt: new Date() },
    })

    const membership = await this.prisma.churchMember.findFirst({
      where: { userId: record.userId, isDefault: true },
    })

    return this.generateTokenPair(
      record.userId,
      record.user.email,
      membership?.churchId,
      membership?.role,
    )
  }

  // ── Logout ────────────────────────────────────────────────────────────────

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data:  { revokedAt: new Date() },
    })
  }

  // ── Internal: generate access + refresh pair ──────────────────────────────

  private async generateTokenPair(
    userId:   string,
    email:    string,
    churchId?: string,
    role?:    Role,
  ) {
    const payload = {
      sub:      userId,
      email,
      churchId: churchId ?? null,
      role:     role     ?? 'VIEWER',
    }

    const accessToken = this.jwt.sign(payload, {
      secret:    this.cfg.get<string>('jwt.secret'),
      expiresIn: this.cfg.get<string>('jwt.expiresIn'),
    })

    const refreshToken = randomBytes(40).toString('hex')
    const expiresAt    = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    await this.prisma.refreshToken.create({
      data: { token: refreshToken, userId, expiresAt },
    })

    // Clean up old tokens (keep last 5 per user)
    const tokens = await this.prisma.refreshToken.findMany({
      where:   { userId, revokedAt: null },
      orderBy: { createdAt: 'desc' },
      skip:    5,
    })
    if (tokens.length) {
      await this.prisma.refreshToken.updateMany({
        where: { id: { in: tokens.map(t => t.id) } },
        data:  { revokedAt: new Date() },
      })
    }

    return { accessToken, refreshToken, expiresIn: 900 }
  }
}
