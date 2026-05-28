import { IsString, IsOptional, IsBoolean, IsArray, ValidateNested } from 'class-validator'
import { Type }             from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class StreamDestinationDto {
  @ApiProperty({ example: 'youtube' })
  @IsString()
  platform: string

  @ApiProperty({ example: 'rtmp://a.rtmp.youtube.com/live2' })
  @IsString()
  url: string

  @ApiProperty({ example: 'xxxx-xxxx-xxxx-xxxx' })
  @IsString()
  key: string
}

export class CreateStreamDto {
  @ApiProperty({ example: 'Sunday Morning Service' })
  @IsString()
  title: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  eventId?: string

  @ApiPropertyOptional({ type: [StreamDestinationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StreamDestinationDto)
  destinations?: StreamDestinationDto[]

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  enableRecording?: boolean
}

export class UpdateStreamDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isRecording?: boolean

  @ApiPropertyOptional({ type: [StreamDestinationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StreamDestinationDto)
  destinations?: StreamDestinationDto[]
}
