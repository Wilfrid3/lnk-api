import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';

export class AcceptTermsDto {
  @ApiProperty({
    description: 'Whether user accepts the terms and privacy policy',
    required: true,
  })
  @IsBoolean()
  @IsNotEmpty({
    message: 'You must specify whether you accept the terms and privacy policy',
  })
  accept: boolean;
}
