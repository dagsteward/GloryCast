import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService }   from '../prisma/prisma.service'
import { UpdateUserDto }   from './dto/update-user.dto'

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        memberships: {
          include: { church: { select: { id: true, name: true, slug: true, logoUrl: true } } },
        },
      },
    })
    if (!user) throw new NotFoundException('User not found')
    const { passwordHash, ...safe } = user
    return safe
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.update({
      where: { id },
      data:  dto,
    })
    const { passwordHash, ...safe } = user
    return safe
  }

  async listByChurch(churchId: string, page = 1, limit = 20) {
    const skip  = (page - 1) * limit
    const [members, total] = await Promise.all([
      this.prisma.churchMember.findMany({
        where: { churchId },
        skip,
        take:  limit,
        include: {
          user: {
            select: { id: true, email: true, displayName: true, avatarUrl: true, lastLoginAt: true },
          },
        },
        orderBy: { joinedAt: 'desc' },
      }),
      this.prisma.churchMember.count({ where: { churchId } }),
    ])
    return { members, total, page, limit }
  }

  async updateRole(churchId: string, userId: string, role: string) {
    return this.prisma.churchMember.update({
      where:  { userId_churchId: { userId, churchId } },
      data:   { role: role as any },
    })
  }

  async removeMember(churchId: string, userId: string) {
    await this.prisma.churchMember.delete({
      where: { userId_churchId: { userId, churchId } },
    })
  }
}
