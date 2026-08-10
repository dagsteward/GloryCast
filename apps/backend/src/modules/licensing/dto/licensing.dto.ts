import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsString, IsNotEmpty, IsOptional, MaxLength, IsEmail, IsInt, Min, Max } from 'class-validator'

export class ActivateDto {
  @ApiProperty({ example: 'GC7K2M-9PQR4-XZ3TN-VW8HJ' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  key!: string

  @ApiProperty({ description: 'Machine fingerprint reported by the desktop app' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  deviceId!: string

  @ApiPropertyOptional({ example: 'SANCTUARY-PC' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  deviceName?: string

  @ApiPropertyOptional({ example: '1.0.0' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  appVersion?: string
}

export class RefreshDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  key!: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  deviceId!: string
}

export class DeactivateDto extends RefreshDto {}

/** Manual issuance — pilots, ministry gifts, support replacements. */
export class IssueLicenseDto {
  @ApiProperty({ example: 'Grace Community Church' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  organisation!: string

  @ApiProperty({ example: 'admin@grace.church' })
  @IsEmail()
  email!: string

  @ApiPropertyOptional({ example: 365, description: 'Term length in days' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  termDays?: number

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  seats?: number
}
