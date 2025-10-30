import { ApiProperty } from '@nestjs/swagger';

export class InviteStatsDto {
  @ApiProperty({
    description: 'User unique invite code',
    example: 'ABC123XY',
  })
  inviteCode: string;

  @ApiProperty({
    description: 'Total number of users invited',
    example: 5,
  })
  totalInvitedUsers: number;

  @ApiProperty({
    description: 'Total rewards earned from invites',
    example: 5000,
  })
  totalRewards: number;

  @ApiProperty({
    description: 'Currency of the rewards',
    example: 'YZ',
  })
  currency: string;

  @ApiProperty({
    description: 'Actual count of invited users from database',
    example: 5,
  })
  actualInvitedUsersCount: number;
}
