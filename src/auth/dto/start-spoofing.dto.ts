import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class StartSpoofingDto {
  @ApiProperty({
    description: 'The ID of the user to impersonate',
    example: '507f1f77bcf86cd799439011',
  })
  @IsNotEmpty()
  @IsString()
  targetUserId: string;
}
