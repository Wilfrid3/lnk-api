import { ApiProperty } from '@nestjs/swagger';

export class InvitedUserDto {
  @ApiProperty({
    description: 'User ID',
    example: '507f1f77bcf86cd799439011',
  })
  _id: string;

  @ApiProperty({
    description: 'User name',
    example: 'John Doe',
  })
  name?: string;

  @ApiProperty({
    description: 'User avatar URL',
    example: 'https://example.com/avatar.jpg',
  })
  avatar?: string;

  @ApiProperty({
    description: 'User phone number',
    example: '+237123456789',
  })
  phoneNumber?: string;

  @ApiProperty({
    description: 'Date when user was invited/created',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;
}

export class InvitedUsersResponseDto {
  @ApiProperty({
    description: 'List of invited users',
    type: [InvitedUserDto],
  })
  users: InvitedUserDto[];

  @ApiProperty({
    description: 'Total number of invited users',
    example: 25,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of users per page',
    example: 20,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 2,
  })
  totalPages: number;
}
