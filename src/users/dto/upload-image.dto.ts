import { ApiProperty } from '@nestjs/swagger';

export class UploadImageDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Image file to upload (avatar or cover)',
  })
  image: any; // Using 'any' since this is just for Swagger documentation
}
