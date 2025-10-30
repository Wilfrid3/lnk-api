import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsEnum,
  IsString,
  IsNumber,
  Min,
  Max,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class QueryUserDto {
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

  @ApiProperty({ required: false, description: 'Search term for name and bio' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, description: 'City filter' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({
    required: false,
    description: 'User type filter',
    enum: ['homme', 'femme', 'couple', 'autres'],
  })
  @IsOptional()
  @IsEnum(['homme', 'femme', 'couple', 'autres'], {
    message: "Le type d'utilisateur doit être: homme, femme, couple ou autres",
  })
  userType?: string;

  @ApiProperty({
    required: false,
    description: 'Appearance filter',
    enum: ['Noir', 'Brun', 'Métis', 'Blanc', 'Ébène'],
  })
  @IsOptional()
  @IsEnum(['Noir', 'Brun', 'Métis', 'Blanc', 'Ébène'], {
    message: "L'apparence doit être: Noir, Brun, Métis, Blanc ou Ébène",
  })
  appearance?: string;

  @ApiProperty({ required: false, description: 'Filter verified users only' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  verified?: boolean;

  @ApiProperty({
    required: false,
    description: 'Filter premium/VIP users only',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  premium?: boolean;

  @ApiProperty({
    required: false,
    description: 'Filter by user offerings/services',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  offerings?: string[];

  @ApiProperty({
    required: false,
    description: 'Filter by accepted client types',
  })
  @IsOptional()
  @IsString()
  clientType?: string;

  @ApiProperty({ required: false, description: 'Minimum age filter' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(18, { message: "L'âge minimum ne peut pas être inférieur à 18" })
  minAge?: number;

  @ApiProperty({ required: false, description: 'Maximum age filter' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(18, { message: "L'âge maximum ne peut pas être inférieur à 18" })
  maxAge?: number;
}
