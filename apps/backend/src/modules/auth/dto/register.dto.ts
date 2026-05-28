import { IsEmail, IsString, MinLength, MaxLength, IsOptional } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class RegisterDto {
  @ApiProperty({ example: 'pastor@gracecc.org' })
  @IsEmail()
  email: string

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  password: string

  @ApiProperty({ example: 'John' })
  @IsString()
  @MaxLength(50)
  firstName: string

  @ApiProperty({ example: 'Smith' })
  @IsString()
  @MaxLength(50)
  lastName: string

  @ApiPropertyOptional({ example: 'grace-community-church' })
  @IsOptional()
  @IsString()
  churchSlug?: string
}
