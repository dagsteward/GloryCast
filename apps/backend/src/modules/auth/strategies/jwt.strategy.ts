import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy }                   from '@nestjs/passport'
import { Strategy, ExtractJwt }               from 'passport-jwt'
import { ConfigService }                      from '@nestjs/config'
import { PrismaService }                      from '../../prisma/prisma.service'
import { JwtPayload }                         from '../../../common/decorators/current-user.decorator'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly cfg:    ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest:   ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey:      cfg.get<string>('jwt.secret')!,
      ignoreExpiration: false,
    })
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, isActive: true },
    })
    if (!user || !user.isActive) throw new UnauthorizedException()
    return payload
  }
}
