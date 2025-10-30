import {
  IsString,
  IsOptional,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsObject,
  IsDateString,
  IsArray,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageMetadata } from '../schemas/message.schema';

export class CreateMessageDto {
  @ApiProperty({
    description: 'Message content',
    example: 'Hello, I would like to book your service!',
  })
  @IsString()
  content: string;

  @ApiPropertyOptional({
    description: 'Type of message',
    enum: [
      'text',
      'image',
      'file',
      'video',
      'audio',
      'service_offer',
      'booking_request',
      'location',
    ],
    default: 'text',
  })
  @IsOptional()
  @IsEnum([
    'text',
    'image',
    'file',
    'video',
    'audio',
    'service_offer',
    'booking_request',
    'location',
  ])
  type?:
    | 'text'
    | 'image'
    | 'file'
    | 'video'
    | 'audio'
    | 'service_offer'
    | 'booking_request'
    | 'location';

  @ApiPropertyOptional({
    description: 'Additional metadata for special message types',
  })
  @IsOptional()
  @IsObject()
  metadata?: MessageMetadata;

  @ApiPropertyOptional({
    description: 'ID of message being replied to',
    example: '60f1b2b3c9e77c001f5e4a1a',
  })
  @IsOptional()
  @IsString()
  @IsMongoId()
  replyToId?: string;

  @ApiPropertyOptional({
    description: 'ID of message being forwarded',
    example: '60f1b2b3c9e77c001f5e4a1a',
  })
  @IsOptional()
  @IsString()
  @IsMongoId()
  forwardedFromId?: string;
}

export class UpdateMessageDto {
  @ApiProperty({
    description: 'Updated message content',
    example: 'Hello, I would like to book your service! (edited)',
  })
  @IsString()
  content: string;
}

export class ServiceOfferMessageDto {
  @ApiProperty({
    description: 'Service package ID from user servicePackages',
    example: 'service_123',
  })
  @IsString()
  servicePackageId: string;

  @ApiPropertyOptional({
    description: 'Custom message to accompany the service offer',
    example: 'I would like to offer you this exclusive service!',
  })
  @IsOptional()
  @IsString()
  message?: string;
}

export class BookingRequestMessageDto {
  @ApiProperty({
    description: 'Service package ID being requested',
    example: 'service_123',
  })
  @IsString()
  servicePackageId: string;

  @ApiPropertyOptional({
    description: 'Requested date for the service',
    example: '2024-02-15',
  })
  @IsOptional()
  @IsDateString()
  requestedDate?: string;

  @ApiPropertyOptional({
    description: 'Requested time for the service',
    example: '14:30',
  })
  @IsOptional()
  @IsString()
  requestedTime?: string;

  @ApiPropertyOptional({
    description: 'Additional message for the booking request',
    example:
      'I would like to book this service for the specified date and time.',
  })
  @IsOptional()
  @IsString()
  message?: string;
}

export class LocationMessageDto {
  @ApiProperty({
    description: 'Latitude coordinate',
    example: 48.8566,
  })
  @IsNumber()
  latitude: number;

  @ApiProperty({
    description: 'Longitude coordinate',
    example: 2.3522,
  })
  @IsNumber()
  longitude: number;

  @ApiPropertyOptional({
    description: 'Human-readable address',
    example: 'Paris, France',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    description: 'Message to accompany the location',
    example: 'Meet me here!',
  })
  @IsOptional()
  @IsString()
  message?: string;
}

export class MessageQueryDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Transform(({ value }) => parseInt(value) || 1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of messages per page',
    default: 50,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Transform(({ value }) => Math.min(parseInt(value) || 50, 100))
  limit?: number = 50;

  @ApiPropertyOptional({
    description: 'Filter by message type',
    enum: [
      'text',
      'image',
      'file',
      'video',
      'audio',
      'service_offer',
      'booking_request',
      'location',
    ],
  })
  @IsOptional()
  @IsEnum([
    'text',
    'image',
    'file',
    'video',
    'audio',
    'service_offer',
    'booking_request',
    'location',
  ])
  type?: string;

  @ApiPropertyOptional({
    description: 'Search in message content',
    example: 'booking',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Get messages after this date',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  after?: string;

  @ApiPropertyOptional({
    description: 'Get messages before this date',
    example: '2024-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  before?: string;
}

export class MessageReactionDto {
  @ApiProperty({
    description: 'Reaction emoji',
    example: '👍',
  })
  @IsString()
  reaction: string;
}

export class BulkMarkReadDto {
  @ApiProperty({
    description: 'Array of message IDs to mark as read',
    type: [String],
    example: ['60f1b2b3c9e77c001f5e4a1a', '60f1b2b3c9e77c001f5e4a1b'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsMongoId({ each: true })
  messageIds: string[];
}
