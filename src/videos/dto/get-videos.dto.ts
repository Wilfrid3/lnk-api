import { IsOptional, IsInt, Min, Max, IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export class GetVideosDto {
  @ApiProperty({
    description: 'Page number',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Number of videos per page',
    example: 10,
    default: 10,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;

  @ApiProperty({
    description: 'Array of video IDs to exclude from results',
    example: ['507f1f77bcf86cd799439011', '507f191e810c19729de860ea'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return [];
    
    // Handle single string value
    if (typeof value === 'string') {
      // Handle comma-separated string
      return value
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id.length > 0);
    }
    
    // Handle array of values (from query params like excludes[]=id1&excludes[]=id2)
    if (Array.isArray(value)) {
      return value.map((id) => String(id).trim()).filter((id) => id.length > 0);
    }
    
    return [];
  })
  @IsArray()
  @IsString({ each: true })
  excludes?: string[];
}
