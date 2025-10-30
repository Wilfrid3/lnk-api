import {
  IsString,
  IsArray,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsEnum,
  ArrayMaxSize,
  ArrayNotEmpty,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateServicePackageDto {
  @ApiProperty({
    description: 'Package title',
    example: 'Package Premium',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Array of adult service IDs (max 6)',
    example: ['massage', 'escort', 'companionship'],
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(6, { message: 'Maximum 6 services allowed per package' })
  @IsString({ each: true })
  services: string[];

  @ApiProperty({
    description: 'Package price',
    example: 150,
    minimum: 0,
  })
  @IsNumber()
  @Min(0, { message: 'Price must be a positive number' })
  price: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'FCFA',
    enum: ['FCFA', 'EUR', 'USD'],
    default: 'FCFA',
  })
  @IsEnum(['FCFA', 'EUR', 'USD'])
  @IsOptional()
  currency?: string = 'FCFA';

  @ApiProperty({
    description: 'Package duration',
    example: '2 hours',
    required: false,
  })
  @IsString()
  @IsOptional()
  duration?: string;

  @ApiProperty({
    description: 'Package description',
    example: 'Complete premium service package with massage and companionship',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Whether the package is active',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}
