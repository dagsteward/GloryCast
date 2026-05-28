import { IsString, IsOptional, IsUrl, IsEmail, MinLength, MaxLength, Matches } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateChurchDto {
  @ApiProperty({ example: 'Grace Community Church' })
  @IsString() @MinLength(3) @MaxLength(120)
  name: string

  @ApiProperty({ example: 'grace-community' })
  @IsString() @Matches(/^[a-z0-9-]+$/, { message: 'Slug must be lowercase alphanumeric with hyphens' })
  slug: string

  @ApiPropertyOptional({ example: 'Lagos, Nigeria' })
  @IsOptional() @IsString()
  location?: string

  @ApiPropertyOptional({ example: 'admin@gracechurch.org' })
  @IsOptional() @IsEmail()
  contactEmail?: string

  @ApiPropertyOptional()
  @IsOptional() @IsUrl()
  website?: string

  @ApiPropertyOptional()
  @IsOptional() @IsUrl()
  logoUrl?: string
}

export class UpdateChurchDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(120)
  name?: string

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  location?: string

  @ApiPropertyOptional()
  @IsOptional() @IsEmail()
  contactEmail?: string

  @ApiPropertyOptional()
  @IsOptional() @IsUrl()
  website?: string

  @ApiPropertyOptional()
  @IsOptional() @IsUrl()
  logoUrl?: string

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  timezone?: string

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  defaultLanguage?: string
}
