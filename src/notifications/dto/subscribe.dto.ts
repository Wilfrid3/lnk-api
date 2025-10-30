import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class SubscriptionKeysDto {
  @ApiProperty({
    description: 'P256DH key for push notification encryption',
    example: 'BKxX...',
  })
  @IsString()
  @IsNotEmpty()
  p256dh: string;

  @ApiProperty({
    description: 'Auth key for push notification authentication',
    example: 'abc123...',
  })
  @IsString()
  @IsNotEmpty()
  auth: string;
}

export class SubscribeDto {
  @ApiProperty({
    description: 'Push notification endpoint URL',
    example: 'https://fcm.googleapis.com/fcm/send/...',
  })
  @IsString()
  @IsNotEmpty()
  endpoint: string;

  @ApiProperty({
    description: 'Encryption keys for push notifications',
    type: SubscriptionKeysDto,
  })
  @ValidateNested()
  @Type(() => SubscriptionKeysDto)
  keys: SubscriptionKeysDto;

  @ApiProperty({
    description: 'User agent string from the browser',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    required: false,
  })
  @IsOptional()
  @IsString()
  userAgent?: string;
}
