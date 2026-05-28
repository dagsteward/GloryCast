import { IsString, IsOptional, IsDateString, IsNumber, Min, Max, IsBoolean } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateWebinarDto {
  @ApiProperty({ example: 'Sunday Morning Service' })
  @IsString()
  title: string

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  description?: string

  @ApiProperty({ example: '2024-02-04T09:00:00Z' })
  @IsDateString()
  scheduledAt: string

  @ApiPropertyOptional({ example: 90 })
  @IsOptional() @IsNumber() @Min(5) @Max(480)
  durationMinutes?: number

  @ApiPropertyOptional({ example: 500 })
  @IsOptional() @IsNumber() @Min(1)
  maxAttendees?: number

  @ApiPropertyOptional({ default: false })
  @IsOptional() @IsBoolean()
  isPublic?: boolean
}

export class UpdateWebinarDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString()
  title?: string

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  description?: string

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  scheduledAt?: string

  @ApiPropertyOptional()
  @IsOptional() @IsNumber()
  durationMinutes?: number

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  isPublic?: boolean
}

export class JoinWebinarDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  displayName: string

  @ApiPropertyOptional({ example: 'john@example.com' })
  @IsOptional() @IsString()
  email?: string
}
