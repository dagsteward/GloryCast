import { IsString, IsOptional, IsUrl, MinLength, MaxLength } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Pastor James' })
  @IsOptional() @IsString() @MaxLength(120)
  displayName?: string

  @ApiPropertyOptional({ example: 'https://storage.glorycast.ai/avatars/x.jpg' })
  @IsOptional() @IsUrl()
  avatarUrl?: string

  @ApiPropertyOptional({ example: 'en' })
  @IsOptional() @IsString()
  locale?: string

  @ApiPropertyOptional({ example: 'Africa/Lagos' })
  @IsOptional() @IsString()
  timezone?: string
}
