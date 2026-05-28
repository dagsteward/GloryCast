import { IsEmail, IsString, MinLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class LoginDto {
  @ApiProperty({ example: 'admin@glorycast.ai' })
  @IsEmail()
  email: string

  @ApiProperty({ example: 'Admin@123' })
  @IsString()
  @MinLength(6)
  password: string
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string
}
