import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class FileUploadDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Photo file to upload',
  })
  file: any; // Using 'any' since this is just for Swagger documentation

  @ApiProperty({
    description: 'Whether this is the main photo',
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isMainPhoto?: boolean;
}
