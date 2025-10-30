import {
  IsString,
  IsArray,
  IsOptional,
  IsEnum,
  IsMongoId,
  ValidateNested,
  IsNumber,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateConversationDto {
  @ApiProperty({
    description: 'Array of user IDs to add to the conversation',
    type: [String],
    example: ['60f1b2b3c9e77c001f5e4a1a', '60f1b2b3c9e77c001f5e4a1b'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsMongoId({ each: true })
  participants: string[];

  @ApiPropertyOptional({
    description: 'Type of conversation',
    enum: ['direct', 'group'],
    default: 'direct',
  })
  @IsOptional()
  @IsEnum(['direct', 'group'])
  type?: 'direct' | 'group';

  @ApiPropertyOptional({
    description: 'Group name (required for group conversations)',
    example: 'Service Providers Group',
  })
  @IsOptional()
  @IsString()
  groupName?: string;

  @ApiPropertyOptional({
    description: 'Group avatar URL',
    example: 'https://example.com/avatar.jpg',
  })
  @IsOptional()
  @IsString()
  groupAvatar?: string;
}

export class UpdateConversationDto {
  @ApiPropertyOptional({
    description: 'Group name',
    example: 'Updated Group Name',
  })
  @IsOptional()
  @IsString()
  groupName?: string;

  @ApiPropertyOptional({
    description: 'Group avatar URL',
    example: 'https://example.com/new-avatar.jpg',
  })
  @IsOptional()
  @IsString()
  groupAvatar?: string;

  @ApiPropertyOptional({
    description: 'Array of user IDs to add to the conversation',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsMongoId({ each: true })
  addParticipants?: string[];

  @ApiPropertyOptional({
    description: 'Array of user IDs to remove from the conversation',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsMongoId({ each: true })
  removeParticipants?: string[];

  @ApiPropertyOptional({
    description: 'New group admin user ID',
    example: '60f1b2b3c9e77c001f5e4a1a',
  })
  @IsOptional()
  @IsString()
  @IsMongoId()
  groupAdmin?: string;
}

export class ConversationQueryDto {
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
    description: 'Number of conversations per page',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Transform(({ value }) => Math.min(parseInt(value) || 20, 100))
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Filter by conversation type',
    enum: ['direct', 'group'],
  })
  @IsOptional()
  @IsEnum(['direct', 'group'])
  type?: 'direct' | 'group';

  @ApiPropertyOptional({
    description: 'Search in conversation names or participant names',
    example: 'john',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Show only archived conversations',
    default: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  archived?: boolean = false;
}
