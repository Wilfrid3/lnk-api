import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class LogoutDto {
  @ApiProperty({
    required: false,
    description: 'Refresh token to invalidate specifically (optional)',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
