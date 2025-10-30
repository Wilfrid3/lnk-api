import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsPhoneNumber, IsString } from 'class-validator';

export class SendVerificationDto {
  @ApiProperty({
    required: true,
    description: 'Phone number to send verification code to',
  })
  @IsNotEmpty({ message: 'Phone number is required' })
  @IsPhoneNumber(undefined, { message: 'Invalid phone number format' })
  phoneNumber: string;

  @ApiProperty({
    required: true,
    description: 'Country code for phone number',
    example: 'CM',
    default: 'CM',
  })
  @IsString()
  @IsNotEmpty({ message: 'Country code is required' })
  countryCode: string;
}
