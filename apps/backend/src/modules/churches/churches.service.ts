import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService }   from '../prisma/prisma.service'
import { CreateChurchDto, UpdateChurchDto } from './dto/church.dto'

@Injectable()
export class ChurchesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateChurchDto, adminUserId: string) {
    const existing = await this.prisma.church.findUnique({ where: { slug: dto.slug } })
    if (existing) throw new ConflictException('Church slug already taken')

    return this.prisma.$transaction(async tx => {
      const church = await tx.church.create({ data: dto })
      await tx.churchMember.create({
        data: { churchId: church.id, userId: adminUserId, role: 'CHURCH_ADMIN' },
      })
      return church
    })
  }

  async findById(id: string) {
    const church = await this.prisma.church.findUnique({
      where: { id },
      include: {
        _count: { select: { members: true, streams: true } },
      },
    })
    if (!church) throw new NotFoundException('Church not found')
    return church
  }

  async findBySlug(slug: string) {
    const church = await this.prisma.church.findUnique({ where: { slug } })
    if (!church) throw new NotFoundException('Church not found')
    return church
  }

  async update(id: string, dto: UpdateChurchDto) {
    return this.prisma.church.update({ where: { id }, data: dto })
  }

  async getStats(churchId: string) {
    const [members, streams, sermons, mediaAssets] = await Promise.all([
      this.prisma.churchMember.count({ where: { churchId } }),
      this.prisma.stream.count({ where: { churchId } }),
      this.prisma.sermon.count({ where: { churchId } }),
      this.prisma.mediaAsset.count({ where: { churchId } }),
    ])
    return { members, streams, sermons, mediaAssets }
  }

  async getApiKeys(churchId: string) {
    return this.prisma.apiKey.findMany({
      where: { churchId },
      select: { id: true, name: true, keyPrefix: true, scopes: true, expiresAt: true, lastUsedAt: true, createdAt: true },
    })
  }

  async createApiKey(churchId: string, name: string, scopes: string[]) {
    const { randomBytes } = await import('crypto')
    const key    = randomBytes(32).toString('hex')
    const prefix = key.slice(0, 8)
    const { createHash } = await import('crypto')
    const hashed = createHash('sha256').update(key).digest('hex')

    await this.prisma.apiKey.create({
      data: { churchId, name, keyPrefix: prefix, keyHash: hashed, scopes },
    })

    return { key: `gc_${key}`, prefix }
  }

  async revokeApiKey(churchId: string, keyId: string) {
    await this.prisma.apiKey.deleteMany({ where: { id: keyId, churchId } })
  }
}
