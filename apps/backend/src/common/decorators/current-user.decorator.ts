import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export interface JwtPayload {
  sub:      string // userId
  email:    string
  churchId: string
  role:     string
  iat?:     number
  exp?:     number
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest()
    return request.user as JwtPayload
  },
)

export const CurrentChurch = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest()
    return (request.user as JwtPayload)?.churchId
  },
)
