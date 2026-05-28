import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Role }      from '@prisma/client'
import { ROLES_KEY } from '../decorators/roles.decorator'
import { JwtPayload } from '../decorators/current-user.decorator'

// Role hierarchy — higher index = more permissions
const ROLE_ORDER: Role[] = [
  'VIEWER',
  'CAMERA_OPERATOR',
  'LYRICS_OPERATOR',
  'BIBLE_OPERATOR',
  'PRODUCER',
  'CHURCH_ADMIN',
  'SUPER_ADMIN',
]

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ])
    if (!required?.length) return true

    const user: JwtPayload = ctx.switchToHttp().getRequest().user
    if (!user) throw new ForbiddenException('Not authenticated')

    const userRank     = ROLE_ORDER.indexOf(user.role as Role)
    const minRequired  = Math.min(...required.map(r => ROLE_ORDER.indexOf(r)))

    if (userRank < minRequired) {
      throw new ForbiddenException(`Required role: ${required.join(' or ')}`)
    }
    return true
  }
}
