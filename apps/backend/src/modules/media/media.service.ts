import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { ConfigService }  from '@nestjs/config'
import { PrismaService }  from '../prisma/prisma.service'
import { PresignUploadDto, ConfirmUploadDto } from './dto/media.dto'
import * as Minio         from 'minio'

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name)
  private readonly minio: Minio.Client
  private readonly bucket: string

  constructor(
    private readonly prisma: PrismaService,
    private readonly cfg:    ConfigService,
  ) {
    this.minio = new Minio.Client({
      endPoint:  this.cfg.get('minio.endpoint')!,
      port:      this.cfg.get<number>('minio.port'),
      useSSL:    this.cfg.get<boolean>('minio.useSSL'),
      accessKey: this.cfg.get('minio.accessKey')!,
      secretKey: this.cfg.get('minio.secretKey')!,
    })
    this.bucket = this.cfg.get('minio.bucket') ?? 'glorycast'
  }

  async presignUpload(churchId: string, dto: PresignUploadDto) {
    const ext       = dto.fileName.split('.').pop()
    const objectKey = `churches/${churchId}/media/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const url = await this.minio.presignedPutObject(this.bucket, objectKey, 3600)
    return { uploadUrl: url, objectKey }
  }

  async confirmUpload(churchId: string, userId: string, dto: ConfirmUploadDto) {
    const publicUrl = `${this.cfg.get('minio.publicUrl')}/${this.bucket}/${dto.objectKey}`

    return this.prisma.mediaAsset.create({
      data: {
        churchId,
        uploadedById: userId,
        objectKey:    dto.objectKey,
        fileName:     dto.fileName,
        mimeType:     dto.mimeType,
        fileSize:     dto.fileSize,
        assetType:    dto.assetType ?? this.inferType(dto.mimeType),
        title:        dto.title ?? dto.fileName,
        url:          publicUrl,
        status:       'READY',
      },
    })
  }

  async list(churchId: string, page = 1, limit = 20, type?: string) {
    const where = { churchId, ...(type ? { assetType: type } : {}) }
    const [assets, total] = await Promise.all([
      this.prisma.mediaAsset.findMany({
        where,
        skip:    (page - 1) * limit,
        take:    limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.mediaAsset.count({ where }),
    ])
    return { assets, total, page, limit }
  }

  async findById(churchId: string, id: string) {
    const asset = await this.prisma.mediaAsset.findFirst({ where: { id, churchId } })
    if (!asset) throw new NotFoundException('Media asset not found')
    return asset
  }

  async delete(churchId: string, id: string) {
    const asset = await this.findById(churchId, id)
    try {
      await this.minio.removeObject(this.bucket, asset.objectKey)
    } catch (e) {
      this.logger.warn(`MinIO delete failed for ${asset.objectKey}: ${e}`)
    }
    await this.prisma.mediaAsset.delete({ where: { id } })
  }

  async presignDownload(churchId: string, id: string) {
    const asset = await this.findById(churchId, id)
    const url   = await this.minio.presignedGetObject(this.bucket, asset.objectKey, 3600)
    return { url, expiresIn: 3600 }
  }

  private inferType(mimeType: string): string {
    if (mimeType.startsWith('video/'))       return 'VIDEO'
    if (mimeType.startsWith('audio/'))       return 'AUDIO'
    if (mimeType.startsWith('image/'))       return 'IMAGE'
    return 'DOCUMENT'
  }
}
