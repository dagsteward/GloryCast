import { IsString, IsOptional, IsEnum, IsNumber, Min, Max } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export enum AssetType {
  VIDEO    = 'VIDEO',
  AUDIO    = 'AUDIO',
  IMAGE    = 'IMAGE',
  DOCUMENT = 'DOCUMENT',
}

export class PresignUploadDto {
  @ApiProperty({ example: 'sermon-2024-01-15.mp4' })
  @IsString()
  fileName: string

  @ApiProperty({ example: 'video/mp4' })
  @IsString()
  mimeType: string

  @ApiProperty({ example: 524288000 })
  @IsNumber() @Min(1)
  fileSize: number

  @ApiPropertyOptional({ enum: AssetType })
  @IsOptional() @IsEnum(AssetType)
  assetType?: AssetType
}

export class ConfirmUploadDto {
  @ApiProperty()
  @IsString()
  objectKey: string

  @ApiProperty()
  @IsString()
  fileName: string

  @ApiProperty()
  @IsString()
  mimeType: string

  @ApiProperty()
  @IsNumber() @Min(1)
  fileSize: number

  @ApiPropertyOptional({ enum: AssetType })
  @IsOptional() @IsEnum(AssetType)
  assetType?: AssetType

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  title?: string
}
