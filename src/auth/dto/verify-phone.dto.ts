import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class VerifyPhoneDto {
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

  @ApiProperty({ required: true, description: 'Verification code' })
  @IsString()
  @IsNotEmpty({ message: 'Verification code is required' })
  code: string;
}
