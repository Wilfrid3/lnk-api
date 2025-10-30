import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsArray, IsUrl } from 'class-validator';

export class SendNotificationDto {
  @ApiProperty({
    description: 'Notification title',
    example: 'New Message',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Notification body text',
    example: 'You have received a new message from John',
  })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiProperty({
    description: 'URL to navigate to when notification is clicked',
    example: '/messages/123',
    required: false,
  })
  @IsOptional()
  @IsString()
  url?: string;

  @ApiProperty({
    description: 'Array of user IDs to send notification to. If not provided, sends to all users.',
    example: ['user123', 'user456'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  userIds?: string[];

  @ApiProperty({
    description: 'Icon URL for the notification',
    example: '/icons/message-icon.png',
    required: false,
  })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({
    description: 'Badge URL for the notification',
    example: '/icons/badge.png',
    required: false,
  })
  @IsOptional()
  @IsString()
  badge?: string;
}
