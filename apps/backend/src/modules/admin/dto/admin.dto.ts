import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator'
import { LicenseStatus } from '@prisma/client'

export class SetLicenseStatusDto {
  @ApiProperty({ enum: LicenseStatus })
  @IsEnum(LicenseStatus)
  status!: LicenseStatus

  @ApiPropertyOptional({ description: 'Support note, kept on the audit trail' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string
}
