import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsMongoId,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({
    description: 'Comment content',
    example: 'Great video! Love the content.',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500, { message: 'Comment cannot exceed 500 characters' })
  content: string;

  @ApiProperty({
    description: 'Parent comment ID for replies (optional)',
    example: '60f7b3b3b3b3b3b3b3b3b3b3',
    required: false,
  })
  @IsOptional()
  @IsMongoId()
  parentId?: string;
}

export class UpdateCommentDto {
  @ApiProperty({
    description: 'Updated comment content',
    example: 'Updated comment text',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500, { message: 'Comment cannot exceed 500 characters' })
  content: string;
}

export class GetCommentsDto {
  @ApiProperty({
    description: 'Page number for pagination',
    example: 1,
    default: 1,
    required: false,
  })
  @IsOptional()
  page?: number = 1;

  @ApiProperty({
    description: 'Number of comments per page',
    example: 20,
    default: 20,
    required: false,
  })
  @IsOptional()
  limit?: number = 20;

  @ApiProperty({
    description: 'Load replies for comments',
    example: true,
    default: true,
    required: false,
  })
  @IsOptional()
  includeReplies?: boolean = true;
}
