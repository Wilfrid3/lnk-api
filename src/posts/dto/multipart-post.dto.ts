import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { CreatePostDto } from './create-post.dto';

/**
 * DTO for handling multipart/form-data submissions with post data and files
 */
export class MultipartPostDto {
  @ApiProperty({
    description: "Données de l'annonce au format JSON stringifié",
    type: 'string',
  })
  @IsString()
  postData: string; // JSON stringified CreatePostDto

  @ApiProperty({
    description: 'Photo principale',
    type: 'string',
    format: 'binary',
    required: false,
  })
  @IsOptional()
  mainPhoto?: any;
  @ApiProperty({
    description: 'Photos additionnelles (peuvent être plusieurs fichiers)',
    type: 'array',
    items: {
      type: 'string',
      format: 'binary',
    },
    required: false,
  })
  @IsOptional()
  additionalPhotos?: any[];
}
