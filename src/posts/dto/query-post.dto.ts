import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsEnum,
  IsString,
  IsNumber,
  Min,
  Max,
  IsArray,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ClientType } from '../schemas/post.schema';

export class QueryPostDto {
  @ApiProperty({ required: false, description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1, { message: 'Le numéro de page doit être au moins 1' })
  page?: number = 1;

  @ApiProperty({ required: false, description: 'Items per page', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1, { message: "Le nombre d'éléments par page doit être au moins 1" })
  @Max(100, {
    message: "Le nombre d'éléments par page ne peut pas dépasser 100",
  })
  limit?: number = 10;

  @ApiProperty({
    required: false,
    description: 'Sort field',
    example: 'createdAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiProperty({
    required: false,
    description: 'Sort order',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'], { message: "L'ordre de tri doit être asc ou desc" })
  sortOrder?: 'asc' | 'desc' = 'desc';

  @ApiProperty({ required: false, description: 'City filter' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({
    required: false,
    description: 'Client type filter',
    enum: ClientType,
  })
  @IsOptional()
  @IsEnum(ClientType, {
    message: 'Le type de clientèle doit être: homme, femme, couple ou tous',
  })
  clientType?: ClientType;

  @ApiProperty({ required: false, description: 'Minimum price' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Le prix minimum ne peut pas être négatif' })
  minPrice?: number;

  @ApiProperty({ required: false, description: 'Maximum price' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Le prix maximum ne peut pas être négatif' })
  maxPrice?: number;

  @ApiProperty({
    required: false,
    description: 'Filter by specific offerings',
    type: [String],
    example: ['massage', 'escort'],
  })
  @IsOptional()
  @Transform(({ value }) => {
    // Handle single value
    if (typeof value === 'string') {
      return [value];
    }
    // Handle array of values
    if (Array.isArray(value)) {
      return value.filter((v) => typeof v === 'string');
    }
    // Handle undefined/null
    return undefined;
  })
  @IsArray()
  @IsString({ each: true })
  offerings?: string[];

  @ApiProperty({
    required: false,
    description: 'Search term for title and description',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, description: 'User name filter' }) // Ajouter cette ligne
  @IsOptional() // Ajouter cette ligne
  @IsString() // Ajouter cette ligne
  userName?: string; // Ajouter cette ligne
}
