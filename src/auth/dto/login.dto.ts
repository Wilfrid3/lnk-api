import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  ValidateIf,
  IsEmail,
  IsPhoneNumber,
  IsNotEmpty,
} from 'class-validator';

export class LoginDto {
  @ApiProperty({ required: false, description: 'User email address' })
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email format' })
  @ValidateIf((o) => !o.phoneNumber)
  email?: string;

  @ApiProperty({ required: false, description: 'User phone number' })
  @IsOptional()
  @IsPhoneNumber(undefined, { message: 'Invalid phone number format' })
  @ValidateIf((o) => !o.email)
  phoneNumber?: string;

  @ApiProperty({
    required: false,
    description: 'Country code for phone number',
    example: 'CM',
    default: 'CM',
  })
  @IsOptional()
  @IsString()
  @ValidateIf((o) => o.phoneNumber)
  countryCode?: string;

  @ApiProperty({ required: true, description: 'User password' })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}
