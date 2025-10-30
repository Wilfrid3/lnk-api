import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEmail,
  IsPhoneNumber,
  MinLength,
  IsInt,
  Min,
  Max,
  IsIn,
} from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({ required: false, description: 'User name' })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  name?: string;

  @ApiProperty({ required: false, description: 'User email address' })
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email format' })
  email?: string;

  @ApiProperty({ required: false, description: 'User phone number' })
  @IsOptional()
  @IsPhoneNumber(undefined, { message: 'Invalid phone number format' })
  phoneNumber?: string;

  @ApiProperty({
    required: false,
    description: 'Country code for phone number',
    example: 'FR',
    default: 'FR',
  })
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiProperty({
    required: false,
    description: 'User age',
    minimum: 18,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(18, { message: 'You must be at least 18 years old' })
  @Max(100, { message: 'Age must be less than 100' })
  age?: number;

  @ApiProperty({
    required: false,
    description: 'User biography or description',
  })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiProperty({
    required: false,
    description:
      'User type - can only be updated if not already set to specific values',
    enum: ['homme', 'femme', 'couple', 'autres'],
    example: 'homme',
  })
  @IsOptional()
  @IsIn(['homme', 'femme', 'couple', 'autres'], {
    message: 'User type must be one of: homme, femme, couple, autres',
  })
  userType?: string;
}
