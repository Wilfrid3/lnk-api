import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsString,
  IsEnum,
  IsOptional,
  IsEmail,
  MinLength,
  IsInt,
  Min,
  Max,
  IsNotEmpty,
} from 'class-validator';

enum UserType {
  HOMME = 'homme',
  FEMME = 'femme',
  COUPLE = 'couple',
  AUTRES = 'autres',
}

export class RegisterDto {
  @ApiProperty({ required: true, description: 'Full name of the user' })
  @IsString()
  name: string;

  @ApiProperty({
    required: true,
    enum: UserType,
    description: 'Type of user',
  })
  @IsEnum(UserType)
  userType: UserType;
  @ApiProperty({ required: true, description: 'User phone number' })
  @IsNotEmpty({ message: 'Phone number is required' })
  @IsString({ message: 'Phone number must be a string' })
  phoneNumber: string;

  @ApiProperty({
    required: true,
    description:
      'Country code for phone number (e.g., "+237" for Cameroon, "CM" for ISO code)',
    example: '+237',
    default: '+237',
  })
  @IsString()
  @IsNotEmpty({ message: 'Country code is required' })
  countryCode: string;

  @ApiProperty({
    required: true,
    description: 'User age',
    minimum: 18,
    maximum: 100,
  })
  @IsInt()
  @Min(18, { message: 'You must be at least 18 years old' })
  @Max(100, { message: 'Age must be less than 100' })
  age: number;

  @ApiProperty({ required: false, description: 'User email address' })
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email format' })
  email?: string;

  @ApiProperty({ required: true, description: 'User password', minLength: 6 })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @ApiProperty({
    required: false,
    description: 'Whether user has accepted terms and privacy policy',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  acceptedTermsAndPrivacy?: boolean;

  @ApiProperty({ required: true, description: 'Accept terms and conditions' })
  @IsBoolean()
  acceptTerms: boolean;
}
