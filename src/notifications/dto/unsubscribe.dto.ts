import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UnsubscribeDto {
  @ApiProperty({
    description: 'Specific endpoint to unsubscribe. If not provided, all subscriptions for the user will be removed.',
    example: 'https://fcm.googleapis.com/fcm/send/...',
    required: false,
  })
  @IsOptional()
  @IsString()
  endpoint?: string;
}
