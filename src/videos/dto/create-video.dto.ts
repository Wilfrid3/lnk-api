import {
  IsString,
  IsOptional,
  IsArray,
  IsIn,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateVideoDto {
  @ApiProperty({
    description: 'Video title',
    example: 'Amazing dance video!',
    maxLength: 100,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title: string;

  @ApiProperty({
    description: 'Video description',
    example: 'Check out this amazing dance routine!',
    maxLength: 500,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  description: string;

  @ApiProperty({
    description: 'Video tags',
    example: ['dance', 'music', 'fun'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({
    description: 'Video location',
    example: 'New York, NY',
    required: false,
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({
    description: 'Video privacy setting',
    enum: ['public', 'private', 'friends'],
    default: 'public',
  })
  @IsOptional()
  @IsIn(['public', 'private', 'friends'])
  privacy?: 'public' | 'private' | 'friends';
}
