import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  Min,
  ArrayNotEmpty,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { CreateServicePackageDto } from './create-service-package.dto';

export class UpdatePreferencesRatesDto {
  @ApiProperty({
    required: false,
    description: 'Type of clients accepted',
    example: 'couples',
  })
  @IsOptional()
  @IsString()
  clientType?: string;

  @ApiProperty({
    required: false,
    description: 'Physical appearance description',
    example: 'Grande, brune, yeux verts',
  })
  @IsOptional()
  @IsString()
  appearance?: string;

  @ApiProperty({
    required: false,
    description: 'Array of services offered',
    type: [String],
    example: ['massage', 'accompagnement', 'diner'],
  })
  @IsOptional()
  @IsArray()
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value.filter((item) => typeof item === 'string')
      : [],
  )
  offerings?: string[];

  @ApiProperty({
    required: false,
    description: 'Hourly rate in FCFA',
    minimum: 0,
    example: 15000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Hourly rate must be a positive number' })
  hourlyRate?: number;

  @ApiProperty({
    required: false,
    description: 'Half day rate in FCFA',
    minimum: 0,
    example: 50000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Half day rate must be a positive number' })
  halfDayRate?: number;

  @ApiProperty({
    required: false,
    description: 'Full day rate in FCFA',
    minimum: 0,
    example: 100000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Full day rate must be a positive number' })
  fullDayRate?: number;

  @ApiProperty({
    required: false,
    description: 'Weekend rate in FCFA',
    minimum: 0,
    example: 120000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Weekend rate must be a positive number' })
  weekendRate?: number;

  @ApiProperty({
    required: false,
    description: 'Availability schedule information',
    example: 'Lundi-Vendredi 9h-17h, Weekend sur demande',
  })
  @IsOptional()
  @IsString()
  availabilityHours?: string;

  @ApiProperty({
    required: false,
    description: 'Special services description',
    example: 'Services personnalisés selon demande',
  })
  @IsOptional()
  @IsString()
  specialServices?: string;

  @ApiProperty({
    required: false,
    description: 'Accepted payment methods',
    type: [String],
    example: ['cash', 'mobile_money', 'bank_transfer'],
  })
  @IsOptional()
  @IsArray()
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value.filter((item) => typeof item === 'string')
      : [],
  )
  paymentMethods?: string[];

  @ApiProperty({
    required: false,
    description: 'Additional notes or conditions',
    example: 'Discrétion assurée, déplacements possibles',
  })
  @IsOptional()
  @IsString()
  additionalNotes?: string;

  @ApiProperty({
    required: false,
    description: 'Service packages offered by the user',
    type: [CreateServicePackageDto],
    example: [
      {
        title: 'Package Premium',
        services: ['massage', 'escort'],
        price: 150,
        currency: 'FCFA',
        duration: '2 hours',
        description: 'Complete premium service package',
        isActive: true,
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateServicePackageDto)
  servicePackages?: CreateServicePackageDto[];
}
